import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { PLAN_LIMITS, PLAN_PRICES } from '../config/plans';
import { createError } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
const router = Router();

// GET /api/billing/plans — public, returns plan definitions
router.get('/plans', (_req, res) => {
  res.json({
    plans: [
      {
        key: 'FREE',
        name: 'Free',
        amountMYR: 0,
        limits: PLAN_LIMITS.FREE,
      },
      {
        key: 'CERDAS',
        name: 'Cerdas',
        amountMYR: 990,
        limits: PLAN_LIMITS.CERDAS,
      },
      {
        key: 'CEMERLANG',
        name: 'Cemerlang',
        amountMYR: 1990,
        limits: PLAN_LIMITS.CEMERLANG,
      },
    ],
  });
});

// GET /api/billing/status — authenticated, returns current plan + usage
router.get('/status', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        planTier: true,
        capturesUsed: true,
        sessionsUsed: true,
        billingCycleStart: true,
        stripeSubscriptionId: true,
      },
    });
    if (!user) return next(createError('User not found', 404));

    const limits = PLAN_LIMITS[user.planTier as keyof typeof PLAN_LIMITS];

    res.json({
      plan: user.planTier,
      capturesUsed: user.capturesUsed,
      sessionsUsed: user.sessionsUsed,
      billingCycleStart: user.billingCycleStart,
      limits: {
        capturesPerMonth: limits.capturesPerMonth,
        sessionsPerMonth: limits.sessionsPerMonth,
        imageCapture: limits.imageCapture,
        markingScheme: limits.markingScheme,
        regenerateScheme: limits.regenerateScheme,
        historyDays: limits.historyDays,
        avatars: limits.avatars,
        languages: limits.languages,
      },
      hasSubscription: !!user.stripeSubscriptionId,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/checkout — create Stripe Checkout session
router.post('/checkout', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { tier } = req.body as { tier: 'CERDAS' | 'CEMERLANG' };

    const plan = PLAN_PRICES[tier];
    if (!plan || !plan.priceId) {
      return next(createError('Invalid plan or price not configured', 400));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(createError('User not found', 404));

    // Reuse existing Stripe customer or create one
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing?success=1`,
      cancel_url: `${frontendUrl}/pricing?cancelled=1`,
      metadata: { userId, tier },
      subscription_data: { metadata: { userId, tier } },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal — create Stripe Customer Portal session
router.post('/portal', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeCustomerId) {
      return next(createError('No active subscription found', 400));
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — Stripe webhook (raw body, no auth)
export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  console.log('[webhook] received, sig present:', !!sig, 'secret present:', !!webhookSecret);

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  console.log('[webhook] event type:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as 'CERDAS' | 'CEMERLANG';
        const subscriptionId = session.subscription as string;
        if (userId && tier) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              planTier: tier,
              stripeSubscriptionId: subscriptionId,
              capturesUsed: 0,
              sessionsUsed: 0,
              billingCycleStart: new Date(),
            },
          });
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const sub = invoice.subscription;
        const subscriptionId: string | null =
          typeof sub === 'string' ? sub :
          (sub && typeof sub === 'object' ? sub.id : null) ||
          (invoice.lines?.data?.[0]?.subscription ?? null);
        console.log('[webhook] invoice billing_reason:', invoice.billing_reason, 'subscriptionId:', subscriptionId, 'raw sub type:', typeof sub);
        if (!subscriptionId) break;

        if (invoice.billing_reason === 'subscription_create') {
          // Initial payment — upgrade plan using subscription metadata
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          const tier = subscription.metadata?.tier as 'CERDAS' | 'CEMERLANG';
          if (userId && tier) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                planTier: tier,
                stripeSubscriptionId: subscriptionId,
                capturesUsed: 0,
                sessionsUsed: 0,
                billingCycleStart: new Date(),
              },
            });
          }
        } else if (invoice.billing_reason === 'subscription_cycle') {
          // Monthly renewal — reset usage counters
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              capturesUsed: 0,
              sessionsUsed: 0,
              billingCycleStart: new Date(),
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const tier = subscription.metadata?.tier as 'CERDAS' | 'CEMERLANG' | undefined;
        if (tier) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { planTier: tier },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            planTier: 'FREE',
            stripeSubscriptionId: null,
            capturesUsed: 0,
            sessionsUsed: 0,
            billingCycleStart: new Date(),
          },
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).send('Internal error');
  }

  res.json({ received: true });
}

export default router;
