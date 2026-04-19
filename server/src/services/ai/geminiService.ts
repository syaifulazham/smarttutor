import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { z } from 'zod';
import { ParsedContent } from '../../../../packages/shared/types/question';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const PARSE_SYSTEM_PROMPT = `You are an expert at parsing academic questions from any source.
Given an image or text, extract and structure the question.

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "questionText": "clean question text with proper formatting",
  "type": "multiple_choice | short_answer | long_answer | calculation | diagram_based",
  "subject": "Mathematics | Physics | Chemistry | Biology | History | etc",
  "difficulty": "Easy | Medium | Hard",
  "components": [
    { "type": "text", "content": "..." },
    { "type": "equation", "content": "LaTeX string", "display": true },
    { "type": "table", "headers": [], "rows": [[]] },
    { "type": "diagram_description", "content": "valid Mermaid.js syntax e.g. graph TD\\n  A-->B" },
    { "type": "image_reference", "url": "...", "caption": "..." },
    { "type": "options", "items": ["A. ...", "B. ...", "C. ...", "D. ..."] }
  ],
  "tags": ["algebra", "quadratic"]
}

Use LaTeX for ALL mathematical expressions.
For diagrams, output VALID Mermaid.js syntax (e.g. graph TD, flowchart LR, sequenceDiagram) — not plain English descriptions. If the diagram cannot be represented in Mermaid, omit the component entirely.`;

const parsedContentSchema = z.object({
  questionText: z.string(),
  type: z.enum(['multiple_choice', 'short_answer', 'long_answer', 'calculation', 'diagram_based']),
  subject: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  components: z.array(z.any()),
  tags: z.array(z.string()),
});

const MERMAID_PROMPT = `You are a diagram-to-code expert.
Convert the diagram or graph into valid Mermaid.js syntax.
Return ONLY the raw Mermaid code — no markdown fences, no explanation, nothing else.
Choose the most appropriate diagram type: flowchart, graph, sequenceDiagram, classDiagram, stateDiagram, erDiagram, pie, etc.
If you cannot represent it faithfully in Mermaid, return: graph TD\n  A[Cannot represent this diagram]`;

function stripJsonFences(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
}

function stripMermaidFences(raw: string): string {
  return raw.replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/i, '').trim();
}

// Re-draws any diagram_description components using Gemini (with optional source image)
async function enrichDiagrams(
  parsed: ParsedContent,
  imageBase64?: string,
  mimeType?: string
): Promise<ParsedContent> {
  const components = await Promise.all(
    parsed.components.map(async (comp) => {
      if (comp.type !== 'diagram_description') return comp;

      const parts: (string | Part)[] = [
        MERMAID_PROMPT,
        `Description: ${comp.content}`,
      ];
      // Pass the original image so Gemini can see the actual graph
      if (imageBase64 && mimeType) {
        parts.push('Original image for reference:');
        parts.push({ inlineData: { data: imageBase64, mimeType } } as Part);
      }

      const result = await model.generateContent(parts);
      return { ...comp, content: stripMermaidFences(result.response.text()) };
    })
  );

  return { ...parsed, components };
}

export async function parseQuestionFromText(text: string): Promise<ParsedContent> {
  const result = await model.generateContent([
    PARSE_SYSTEM_PROMPT,
    `Parse this question:\n\n${text}`,
  ]);

  const raw = stripJsonFences(result.response.text());
  const parsed = parsedContentSchema.parse(JSON.parse(raw)) as ParsedContent;
  return enrichDiagrams(parsed);
}

export async function parseQuestionFromImage(
  imageBase64: string,
  mimeType: string,
  imageUrl?: string
): Promise<ParsedContent> {
  const imagePart: Part = {
    inlineData: { data: imageBase64, mimeType },
  };

  const result = await model.generateContent([
    PARSE_SYSTEM_PROMPT,
    'Parse the academic question from this image:',
    imagePart,
  ]);

  const raw = stripJsonFences(result.response.text());
  let parsed = parsedContentSchema.parse(JSON.parse(raw)) as ParsedContent;

  // Replace any placeholder image_reference URLs with the real uploaded image URL.
  // If Gemini included no image_reference but we have a source image, inject one.
  if (imageUrl) {
    const hasImageRef = parsed.components.some(c => c.type === 'image_reference');
    const components = parsed.components.map(c =>
      c.type === 'image_reference' ? { ...c, url: imageUrl } : c
    );
    if (!hasImageRef) {
      // Prepend image reference so the original photo is always visible
      components.unshift({ type: 'image_reference', url: imageUrl, caption: 'Source image' });
    }
    parsed = { ...parsed, components };
  }

  return enrichDiagrams(parsed, imageBase64, mimeType);
}

