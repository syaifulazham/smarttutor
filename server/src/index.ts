import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import fs from 'fs';

import captureRoutes from './routes/capture';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';
import exportRoutes from './routes/export';
import ttsRoutes from './routes/tts';
import authRoutes from './routes/auth';
import billingRoutes, { handleWebhook } from './routes/billing';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Rate limit AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please slow down.' },
});

app.use('/api/auth', authRoutes);
app.use('/api/capture', aiLimiter, captureRoutes);
app.use('/api/sessions', aiLimiter, sessionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/tts', aiLimiter, ttsRoutes);
app.use('/api/billing', billingRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
