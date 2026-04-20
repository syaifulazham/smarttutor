import katex from 'katex';
import { marked, Renderer } from 'marked';
import fs from 'fs';
import path from 'path';

// ── Katex CSS path (local, no CDN needed) ────────────────────────────────────
const KATEX_CSS_PATH = path.join(
  __dirname, '..', '..', '..', 'node_modules', 'katex', 'dist', 'katex.min.css'
);
const KATEX_FONTS_DIR = path.join(
  __dirname, '..', '..', '..', 'node_modules', 'katex', 'dist', 'fonts'
);

// Patch the katex CSS to use absolute file:// font URLs so puppeteer resolves them
function buildKatexCss(): string {
  let css = fs.readFileSync(KATEX_CSS_PATH, 'utf-8');
  // Replace relative font paths with absolute file:// paths
  css = css.replace(/url\(fonts\//g, `url(file://${KATEX_FONTS_DIR}/`);
  return css;
}

// ── Replicate frontend logic ─────────────────────────────────────────────────

function preprocessMath(content: string): string {
  content = content.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`);
  content = content.replace(/\\\((.+?)\\\)/gs, (_, m) => `$${m}$`);
  content = content.replace(/\\\$(.+?)\\\$/gs, (_, m) => `$${m}$`);
  content = content.replace(/\\\\([a-zA-Z])/g, '\\$1');
  return content;
}

function splitIntoParts(content: string): string[] {
  const byNumbered = content.split(/(?=\n\*\*\d+[\.\)])/).map(s => s.trim()).filter(Boolean);
  if (byNumbered.length > 1) return byNumbered;
  const byHeading = content.split(/(?=\n#{2,3}\s)/).map(s => s.trim()).filter(Boolean);
  if (byHeading.length > 1) return byHeading;
  const paras = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (paras.length <= 2) return [content];
  const chunks: string[] = [];
  for (let i = 0; i < paras.length; i += 2) chunks.push(paras.slice(i, i + 2).join('\n\n'));
  return chunks;
}

const QUIZ_REGEX = /\[QUIZ:\s*(.*?)\s*\|\s*A\)\s*(.*?)\s*\|\s*B\)\s*(.*?)\s*\|\s*C\)\s*(.*?)\s*\|\s*D\)\s*(.*?)\s*\|\s*ANS:([A-D])\]/gi;

interface QuizData { question: string; options: { letter: string; text: string }[]; answer: string }

function parseQuizParts(content: string): Array<{ type: 'text'; text: string } | { type: 'quiz'; data: QuizData }> {
  const parts: Array<{ type: 'text'; text: string } | { type: 'quiz'; data: QuizData }> = [];
  let last = 0;
  for (const m of content.matchAll(QUIZ_REGEX)) {
    if (m.index! > last) parts.push({ type: 'text', text: content.slice(last, m.index) });
    parts.push({
      type: 'quiz',
      data: {
        question: m[1].trim(),
        options: [{ letter: 'A', text: m[2].trim() }, { letter: 'B', text: m[3].trim() },
                  { letter: 'C', text: m[4].trim() }, { letter: 'D', text: m[5].trim() }],
        answer: m[6].toUpperCase(),
      },
    });
    last = m.index! + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', text: content.slice(last) });
  return parts;
}

// ── Math rendering ────────────────────────────────────────────────────────────

function renderMathInContent(text: string): string {
  // Use placeholders so marked doesn't mangle katex output
  const store: string[] = [];

  const protect = (html: string) => {
    const idx = store.length;
    store.push(html);
    return `MATHPH${idx}MATHPH`;
  };

  // Display math first
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    try { return protect(katex.renderToString(inner.trim(), { displayMode: true, throwOnError: false })); }
    catch { return protect(`<span class="math-err">[display math]</span>`); }
  });

  // Inline math
  text = text.replace(/\$([^$\n]+?)\$/g, (_, inner) => {
    try { return protect(katex.renderToString(inner.trim(), { displayMode: false, throwOnError: false })); }
    catch { return protect(`<span>${inner}</span>`); }
  });

  // Markdown rendering with custom renderer
  const renderer = new Renderer();
  renderer.strong = ({ text: t }: { text: string }) =>
    `<strong style="color:#b45309;background:#fef3c7;padding:0 3px;border-radius:3px;font-weight:600">${t}</strong>`;
  renderer.em = ({ text: t }: { text: string }) =>
    `<em style="font-style:normal;color:#1d4ed8;font-weight:500">${t}</em>`;
  renderer.codespan = ({ text: t }: { text: string }) =>
    `<code style="color:#4f46e5;background:#eef2ff;padding:1px 4px;border-radius:3px;font-size:0.85em">${t}</code>`;
  renderer.code = ({ text: t }: { text: string }) =>
    `<pre style="background:#1f2937;color:#6ee7b7;padding:10px 14px;border-radius:8px;font-size:0.8em;overflow-x:auto;margin:8px 0"><code>${t}</code></pre>`;
  renderer.blockquote = ({ text: t }: { text: string }) =>
    `<blockquote style="border-left:3px solid #818cf8;padding-left:12px;color:#6b7280;margin:8px 0">${t}</blockquote>`;

  marked.use({ renderer });
  let html = marked.parse(text) as string;

  // Restore math placeholders
  html = html.replace(/MATHPH(\d+)MATHPH/g, (_, i) => store[parseInt(i)] ?? '');
  return html;
}

// ── Quiz block HTML ───────────────────────────────────────────────────────────

function renderQuizHtml(data: QuizData): string {
  const optionsHtml = data.options.map(({ letter, text }) => {
    const isAnswer = letter === data.answer;
    const bg = isAnswer ? '#f0fdf4' : '#f9fafb';
    const border = isAnswer ? '#86efac' : '#e5e7eb';
    const textColor = isAnswer ? '#166534' : '#4b5563';
    const badgeBg = isAnswer ? '#22c55e' : '#e5e7eb';
    const badgeColor = isAnswer ? '#fff' : '#6b7280';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1px solid ${border};background:${bg};margin-bottom:6px">
        <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${letter}</span>
        <span style="color:${textColor};font-size:13px">${text}</span>
        ${isAnswer ? `<span style="margin-left:auto;color:#22c55e;font-size:12px">✓</span>` : ''}
      </div>`;
  }).join('');

  return `
    <div style="margin:12px 0;border-radius:12px;border:2px solid #c4b5fd;background:#faf5ff;padding:16px">
      <p style="font-size:10px;font-weight:700;color:#7c3aed;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;display:flex;align-items:center;gap:4px">
        ✦ QUICK CHECK
      </p>
      <p style="font-size:13px;font-weight:500;color:#1f2937;margin:0 0 12px">${data.question}</p>
      ${optionsHtml}
      <p style="margin:8px 0 0;font-size:11px;font-weight:600;color:#16a34a">✓ Answer: ${data.answer}</p>
    </div>`;
}