// Returns just the correct answer letter for a multiple-choice question
export async function getCorrectAnswerLetter(questionContent: object): Promise<string | null> {
  const result = await model.generateContent([
    'You are given a multiple choice question. Respond with ONLY a single uppercase letter (A, B, C, or D) — the correct answer. No explanation, no punctuation, nothing else.',
    `Question: ${JSON.stringify(questionContent)}`,
  ]);
  const text = result.response.text().trim().replace(/[^A-D]/gi, '').toUpperCase();
  return /^[A-D]$/.test(text) ? text : null;
}

const SCHEME_PROMPT: Record<string, string> = {
  en: `You are providing a model answer / marking scheme for this question.
Format clearly using markdown:
- For short/long answer questions: list the key points with marks allocation (e.g. "• Correct identification of X [1m]")
- For calculation questions: show full working with each step marked
- For diagram-based: describe what a full-mark answer must include
Be concise but complete. A student should be able to self-assess from this scheme.`,
  ms: `Anda menyediakan skema jawapan / model jawapan untuk soalan ini.
Format dengan jelas menggunakan markdown:
- Untuk soalan pendek/panjang: senaraikan isi penting dengan peruntukan markah (cth. "• Mengenal pasti X dengan betul [1m]")
- Untuk soalan pengiraan: tunjukkan langkah penuh dengan markah setiap langkah
- Untuk soalan berasaskan rajah: huraikan apa yang perlu ada dalam jawapan markah penuh
Ringkas tapi lengkap.`,
  zh: `你正在为这道题提供标准答案/评分方案。
使用 markdown 清晰格式化：
- 对于简答/长答题：列出要点并标注分值（例如"• 正确识别 X [1分]"）
- 对于计算题：展示完整步骤，每步标注分值
- 对于图表题：描述满分答案必须包含的内容
简洁但完整。`,
};

export async function* streamSchemeAnswer(
  questionContent: object,
  language = 'en'
): AsyncGenerator<string> {
  const prompt = SCHEME_PROMPT[language] ?? SCHEME_PROMPT['en'];
  const stream = await model.generateContentStream([
    prompt,
    `Question: ${JSON.stringify(questionContent)}`,
    'Provide the model answer / marking scheme now:',
  ]);

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Respond entirely in English.',
  ms: 'Jawab sepenuhnya dalam Bahasa Melayu (standard).',
  zh: '请全程使用普通话（简体中文）回答。',
};

export async function* streamTutorResponse(
  messages: Array<{ role: string; content: string; timestamp: string }>,
  mode: 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION',
  questionContent: object,
  language = 'en'
): AsyncGenerator<string> {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['en'];

  const systemPrompt =
    mode === 'SELF_ATTEMPT'
      ? `You are an encouraging tutor. The student wants to attempt the question themselves.
1. Present the question clearly if this is the start.
2. Accept their answer when provided.
3. Review it: highlight what's correct, what's wrong, guide to the correct answer.
4. Give a score out of 100 and a clear explanation.
${langInstruction}`
      : `You are a clear, step-by-step tutor.
1. Acknowledge the question.
2. Break it into steps.
3. Explain each step with reasoning.
4. Summarize the solution approach.
5. Offer to clarify anything.
${langInstruction}`;

  const contextPrompt = `Question context: ${JSON.stringify(questionContent)}\n\n${systemPrompt}`;

  // Build chat history for Gemini
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: contextPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help as your tutor.' }] },
      ...messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      })),
    ],
  });

  const lastMessage = messages[messages.length - 1];
  const stream = await chat.sendMessageStream(lastMessage?.content ?? '');

  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
