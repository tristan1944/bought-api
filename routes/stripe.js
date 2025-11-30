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
      success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing.html`,
      metadata: {
        userId: String(req.user.id || req.user._id),
        planId: planId
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;