// ── Step card colors (mirrors STEP_STYLES in SessionView) ────────────────────

const STEP_STYLES = [
  { bg: '#f8fafc', border: '#e2e8f0', badge: '#cbd5e1', badgeText: '#475569' },
  { bg: '#eff6ff', border: '#bfdbfe', badge: '#bfdbfe', badgeText: '#1e40af' },
  { bg: '#f5f3ff', border: '#ddd6fe', badge: '#ddd6fe', badgeText: '#5b21b6' },
  { bg: '#f0fdf4', border: '#bbf7d0', badge: '#bbf7d0', badgeText: '#14532d' },
  { bg: '#fffbeb', border: '#fde68a', badge: '#fde68a', badgeText: '#78350f' },
];

// ── Render one assistant message ──────────────────────────────────────────────

function renderAssistantMessage(content: string, msgIdx: number): string {
  const processed = preprocessMath(content);
  const parts = splitIntoParts(processed);

  return parts.map((part, pi) => {
    const style = STEP_STYLES[pi % STEP_STYLES.length];
    const stepBadge = parts.length > 1
      ? `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${style.badge};color:${style.badgeText};margin-bottom:8px;display:inline-block">Step ${pi + 1} of ${parts.length}</span>`
      : '';

    const quizParts = parseQuizParts(part);
    const bodyHtml = quizParts.map(p =>
      p.type === 'quiz'
        ? renderQuizHtml(p.data)
        : `<div class="md-content">${renderMathInContent(p.text)}</div>`
    ).join('');

    return `
      <div style="border-radius:12px;border:1px solid ${style.border};background:${style.bg};padding:14px 16px;margin-bottom:10px">
        ${stepBadge}
        <div style="font-size:13px;line-height:1.65;color:#1f2937">${bodyHtml}</div>
      </div>`;
  }).join('');
}

// ── Full page types ───────────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant'; content: string }
interface QuestionData {
  title?: string | null;
  subject?: string | null;
  difficulty?: string | null;
  rawInput?: string | null;
  imageUrl?: string | null;
  sourceType?: string | null;
}
interface SessionData {
  id: string;
  mode: string;
  completed: boolean;
  score?: number | null;
  notes?: string | null;
  createdAt: Date;
  question: QuestionData;
  messages: Message[];
}

// ── Image helper ──────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads');

