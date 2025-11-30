import express from 'express';
import { setUserPlan } from '../utils/usage.js';

export const webhooksRouter = express.Router();

// Stripe webhook (set STRIPE_WEBHOOK_SECRET)
webhooksRouter.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!whSecret) return res.status(500).send('Webhook secret not set');
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const plan = session.metadata?.plan; // set when creating checkout session (future)
      if (uid && plan) {
        await setUserPlan(uid, plan);
      }
    }
    if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
      const sub = event.data.object;
      const uid = sub.metadata?.uid;
      if (uid) await setUserPlan(uid, 'free');
    }
    res.json({ received: true });
  } catch (e) {
    res.status(500).send('Webhook handler error');
  }
});

// PayPal webhook placeholder (VERIFY WEBHOOK via JWT certs or signature)
webhooksRouter.post('/paypal', express.json(), async (req, res) => {
  try {
    // TODO: Verify signature via PayPal webhook validation
    // Identify payer/user (store uid in custom fields at order creation)
    // Then call setUserPlan(uid, planId)
    res.json({ received: true });
  } catch (e) {
    res.status(500).send('PayPal webhook handler error');
  }
});


