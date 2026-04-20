import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { sessionGate, schemeGate } from '../middleware/planGate';
import { streamTutorResponse, streamSchemeAnswer, getCorrectAnswerLetter } from '../services/ai/geminiService';
import { z } from 'zod';

const router = Router();

const createSessionSchema = z.object({
  questionId: z.string(),
  mode: z.enum(['SELF_ATTEMPT', 'DIRECT_EXPLANATION']),
});

const messageSchema = z.object({
  content: z.string().min(1),
  language: z.enum(['en', 'ms', 'zh']).default('en'),
});

const submitAnswerSchema = z.object({
  answer: z.string().min(1),
});

router.post('/', requireAuth, sessionGate, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { questionId, mode } = createSessionSchema.parse(req.body);

    const question = await prisma.question.findFirst({ where: { id: questionId, userId } });
    if (!question) return next(createError('Question not found', 404));

    const [session] = await prisma.$transaction([
      prisma.session.create({ data: { userId, questionId, mode, messages: [] } }),
      prisma.user.update({ where: { id: userId }, data: { sessionsUsed: { increment: 1 } } }),
    ]);

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { question: true },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId },
      include: { question: true },
    });
    if (!session) return next(createError('Session not found', 404));
    res.json(session);
  } catch (err) {
    next(err);
  }
});

// SSE streaming tutor message
router.post('/:id/message', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { content, language } = messageSchema.parse(req.body);

    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId },
      include: { question: true },
    });
    if (!session) return next(createError('Session not found', 404));

    const messages = session.messages as Array<{ role: string; content: string; timestamp: string }>;

    // Add user message
    const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    messages.push(userMessage);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';

    for await (const chunk of streamTutorResponse(
      messages,
      session.mode as 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION',
      session.question.parsedContent as object,
      language
    )) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Persist both messages
    const assistantMessage = { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() };
    await prisma.session.update({
      where: { id: session.id },
      data: { messages: [...messages, assistantMessage] },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { answer } = submitAnswerSchema.parse(req.body);

    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId },
      include: { question: true },
    });
    if (!session) return next(createError('Session not found', 404));

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { userAnswer: answer },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const session = await prisma.session.findFirst({ where: { id: req.params.id, userId } });
    if (!session) return next(createError('Session not found', 404));

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { completed: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Returns the correct answer letter — serves from DB cache, calls AI only on first request
router.post('/:id/answer', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId },
      include: { question: true },
    });
    if (!session) return next(createError('Session not found', 404));

    if (session.correctLetter) {
      return res.json({ letter: session.correctLetter });
    }

    const letter = await getCorrectAnswerLetter(session.question.parsedContent as object);
    if (letter) {
      await prisma.session.update({ where: { id: session.id }, data: { correctLetter: letter } });
    }
    res.json({ letter });
  } catch (err) {
    next(err);
  }
});

// SSE: stream scheme answer — serves cached version from DB, regenerates only when forced
router.post('/:id/scheme', requireAuth, schemeGate, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const language = ['en', 'ms', 'zh'].includes(req.body.language) ? req.body.language : 'en';
    const regenerate = req.body.regenerate === true;

    const session = await prisma.session.findFirst({
      where: { id: req.params.id, userId },
      include: { question: true },
    });
    if (!session) return next(createError('Session not found', 404));

    // Return cached scheme as a single SSE chunk (no streaming needed)
    if (session.schemeAnswer && !regenerate) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ chunk: session.schemeAnswer })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let full = '';
    for await (const chunk of streamSchemeAnswer(session.question.parsedContent as object, language)) {
      full += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    if (full) {
      await prisma.session.update({ where: { id: session.id }, data: { schemeAnswer: full } });
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const session = await prisma.session.findFirst({ where: { id: req.params.id, userId } });
    if (!session) return next(createError('Session not found', 404));

    await prisma.session.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
