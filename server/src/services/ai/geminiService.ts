import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { z } from 'zod';
import { ParsedContent } from '../../types/question';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Lower-temperature model instance for factual tutoring — reduces hallucination
const tutorModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.4,
    topP: 0.85,
  },
});

const LANGUAGE_OUTPUT: Record<string, string> = {
  en: 'Write ALL text fields (questionText, component text, options) in English.',
  ms: 'Tulis SEMUA medan teks (questionText, teks komponen, pilihan jawapan) dalam Bahasa Melayu.',
  zh: '将所有文本字段（questionText、组件文本、选项）用普通话（简体中文）书写。',
};

const QUESTION_OBJECT_SHAPE = `{
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
}`;

function buildParsePrompt(language = 'en'): string {
  const langInstruction = LANGUAGE_OUTPUT[language] ?? LANGUAGE_OUTPUT['en'];
  return `You are an expert at parsing academic questions from any source.
Given an image or text, extract and structure the question.

${langInstruction}

Return ONLY a raw JSON object (no markdown, no code fences):
${QUESTION_OBJECT_SHAPE}

Use LaTeX for ALL mathematical expressions.
For diagrams, output VALID Mermaid.js syntax (e.g. graph TD, flowchart LR, sequenceDiagram) — not plain English descriptions. If the diagram cannot be represented in Mermaid, omit the component entirely.`;
}

function buildMultiParsePrompt(language = 'en'): string {
  const langInstruction = LANGUAGE_OUTPUT[language] ?? LANGUAGE_OUTPUT['en'];
  return `You are an academic question parser for a student tutoring platform.

STEP 1 — ACADEMIC VALIDATION:
Determine whether the input contains genuine academic or educational content.
ACCEPT: exam questions, homework problems, textbook exercises, scientific/mathematical problems, essay prompts, history/geography/language questions, and similar educational material.
REJECT: selfies, memes, casual photos, food/nature images, unrelated text, advertisements, chat messages, or any non-educational content.

STEP 2 — SPLITTING RULES (only if academic):
- If the input contains multiple INDEPENDENT main questions (e.g. "Question 1", "Question 2", separate numbered problems), split each into its own object.
- Sub-parts (a), (b), (c)… within the same main question are NOT separate questions. Keep them together in one object.
- If there is only one main question, return an array with exactly one object.

${langInstruction}

Return ONLY a raw JSON object (no markdown, no code fences):

If NOT academic:
{
  "isAcademic": false,
  "reason": "brief explanation of why this was rejected"
}

If academic:
{
  "isAcademic": true,
  "questions": [
    ${QUESTION_OBJECT_SHAPE}
  ]
}

Use LaTeX for ALL mathematical expressions.
For diagrams, output VALID Mermaid.js syntax. If a diagram cannot be represented in Mermaid, omit the component entirely.`;
}

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

const parsedContentArraySchema = z.array(parsedContentSchema);

const multiParseResponseSchema = z.object({
  isAcademic: z.boolean(),
  reason: z.string().optional(),
  questions: z.array(parsedContentSchema).optional(),
});

export class NonAcademicError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'NonAcademicError';
  }
}

function validateAcademicResponse(raw: string): ParsedContent[] {
  const parsed = multiParseResponseSchema.parse(JSON.parse(raw));
  if (!parsed.isAcademic) {
    throw new NonAcademicError(parsed.reason ?? 'Content does not appear to be an academic question.');
  }
  return parsedContentArraySchema.parse(parsed.questions ?? []) as ParsedContent[];
}

export async function parseQuestionsFromText(text: string, language = 'en'): Promise<ParsedContent[]> {
  const result = await model.generateContent([
    buildMultiParsePrompt(language),
    `Parse all questions from this input:\n\n${text}`,
  ]);
  const questions = validateAcademicResponse(stripJsonFences(result.response.text()));
  return Promise.all(questions.map((q) => enrichDiagrams(q)));
}

export async function parseQuestionsFromImage(
  imageBase64: string,
  mimeType: string,
  imageUrl?: string,
  language = 'en'
): Promise<ParsedContent[]> {
  const imagePart: Part = { inlineData: { data: imageBase64, mimeType } };
  const result = await model.generateContent([
    buildMultiParsePrompt(language),
    'Parse all academic questions from this image:',
    imagePart,
  ]);

  let questions = validateAcademicResponse(stripJsonFences(result.response.text()));

  // Inject source image reference into first question only
  if (imageUrl) {
    questions = questions.map((q, i) => {
      if (i !== 0) return q;
      const hasImageRef = q.components.some((c) => c.type === 'image_reference');
      const components = q.components.map((c) =>
        c.type === 'image_reference' ? { ...c, url: imageUrl } : c
      );
      if (!hasImageRef) components.unshift({ type: 'image_reference', url: imageUrl, caption: 'Source image' });
      return { ...q, components };
    });
  }

  return Promise.all(questions.map((q) => enrichDiagrams(q, imageBase64, mimeType)));
}

