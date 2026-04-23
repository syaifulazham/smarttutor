import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../prisma/client';
import { signToken, verifyToken } from '../services/auth/jwtService';
import { createError } from '../middleware/errorHandler';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { generateVerifyToken, sendVerificationEmail } from '../services/email';

const router = Router();

// ─── Google OAuth strategy ───────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;
          const avatarUrl = profile.photos?.[0]?.value;
          const name = profile.displayName;

          // Try by googleId first, then fall back to email (account linking)
          let user = await prisma.user.findFirst({ where: { googleId: profile.id } });
          if (!user) {
            user = await prisma.user.findFirst({ where: { email } });
            if (user) {
              // Link existing email account to Google
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id, name, avatarUrl, emailVerified: true },
              });
            } else {
              user = await prisma.user.create({
                data: { googleId: profile.id, email, name, avatarUrl, emailVerified: true },
              });
            }
          } else {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { name, avatarUrl },
            });
          }
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ─── Schemas ──────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return next(createError('Email already in use', 409));

    const hashed = await bcrypt.hash(password, 12);
    const { token: verifyToken, expiry: verifyTokenExpiry } = generateVerifyToken();

    await prisma.user.create({
      data: { email, password: hashed, name, verifyToken, verifyTokenExpiry, emailVerified: false },
    });

    // Send verification email — don't block on failure
    sendVerificationEmail(email, name ?? null, verifyToken).catch((err) =>
      console.error('[email] Failed to send verification email:', err)
    );

    res.status(201).json({ requiresVerification: true, email });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return next(createError('Invalid credentials', 401));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return next(createError('Invalid credentials', 401));

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', email });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    next(err);
  }
});

router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) return next(createError('Missing token', 400));

    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) return next(createError('Invalid or expired token', 400));

    if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
      return next(createError('Token expired', 400));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) return next(createError('Email required', 400));

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.emailVerified) {
      // Return success regardless to avoid email enumeration
      return res.json({ sent: true });
    }

    const { token: verifyToken, expiry: verifyTokenExpiry } = generateVerifyToken();
    await prisma.user.update({ where: { id: user.id }, data: { verifyToken, verifyTokenExpiry } });

    sendVerificationEmail(email, user.name ?? null, verifyToken).catch((err) =>
      console.error('[email] Failed to resend verification email:', err)
    );

    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req as AuthedRequest;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, planTier: true },
    });
    if (!user) return next(createError('User not found', 404));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth' }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken({ userId: user.id, email: user.email });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

export default router;
