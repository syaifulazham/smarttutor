import nodemailer from 'nodemailer';
import crypto from 'crypto';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateVerifyToken(): { token: string; expiry: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expiry };
}

export async function sendVerificationEmail(to: string, name: string | null, token: string) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM ?? 'Tcher Ayu <noreply@tcherayu.bytesforge.net>';

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your Tcher Ayu account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <img src="${process.env.FRONTEND_URL}/logo.png" alt="Tcher Ayu" style="height:48px;margin-bottom:16px" />
        <h2 style="color:#1f2937;margin-bottom:8px">Verify your email</h2>
        <p style="color:#6b7280;margin-bottom:24px">
          Hi ${name ?? 'there'}, thanks for signing up! Click the button below to verify your email address.
          This link expires in 24 hours.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Verify Email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you didn't create an account, you can safely ignore this email.<br/>
          Or copy this link: ${url}
        </p>
      </div>
    `,
  });
}