function imageToDataUri(imageUrl: string): string | null {
  try {
    const filename = path.basename(imageUrl);
    const fullPath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(fullPath)) return null;
    const buf = fs.readFileSync(fullPath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

// ── Main HTML generator ───────────────────────────────────────────────────────

export function generateSessionsHtml(sessions: SessionData[]): string {
  const katexCss = buildKatexCss();

  const sessionPages = sessions.map((session, idx) => {
    const title = session.question.title ?? session.question.subject ?? 'Untitled Question';
    const modeLabel = session.mode === 'SELF_ATTEMPT' ? 'Self Attempt' : 'Direct Explanation';
    const dateStr = new Date(session.createdAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const messages = (session.messages ?? []) as Message[];

    // Original content block
    let originalHtml = '';
    if (session.question.sourceType === 'IMAGE' && session.question.imageUrl) {
      const dataUri = imageToDataUri(session.question.imageUrl);
      if (dataUri) {
        originalHtml = `
          <div class="section-label" style="background:#eef2ff;color:#3730a3">Original Scanned Image</div>
          <div style="text-align:center;margin-bottom:16px">
            <img src="${dataUri}" style="max-width:100%;max-height:320px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb" />
          </div>`;
      }
    } else if (session.question.sourceType === 'TEXT' && session.question.rawInput?.trim()) {
      originalHtml = `
        <div class="section-label" style="background:#eef2ff;color:#3730a3">Original Captured Text</div>
        <div style="background:#f8faff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#1e3a5f;white-space:pre-wrap;line-height:1.6">${escHtml(session.question.rawInput.trim())}</div>`;
    }

    // Notes block
    const notesHtml = session.notes?.trim() ? `
      <div class="section-label" style="background:#fef3c7;color:#92400e">My Notes</div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#78350f;white-space:pre-wrap;line-height:1.6">${escHtml(session.notes.trim())}</div>
    ` : '';

    // Chat messages
    const messagesHtml = messages.map((msg, mi) => {
      if (msg.role === 'user') {
        return `
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
            <div style="max-width:70%;padding:10px 14px;border-radius:16px 16px 4px 16px;background:#4f46e5;color:#fff;font-size:13px;line-height:1.5">${escHtml(msg.content ?? '')}</div>
          </div>`;
      }
      return `
        <div style="margin-bottom:14px">
          ${renderAssistantMessage(msg.content ?? '', mi)}
        </div>`;
    }).join('');

    const pageBreak = idx > 0 ? 'page-break-before: always;' : '';

    return `
      <div style="${pageBreak}padding-bottom:32px">
        <!-- Session header -->
        <div style="background:#4f46e5;border-radius:12px 12px 0 0;padding:14px 18px;margin-bottom:0">
          <div style="font-size:14px;font-weight:700;color:#fff">Session ${idx + 1}</div>
          <div style="font-size:11px;color:#c7d2fe;margin-top:2px">${modeLabel} · ${dateStr}</div>
        </div>

        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:18px;margin-bottom:24px">
          <!-- Question title -->
          <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Question</div>
          <div style="font-size:14px;font-weight:500;color:#1f2937;margin-bottom:4px">${renderMathInContent(title)}</div>
          ${session.question.subject || session.question.difficulty ? `
            <div style="font-size:11px;color:#9ca3af;margin-bottom:${session.score != null ? '6px' : '16px'}">
              ${[session.question.subject, session.question.difficulty].filter(Boolean).join(' · ')}
            </div>` : ''}
          ${session.score != null ? `<div style="font-size:12px;font-weight:700;color:#4f46e5;margin-bottom:16px">Score: ${session.score}/100</div>` : '<div style="margin-bottom:16px"></div>'}

          ${originalHtml}
          ${notesHtml}

          <!-- Chat trail -->
          <div style="font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Chat Trail</div>
          ${messagesHtml || '<div style="color:#9ca3af;font-size:13px">No messages yet.</div>'}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tcher Ayu Export</title>
<style>
${katexCss}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; padding: 32px 40px; max-width: 820px; margin: 0 auto; }
h1, h2, h3 { color: #111827; font-weight: 600; margin: 8px 0 4px; }
h1 { font-size: 1.2em; }
h2 { font-size: 1.05em; }
h3 { font-size: 0.95em; }
p { margin: 6px 0; line-height: 1.65; }
ul, ol { padding-left: 20px; margin: 6px 0; }
li { margin: 3px 0; line-height: 1.6; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
th { background: #f3f4f6; padding: 6px 10px; text-align: left; border: 1px solid #d1d5db; font-weight: 600; }
td { padding: 6px 10px; border: 1px solid #e5e7eb; }
tr:nth-child(even) td { background: #f9fafb; }

.section-label { font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding:4px 10px;border-radius:4px;margin-bottom:8px;display:inline-block; }
.md-content p:first-child { margin-top: 0; }
.md-content p:last-child { margin-bottom: 0; }

/* Cover page */
.cover { padding: 40px 0 32px; border-bottom: 2px solid #e5e7eb; margin-bottom: 40px; }

@media print {
  body { padding: 0; }
  .page-break { page-break-before: always; }
}
</style>
</head>
<body>

<!-- Cover -->
<div class="cover">
  <div style="font-size:26px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px">Tcher Ayu</div>
  <div style="font-size:13px;color:#6b7280;margin-top:4px">AI Tutoring Session Export</div>
  <div style="font-size:11px;color:#9ca3af;margin-top:12px">Generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}</div>
  <div style="font-size:11px;color:#9ca3af;margin-top:2px">Sessions: ${sessions.length}</div>
</div>

${sessionPages}
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
