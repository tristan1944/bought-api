const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

function parseSqliteDateToMs(sqliteDate) {
  if (!sqliteDate) return null;
  const iso = String(sqliteDate).replace(' ', 'T') + 'Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function buildTrialStatus(user) {
  const startedMs = parseSqliteDateToMs(user.trialStartedAt);
  const expiresMs = parseSqliteDateToMs(user.trialExpiresAt);
  const used = Boolean(startedMs);
  const now = Date.now();
  const active = Boolean(expiresMs && now < expiresMs);
  const expired = Boolean(expiresMs && now >= expiresMs);

  return {
    used,
    active,
    expired,
    startedAt: startedMs ? new Date(startedMs).toISOString() : null,
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
  };
}

function effectivePlanId(user) {
  const trial = buildTrialStatus(user);
  const paid = user.pricePlan || null;
  const planId = paid || (trial.active ? 'trial' : null);
  return { planId, trial };
}

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || 
      process.env.GOOGLE_CLIENT_ID === 'placeholder' || process.env.GOOGLE_CLIENT_SECRET === 'placeholder') {
    return res.status(500).json({ 
      error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      message: 'Visit https://console.cloud.google.com/ to create OAuth credentials. See SETUP_GUIDE.md for instructions.'
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL || ''}/pricing.html?error=oauth_not_configured`);
    }
    passport.authenticate('google', { session: false })(req, res, next);
  },
  async (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.redirect(`${process.env.FRONTEND_URL}/index.html?token=${token}&loggedIn=true`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/index.html?error=auth_failed`);
    }
  }
);

router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ exists: true, token });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        name,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          pricePlan: null,
          trial: buildTrialStatus(user),
        },
      });
    } catch (dbError) {
      console.error('Database error during registration:', dbError);
      // Check for connection errors
      if (dbError.code === 'ECONNREFUSED' || 
          (dbError.message && dbError.message.includes('ECONNREFUSED')) ||
          (dbError.errors && dbError.errors.some(e => e.code === 'ECONNREFUSED'))) {
        return res.status(503).json({ 
          error: 'Database connection failed. Please check your database configuration or contact support.' 
        });
      }
      // Re-throw to be caught by outer catch
      throw dbError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { planId, trial } = effectivePlanId(user);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          pricePlan: planId,
          trial,
        },
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      // Check for connection errors
      if (dbError.code === 'ECONNREFUSED' || 
          (dbError.message && dbError.message.includes('ECONNREFUSED')) ||
          (dbError.errors && dbError.errors.some(e => e.code === 'ECONNREFUSED'))) {
        return res.status(503).json({ 
          error: 'Database connection failed. Please check your database configuration or contact support.' 
        });
      }
      // Re-throw to be caught by outer catch
      throw dbError;
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to login. Please try again.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    // Support both "Bearer TOKEN" and just "TOKEN" formats
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }

    // Also check query parameter for compatibility
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has paid via Stripe but plan wasn't persisted (webhook/redirect fallback missed),
    // auto-sync the latest paid checkout session for their Stripe customer (best-effort).
    if (!user.pricePlan && user.stripeCustomerId && stripe) {
      try {
        const currentUserId = String(user.id || user._id);
        const sessions = await stripe.checkout.sessions.list({
          customer: user.stripeCustomerId,
          limit: 20,
        });

        const paidSessions = (sessions.data || [])
          .filter((s) => s && s.payment_status === 'paid' && s.status === 'complete')
          .filter((s) => !s.metadata?.userId || String(s.metadata.userId) === currentUserId)
          .sort((a, b) => (b.created || 0) - (a.created || 0));

        const latest = paidSessions[0];
        const planId = latest?.metadata?.planId;

        if (planId) {
          user.pricePlan = planId;
          await user.save();
        }
      } catch (syncErr) {
        console.warn('⚠️  Stripe plan auto-sync failed:', syncErr.message);
      }
    }

    // Don't send password back
    const { planId, trial } = effectivePlanId(user);
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      pricePlan: planId,
      trial,
      googleId: user.googleId,
    };

    res.json({ user: userResponse });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;

