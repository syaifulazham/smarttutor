import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { parseQuestionFromText, parseQuestionFromImage } from '../services/ai/geminiService';
import { createError } from '../middleware/errorHandler';
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

// POST /api/capture/text
router.post('/text', requireAuth, async (req, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const { text } = textInputSchema.parse(req.body);

    const parsedContent = await parseQuestionFromText(text);

    const title = parsedContent.questionText.replace(/\s+/g, ' ').trim().slice(0, 100);

    const question = await prisma.question.create({
      data: {
        userId,
        sourceType: 'TEXT',
        title,
        rawInput: text,
        parsedContent,
        subject: parsedContent.subject,
        difficulty: parsedContent.difficulty,
        tags: parsedContent.tags,
      },
    });

    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
});

// POST /api/capture/image
router.post(
  '/image',
  requireAuth,
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

      const parsedContent = await parseQuestionFromImage(imageBase64, mimeType, imageUrl);

      const title = parsedContent.questionText.replace(/\s+/g, ' ').trim().slice(0, 100);

      const question = await prisma.question.create({
        data: {
          userId,
          sourceType: 'IMAGE',
          title,
          imageUrl,
          parsedContent,
          subject: parsedContent.subject,
          difficulty: parsedContent.difficulty,
          tags: parsedContent.tags,
        },
      });

      res.status(201).json(question);
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
