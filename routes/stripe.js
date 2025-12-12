const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const PRICE_PLANS = {
  plan1: {
    priceId: process.env.STRIPE_PRICE_ID_PLAN1,
    amount: 100,
    name: 'Plan 1'
  },
  plan2: {
    priceId: process.env.STRIPE_PRICE_ID_PLAN2,
    amount: 200,
    name: 'Plan 2'
  },
  plan3: {
    priceId: process.env.STRIPE_PRICE_ID_PLAN3,
    amount: 300,
    name: 'Plan 3'
  }
};

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      return res.status(503).json({ 
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
        details: 'Get your Stripe API key from https://dashboard.stripe.com/apikeys'
      });
    }

    const { planId } = req.body;

    if (!planId || !PRICE_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = PRICE_PLANS[planId];
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: String(req.user.id || req.user._id)
        }
      });
      customerId = customer.id;
      req.user.stripeCustomerId = customerId;
      await req.user.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing.html`,
      metadata: {
        userId: String(req.user.id || req.user._id),
        planId: planId
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    // Provide more specific error messages
    if (error.type === 'StripeAuthenticationError' || error.statusCode === 401) {
      return res.status(503).json({ 
        error: 'Stripe API key is invalid. Please check your STRIPE_SECRET_KEY configuration.',
        details: 'Get your Stripe API key from https://dashboard.stripe.com/apikeys'
      });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid Stripe request',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm a completed checkout session and persist plan to the bought-api DB.
// Fallback for localhost/dev where Stripe webhooks may not be delivered.
router.post('/confirm-checkout-session', authenticateToken, async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      return res.status(503).json({
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
      });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Checkout session is not paid yet' });
    }

    const sessionUserId = session.metadata && session.metadata.userId;
    const sessionPlanId = session.metadata && session.metadata.planId;

    if (!sessionPlanId || !PRICE_PLANS[sessionPlanId]) {
      return res.status(400).json({ error: 'Missing or invalid planId in checkout session metadata' });
    }

    // Ensure the session belongs to this user
    const currentUserId = String(req.user.id || req.user._id);
    if (sessionUserId && String(sessionUserId) !== currentUserId) {
      return res.status(403).json({ error: 'Checkout session does not belong to the authenticated user' });
    }

    // Persist plan
    req.user.pricePlan = sessionPlanId;
    await req.user.save();
    console.log(`[Stripe Confirm] User ${req.user.email} plan updated to ${sessionPlanId}`);

    // Sync credentials with admin-api (this assigns credentials in pending_customization)
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';
    console.log(`[Stripe Confirm] Calling admin-api sync for ${req.user.email} with plan ${sessionPlanId}`);
    
    try {
      const syncResponse = await fetch(`${adminApiUrl}/api/plans/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: req.user.email,
          plan_type: sessionPlanId,
          // Purchases should enter pending_customization queue
          is_plan_change: true
        }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log(`[Stripe Confirm] ✅ Credentials synced successfully:`, {
          credentialId: syncData.credential_id,
          planType: syncData.plan_type
        });
      } else {
        const errorData = await syncResponse.text();
        console.error(`[Stripe Confirm] ❌ Admin API sync failed:`, {
          status: syncResponse.status,
          error: errorData
        });
        // Don't fail the request - plan is saved, credentials can be assigned manually
      }
    } catch (syncError) {
      console.error(`[Stripe Confirm] ❌ Error calling admin-api:`, syncError.message);
      // Don't fail the request - plan is saved, credentials can be assigned manually
    }

    return res.json({
      success: true,
      planId: sessionPlanId,
    });
  } catch (error) {
    console.error('Stripe confirm session error:', error);
    return res.status(500).json({ error: 'Failed to confirm checkout session', details: error.message });
  }
});

module.exports = router;

