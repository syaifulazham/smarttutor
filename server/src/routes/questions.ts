import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { PLAN_LIMITS, PlanTier } from '../config/plans';

const router = Router();

router.get('/', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = Math.min(parseInt((req.query.limit as string) ?? '20'), 50);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { planTier: true } });
    const historyDays = PLAN_LIMITS[(user?.planTier ?? 'FREE') as PlanTier].historyDays;
    const dateFilter = historyDays < Infinity
      ? { gte: new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000) }
      : undefined;

    const where = { userId, ...(dateFilter ? { createdAt: dateFilter } : {}) };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.question.count({ where }),
    ]);

    res.json({ questions, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!question) return next(createError('Question not found', 404));

    res.json(question);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!question) return next(createError('Question not found', 404));

    await prisma.question.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
