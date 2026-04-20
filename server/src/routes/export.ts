import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { generateSessionsPdf } from '../services/pdf/pdfService';
import { z } from 'zod';

const router = Router();

const exportSchema = z.object({
  sessionIds: z.array(z.string()).min(1).max(20),
});

// POST /api/export/pdf  — accepts array of sessionIds, streams back a PDF
router.post('/pdf', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;

    // Plan gate: Cerdas and Cemerlang only
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true },
    });
    if (!user) return next(createError('User not found', 404));
    if (user.planTier === 'FREE') {
      return res.status(403).json({
        error: 'PDF export requires a Cerdas or Cemerlang plan.',
        upgradeRequired: true,
      });
    }

    const { sessionIds } = exportSchema.parse(req.body);

    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds }, userId },
      include: {
        question: {
          select: { title: true, subject: true, difficulty: true, rawInput: true, imageUrl: true, sourceType: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (sessions.length === 0) {
      return next(createError('No sessions found', 404));
    }

    const pdfBuffer = await generateSessionsPdf(
      sessions.map((s) => ({
        id: s.id,
        mode: s.mode,
        completed: s.completed,
        score: s.score,
        notes: s.notes,
        createdAt: s.createdAt,
        question: s.question,
        messages: (s.messages ?? []) as { role: 'user' | 'assistant'; content: string }[],
      }))
    );

    const filename = `tcher-ayu-sessions-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
