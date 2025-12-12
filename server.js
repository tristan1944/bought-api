require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/database');
const passport = require('./config/passport');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('./models/User');

function mapBoughtPlanToAdminPlanType(planId) {
  // bought-api uses plan1/plan2/plan3 internally.
  // admin-api uses starter/essential/pro plan types.
  switch (planId) {
    case 'plan1':
      return 'starter-monthly';
    case 'plan2':
      return 'essential-monthly';
    case 'plan3':
      return 'pro-monthly';
    default:
      return null;
  }
}

const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve uploaded customizations
app.use('/uploads', express.static('public/uploads'));

// Redirect old dashboard.html to new React dashboard (before static middleware)
app.get('/dashboard.html', (req, res) => {
  res.redirect('/dashboard');
});

app.use(express.static('public'));
app.use('/dashboard', express.static('public/dashboard'));

// Stripe webhook must be before express.json() middleware
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const planId = session.metadata.planId;

    console.log(`[Stripe Webhook] checkout.session.completed received:`, {
      userId,
      planId,
      sessionId: session.id
    });

    try {
      const user = await User.findById(userId);
      if (user) {
        user.pricePlan = planId;
        await user.save();
        console.log(`[Stripe Webhook] User ${user.email} plan updated to ${planId}`);

        // Sync credentials with admin-api (this assigns credentials in pending_customization)
        const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';
        const adminPlanType = mapBoughtPlanToAdminPlanType(planId);
        console.log(`[Stripe Webhook] Calling admin-api sync`, {
          email: user.email,
          boughtPlanId: planId,
          adminPlanType,
          adminApiUrl,
        });
        if (!adminPlanType) {
          console.error('[Stripe Webhook] ❌ Unknown plan id - cannot map to admin plan type:', planId);
          return;
        }
        
        try {
          const syncResponse = await fetch(`${adminApiUrl}/api/plans/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              plan_type: adminPlanType,
              // Purchases should enter pending_customization queue
              is_plan_change: true
            }),
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log(`[Stripe Webhook] ✅ Credentials synced successfully:`, {
              credentialId: syncData.credential_id,
              planType: syncData.plan_type
            });
          } else {
            const errorData = await syncResponse.text();
            console.error(`[Stripe Webhook] ❌ Admin API sync failed:`, {
              status: syncResponse.status,
              error: errorData
            });
          }
        } catch (syncError) {
          console.error(`[Stripe Webhook] ❌ Error calling admin-api:`, syncError.message);
        }
      }
    } catch (error) {
      console.error('[Stripe Webhook] Error updating user plan:', error);
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/customizations', require('./routes/customizations'));

app.get('/', (req, res) => {
  res.redirect('/pricing.html');
});

// Dashboard route - serve React app
app.get('/dashboard', (req, res) => {
  res.sendFile('dashboard/index.html', { root: 'public' });
});

app.get('/dashboard/', (req, res) => {
  res.sendFile('dashboard/index.html', { root: 'public' });
});

// Login and Register routes
app.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'public' });
});

app.get('/register', (req, res) => {
  res.sendFile('register.html', { root: 'public' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

