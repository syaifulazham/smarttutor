import puppeteer from 'puppeteer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateSessionsHtml } from './htmlGenerator';

interface Message { role: 'user' | 'assistant'; content: string }
interface QuestionData {
  title?: string | null;
  subject?: string | null;
  difficulty?: string | null;
  rawInput?: string | null;
  imageUrl?: string | null;
  sourceType?: string | null;
}
export interface SessionData {
  id: string;
  mode: string;
  completed: boolean;
  score?: number | null;
  notes?: string | null;
  createdAt: Date;
  question: QuestionData;
  messages: Message[];
}

export async function generateSessionsPdf(sessions: SessionData[]): Promise<Buffer> {
  const html = generateSessionsHtml(sessions);

  // Write to a temp file so file:// relative paths (katex fonts) resolve correctly
  const tmpFile = path.join(os.tmpdir(), `tcher-ayu-export-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');

  const browser = await puppeteer.launch({
    headless: true,
    // In Docker, PUPPETEER_EXECUTABLE_PATH points to system Chromium
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '32px', right: '40px', bottom: '40px', left: '40px' },
    });

    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
