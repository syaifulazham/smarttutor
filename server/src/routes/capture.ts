import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { parseQuestionsFromText, parseQuestionsFromImage, NonAcademicError } from '../services/ai/geminiService';
import { createError } from '../middleware/errorHandler';
import { captureGate } from '../middleware/planGate';
import { z } from 'zod';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Use JPEG, PNG, WEBP, or HEIC.'));
    }
  },
});

const textInputSchema = z.object({
  text: z.string().min(5, 'Question text must be at least 5 characters'),
});

function safeSliceTitle(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  let sliced = text.slice(0, maxLen);
  // If an odd number of $ signs → we cut inside a math expression; trim back to before the last $
  const dollars = (sliced.match(/\$/g) ?? []).length;
  if (dollars % 2 !== 0) {
    const lastDollar = sliced.lastIndexOf('$');
    sliced = sliced.slice(0, lastDollar).trimEnd();
  }
  return sliced;
}

// POST /api/capture/text
router.post('/text', requireAuth, captureGate, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { text } = textInputSchema.parse(req.body);
    const language = ['en', 'ms', 'zh'].includes(req.body.language) ? req.body.language : 'en';

    let parsedList;
    try {
      parsedList = await parseQuestionsFromText(text, language);
    } catch (err) {
      if (err instanceof NonAcademicError) {
        return res.status(422).json({ error: err.message, nonAcademic: true });
      }
      throw err;
    }

    const questions = await prisma.$transaction([
      ...parsedList.map((parsedContent) =>
        prisma.question.create({
          data: {
            userId,
            sourceType: 'TEXT',
            title: safeSliceTitle(parsedContent.questionText.replace(/\s+/g, ' ').trim(), 100),
            rawInput: text,
            parsedContent: parsedContent as unknown as import('@prisma/client').Prisma.InputJsonValue,
            subject: parsedContent.subject,
            difficulty: parsedContent.difficulty,
            tags: parsedContent.tags,
          },
        })
      ),
      prisma.user.update({ where: { id: userId }, data: { capturesUsed: { increment: parsedList.length } } }),
    ]);

    // Last item in transaction result is the user update — strip it
    res.status(201).json(questions.slice(0, parsedList.length));
  } catch (err) {
    next(err);
  }
});

// POST /api/capture/image
router.post(
  '/image',
  requireAuth,
  captureGate,
  upload.single('image'),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { userId } = req as AuthedRequest;

      if (!req.file) return next(createError('No image file provided', 400));

      const imageBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      // Save image to local uploads dir (replace with S3 in production)
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const filename = `${randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
      const imageUrl = `/uploads/${filename}`;

      const language = ['en', 'ms', 'zh'].includes(req.body.language) ? req.body.language : 'en';
      let parsedList;
      try {
        parsedList = await parseQuestionsFromImage(imageBase64, mimeType, imageUrl, language);
      } catch (err) {
        if (err instanceof NonAcademicError) {
          return res.status(422).json({ error: err.message, nonAcademic: true });
        }
        throw err;
      }

      const results = await prisma.$transaction([
        ...parsedList.map((parsedContent) =>
          prisma.question.create({
            data: {
              userId,
              sourceType: 'IMAGE',
              title: safeSliceTitle(parsedContent.questionText.replace(/\s+/g, ' ').trim(), 100),
              imageUrl,
              parsedContent: parsedContent as unknown as import('@prisma/client').Prisma.InputJsonValue,
              subject: parsedContent.subject,
              difficulty: parsedContent.difficulty,
              tags: parsedContent.tags,
            },
          })
        ),
        prisma.user.update({ where: { id: userId }, data: { capturesUsed: { increment: parsedList.length } } }),
      ]);

      res.status(201).json(results.slice(0, parsedList.length));
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/capture/voice — placeholder for Phase 2
router.post('/voice', requireAuth, async (_req, res: Response) => {
  res.status(501).json({ error: 'Voice capture coming in Phase 2' });
});

export default router;
