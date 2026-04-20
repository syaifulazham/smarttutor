import { Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { PLAN_LIMITS, PlanTier } from '../config/plans';
import { AuthedRequest } from './auth';
import { createError } from './errorHandler';

// Resets usage counters if billing cycle has rolled over (>30 days)
async function maybeResetCycle(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { billingCycleStart: true, capturesUsed: true, sessionsUsed: true },
  });
  if (!user) return;

  const daysSinceCycle = (Date.now() - user.billingCycleStart.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCycle >= 30) {
    await prisma.user.update({
      where: { id: userId },
      data: { capturesUsed: 0, sessionsUsed: 0, billingCycleStart: new Date() },
    });
  }
}

// Middleware: enforce capture limits and image/language restrictions
export async function captureGate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req;
    await maybeResetCycle(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, capturesUsed: true },
    });
    if (!user) return next(createError('User not found', 404));

    const limits = PLAN_LIMITS[user.planTier as PlanTier];

    // Image capture check
    const isImageRoute = req.path === '/image';
    if (isImageRoute && !limits.imageCapture) {
      return res.status(403).json({
        error: 'Image capture requires Cerdas or Cemerlang plan.',
        upgradeRequired: true,
        currentPlan: user.planTier,
      });
    }

    // Language check
    const requestedLang = req.body?.language ?? 'en';
    if (!limits.languages.includes(requestedLang)) {
      return res.status(403).json({
        error: `Language "${requestedLang}" requires an upgraded plan.`,
        upgradeRequired: true,
        currentPlan: user.planTier,
      });
    }

    // Monthly capture limit
    if (limits.capturesPerMonth !== Infinity && user.capturesUsed >= limits.capturesPerMonth) {
      return res.status(403).json({
        error: `You've used all ${limits.capturesPerMonth} captures for this month.`,
        upgradeRequired: true,
        currentPlan: user.planTier,
        used: user.capturesUsed,
        limit: limits.capturesPerMonth,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Middleware: enforce session limits
export async function sessionGate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req;
    await maybeResetCycle(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, sessionsUsed: true },
    });
    if (!user) return next(createError('User not found', 404));

    const limits = PLAN_LIMITS[user.planTier as PlanTier];

    if (limits.sessionsPerMonth !== Infinity && user.sessionsUsed >= limits.sessionsPerMonth) {
      return res.status(403).json({
        error: `You've used all ${limits.sessionsPerMonth} sessions for this month.`,
        upgradeRequired: true,
        currentPlan: user.planTier,
        used: user.sessionsUsed,
        limit: limits.sessionsPerMonth,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Middleware: enforce marking scheme access
export async function schemeGate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true },
    });
    if (!user) return next(createError('User not found', 404));

    const limits = PLAN_LIMITS[user.planTier as PlanTier];
    const isRegenerate = req.body?.regenerate === true;

    if (!limits.markingScheme) {
      return res.status(403).json({
        error: 'Marking scheme requires Cerdas or Cemerlang plan.',
        upgradeRequired: true,
        currentPlan: user.planTier,
      });
    }

    if (isRegenerate && !limits.regenerateScheme) {
      return res.status(403).json({
        error: 'Regenerating marking scheme requires Cemerlang plan.',
        upgradeRequired: true,
        currentPlan: user.planTier,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
