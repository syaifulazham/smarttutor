import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';

const router = Router();

router.get('/', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = Math.min(parseInt((req.query.limit as string) ?? '20'), 50);
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.question.count({ where: { userId } }),
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
