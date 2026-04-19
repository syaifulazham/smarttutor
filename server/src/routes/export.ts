import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Placeholder — PDF generation to be implemented in Phase 3
router.post('/pdf/:sessionId', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const session = await prisma.session.findFirst({
      where: { id: req.params.sessionId, userId },
    });
    if (!session) return next(createError('Session not found', 404));

    res.status(501).json({ error: 'PDF export coming in Phase 3' });
  } catch (err) {
    next(err);
  }
});

export default router;