export async function parseQuestionFromText(text: string, language = 'en'): Promise<ParsedContent> {
  const result = await model.generateContent([
    buildParsePrompt(language),
    `Parse this question:\n\n${text}`,
  ]);

  const raw = stripJsonFences(result.response.text());
  const parsed = parsedContentSchema.parse(JSON.parse(raw)) as ParsedContent;
  return enrichDiagrams(parsed);
}

export async function parseQuestionFromImage(
  imageBase64: string,
  mimeType: string,
  imageUrl?: string,
  language = 'en'
): Promise<ParsedContent> {
  const imagePart: Part = {
    inlineData: { data: imageBase64, mimeType },
  };

  const result = await model.generateContent([
    buildParsePrompt(language),
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
Output ONLY valid markdown. Do NOT wrap in code fences or backticks.

Structure rules (follow exactly):
1. If the question has sub-parts (a), (b), (c)…, start each with a ### heading, e.g. ### (a) Find the value of p
2. Under each heading, list every marking point as a markdown list item ("- "). Do NOT use the bullet character (•).
3. End each marking point with the mark in brackets, e.g. [1m].
4. Leave a blank line between each ### section.

MATH FORMATTING — critical:
- NEVER mix an equation and a text statement on the same line.
- Every equation or working step goes on its OWN line using display math: $$equation$$
- Only single variables or trivial values may stay inline: $p = 1$, $x = h$
- Each arrow / implication (⟹) that leads to the next step must start a NEW line.

Example of correct format:
### (a) Find p

- Substitute point $(0, 7)$ into the function:
$$7 = 2(0 - p)^2 + 5$$
$$2p^2 = 2$$
$$p = \pm 1$$ [1m]
- Verify with $(2, 7)$ using $p = 1$:
$$y = 2(2-1)^2 + 5 = 7 \checkmark$$ [1m]

### (b) Axis of symmetry

- General form $y = a(x-h)^2+k$ has axis of symmetry $x = h$. [1m]
- With $p = 1$, axis of symmetry is $x = 1$. [1m]`,

  ms: `Anda menyediakan skema jawapan / model jawapan untuk soalan ini.
Output HANYA markdown yang betul. JANGAN balut dengan code fence atau backtick.

Peraturan struktur (ikut dengan tepat):
1. Jika soalan ada bahagian (a), (b), (c)…, mulakan setiap bahagian dengan heading ###, cth. ### (a) Cari nilai p
2. Di bawah setiap heading, senaraikan setiap isi penting sebagai item senarai markdown ("- "). JANGAN gunakan aksara bullet (•).
3. Akhiri setiap isi dengan markah dalam kurungan, cth. [1m].
4. Tinggalkan baris kosong antara setiap bahagian ###.

FORMAT MATEMATIK — penting:
- JANGAN letakkan persamaan dan kenyataan teks dalam baris yang sama.
- Setiap persamaan atau langkah pengiraan mesti berada pada barisnya SENDIRI menggunakan display math: $$persamaan$$
- Hanya pemboleh ubah tunggal atau nilai ringkas boleh kekal sebaris: $p = 1$
- Setiap anak panah / implikasi yang membawa ke langkah seterusnya mesti bermula pada baris BARU.`,

  zh: `你正在为这道题提供标准答案/评分方案。
只输出有效的 markdown — 不要用代码围栏或反引号包裹。

结构规则（严格遵守）：
1. 若题目有子问 (a)(b)(c)…，每个子问以 ### 标题开始，例如：### (a) 求 p 的值
2. 每个标题下，用 markdown 列表项（"- " 开头）列出每个得分点，禁止使用 • 字符。
3. 每个得分点末尾注明分值，例如 [1分]。
4. 每个 ### 段落之间空一行。

数学格式——重要：
- 绝对不要把方程式和文字说明写在同一行。
- 每个方程式或计算步骤单独占一行，使用展示数学模式：$$方程式$$
- 只有单个变量或简单值才可以内联：$p = 1$
- 每个推导箭头（⟹）必须另起新行。`,
};

export async function* streamSchemeAnswer(
  questionContent: object,
  language = 'en'
): AsyncGenerator<string> {
  const prompt = SCHEME_PROMPT[language] ?? SCHEME_PROMPT['en'];
  const schemeModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.2, topP: 0.8 },
  });
  const stream = await schemeModel.generateContentStream([
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

const AVATAR_PERSONALITY: Record<string, string> = {
  ayu: `Your name is Ayu. You are warm, gentle, and deeply encouraging.
Speak like a caring friend — use soft, reassuring language. Celebrate small wins. If the student is wrong, never make them feel bad; instead say "Tak apa, jom cuba lagi!" or similar.
Use a natural mix of Bahasa Melayu and English. Keep sentences short and friendly. Add occasional warmth emojis (💙✨) but don't overdo it.`,

  sara: `Your name is Ms. Sara. You are patient, calm, and supportive.
Never rush. Break every explanation into the smallest possible steps. If a student seems confused, slow down even further and use different words.
Speak in measured, reassuring English. Occasionally affirm the student: "You're doing well", "That's a good question". Avoid slang. Maintain a gentle teacher tone throughout.`,

  rajan: `Your name is Mr. Rajan. You are high-energy, enthusiastic, and love breaking problems into steps.
Use exclamation marks freely! You get genuinely excited about correct answers. Hype the student up.
Mix Bahasa Melayu and English energetically. Use phrases like "Jom jom!", "YES! Betul tu!", "Okay NEXT step—". Keep the energy up throughout the explanation. Make learning feel like an adventure.`,

  chen: `Your name is Dr. Chen. You are precise, methodical, and academically rigorous.
Always structure your response formally: define terms, state assumptions, then solve step by step.
Use only English. No emojis. No filler phrases. Every sentence must add information. Reference laws, theorems, or formulas by name when applicable. Conclude with a concise summary statement.`,

  alex: `Your name is Alex. You are fast, direct, and no-nonsense.
Get to the point immediately — no greetings, no preamble. Use short sentences. Bullet points where possible.
Skip pleasantries entirely. If the student is wrong, say so plainly and give the correction. Aim to deliver the answer in as few words as possible without sacrificing accuracy.`,

  maya: `Your name is Maya. You are a creative problem-solver who loves finding unexpected angles.
Don't follow the textbook path if a more intuitive or visual approach exists. Use analogies, real-world examples, and "what if" thinking to make concepts click.
Mix Bahasa Melayu and English playfully. Encourage the student to think differently. Phrase things like "Okay, imagine it this way..." or "Cuba fikir macam ni...". Make the explanation memorable, not just correct.`,
};

export async function* streamTutorResponse(
  messages: Array<{ role: string; content: string; timestamp: string }>,
  mode: 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION',
  questionContent: object,
  language = 'en',
  avatarId = 'ayu'
): AsyncGenerator<string> {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] ?? LANGUAGE_INSTRUCTIONS['en'];
  const personalityInstruction = AVATAR_PERSONALITY[avatarId] ?? AVATAR_PERSONALITY['ayu'];

  const groundingRule = `FACTUAL ACCURACY — critical:
Base every explanation step strictly on the question content provided. Do not introduce values, formulas, definitions, or facts not present in or directly derivable from the question. If uncertain about a step, say so rather than guessing.
This rule applies to explanations only — Quick Check quiz distractors may include plausible but incorrect alternatives to test understanding.`;

  const systemPrompt =
    mode === 'SELF_ATTEMPT'
      ? `${personalityInstruction}

The student wants to attempt the question themselves.
1. Present the question clearly if this is the start.
2. Accept their answer when provided.
3. Review it: highlight what's correct, what's wrong, guide to the correct answer.
4. Give a score out of 100 and a clear explanation.
${groundingRule}
${langInstruction}`
      : `${personalityInstruction}

Explain the question step by step according to your personality above.
1. Acknowledge the question.
2. Break it into steps.
3. Explain each step with reasoning.
4. Summarize the solution approach.
5. Offer to clarify anything.

INTERACTIVE QUIZ: To check the student's understanding, you MAY embed one quick multiple-choice question between steps using EXACTLY this single-line format (no line breaks inside):
[QUIZ: <question text> | A) <option> | B) <option> | C) <option> | D) <option> | ANS:<A/B/C/D>]
Rules: use at most once per response, only when it genuinely tests a key concept just explained, write the question and all options in the same language as your explanation.
${groundingRule}
${langInstruction}`;

  const contextPrompt = `Question context: ${JSON.stringify(questionContent)}\n\n${systemPrompt}`;

  // Build chat history for Gemini
  const chat = tutorModel.startChat({
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
