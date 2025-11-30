require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/database');
const passport = require('./config/passport');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

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

    try {
      const user = await User.findById(userId);
      if (user) {
        user.pricePlan = planId;
        await user.save();
        console.log(`User ${user.email} subscribed to ${planId}`);
      }
    } catch (error) {
      console.error('Error updating user plan:', error);
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

