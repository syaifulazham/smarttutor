import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import type { Components } from 'react-markdown';
import { useSpeech } from '@/hooks/useSpeech';
import type { SpeechLang } from '@/hooks/useSpeech';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import { getSession, completeSession, deleteSession, saveSessionNotes } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { preprocessMath, stripOuterCodeFence, normalizeSchemeMarkdown } from '@/utils/preprocessMath';
import QuestionRenderer from '@/components/question/QuestionRenderer';
import InlineMath from '@/components/shared/InlineMath';
import AvatarPicker from '@/components/shared/AvatarPicker';
import { useAvatarStore } from '@/store/avatarStore';
import { useLanguageStore } from '@/store/languageStore';
import type { ParsedContent, OptionsComponent } from '../../../../packages/shared/types/question';

const EXPLAIN_LABELS: Record<string, { label: string; message: string }> = {
  en: { label: 'Explain',    message: 'Please explain this question step by step.' },
  ms: { label: 'Terangkan', message: 'Sila terangkan soalan ini langkah demi langkah.' },
  zh: { label: '解释题目',   message: '请逐步解释这道题。' },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Alternating step colors
const STEP_STYLES = [
  { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-200 text-slate-700' },
  { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-200 text-blue-800' },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-200 text-violet-800' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-200 text-emerald-800' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-200 text-amber-800' },
];

// Split AI response into logical steps on numbered bold headers, ### headings, or paragraph pairs
function splitIntoParts(content: string): string[] {
  // Try split on **N. heading lines
  const byNumbered = content.split(/(?=\n\*\*\d+[\.\)])/).map(s => s.trim()).filter(Boolean);
  if (byNumbered.length > 1) return byNumbered;

  // Try split on markdown headings
  const byHeading = content.split(/(?=\n#{2,3}\s)/).map(s => s.trim()).filter(Boolean);
  if (byHeading.length > 1) return byHeading;

  // Fallback: group paragraphs in pairs
  const paras = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (paras.length <= 2) return [content];
  const chunks: string[] = [];
  for (let i = 0; i < paras.length; i += 2) {
    chunks.push(paras.slice(i, i + 2).join('\n\n'));
  }
  return chunks;
}

// Custom markdown components — highlights **bold** in amber, colors inline code
const mdComponents: Partial<Components> = {
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-amber-700 bg-amber-50 px-0.5 rounded">
      {children}
    </strong>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = !!className;
    return isBlock ? (
      <code className={`${className} block bg-gray-800 text-green-300 rounded p-2 text-xs overflow-x-auto`}>
        {children}
      </code>
    ) : (
      <code className="text-primary-700 bg-primary-50 px-1 rounded text-xs">{children}</code>
    );
  },
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="not-italic text-blue-700 font-medium">{children}</em>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border border-gray-300 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gray-200 text-gray-700">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="even:bg-gray-50 border-b border-gray-200">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 last:border-r-0 whitespace-nowrap">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 border-r border-gray-200 last:border-r-0">{children}</td>
  ),
};


// ─── Inline quiz ─────────────────────────────────────────────────────────────
interface QuizData {
  question: string;
  options: { letter: string; text: string }[];
  answer: string;
}

const QUIZ_REGEX = /\[QUIZ:\s*(.*?)\s*\|\s*A\)\s*(.*?)\s*\|\s*B\)\s*(.*?)\s*\|\s*C\)\s*(.*?)\s*\|\s*D\)\s*(.*?)\s*\|\s*ANS:([A-D])\]/gi;

function parseQuizParts(content: string): Array<{ type: 'text'; text: string } | { type: 'quiz'; data: QuizData }> {
  const parts: Array<{ type: 'text'; text: string } | { type: 'quiz'; data: QuizData }> = [];
  let last = 0;
  for (const m of content.matchAll(QUIZ_REGEX)) {
    if (m.index! > last) parts.push({ type: 'text', text: content.slice(last, m.index) });
    parts.push({
      type: 'quiz',
      data: {
        question: m[1].trim(),
        options: [
          { letter: 'A', text: m[2].trim() },
          { letter: 'B', text: m[3].trim() },
          { letter: 'C', text: m[4].trim() },
          { letter: 'D', text: m[5].trim() },
        ],
        answer: m[6].toUpperCase(),
      },
    });
    last = m.index! + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', text: content.slice(last) });
  return parts;
}

function QuizBlock({ data }: { data: QuizData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  return (
    <div className="my-3 rounded-xl border-2 border-purple-200 bg-purple-50 p-4 animate-slide-down">
      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Quick Check
      </p>
      <p className="text-sm font-medium text-gray-800 mb-3">{data.question}</p>
      <div className="space-y-2">
        {data.options.map(({ letter, text }) => {
          const isCorrect = letter === data.answer;
          const isSelected = selected === letter;
          const base = 'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2';
          const style = !answered
            ? `${base} border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50 text-gray-700`
            : isSelected && isCorrect
              ? `${base} border-green-500 bg-green-50 text-green-800 font-medium`
              : isSelected && !isCorrect
                ? `${base} border-red-400 bg-red-50 text-red-700`
                : isCorrect
                  ? `${base} border-green-400 bg-green-50 text-green-700`
                  : `${base} border-gray-200 bg-gray-50 text-gray-400`;
          return (
            <button key={letter} disabled={answered} onClick={() => setSelected(letter)} className={style}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center
                ${!answered ? 'border-gray-400 text-gray-500' : isCorrect ? 'border-green-500 bg-green-500 text-white' : isSelected ? 'border-red-400 bg-red-400 text-white' : 'border-gray-300 text-gray-400'}`}>
                {letter}
              </span>
              {text}
              {answered && isCorrect && (
                <svg className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`mt-2.5 text-xs font-semibold flex items-center gap-1 ${selected === data.answer ? 'text-green-600' : 'text-red-600'}`}>
          {selected === data.answer
            ? '✓ Correct! Well done.'
            : `✗ Not quite — the correct answer is ${data.answer}.`}
        </p>
      )}
    </div>
  );
}

// ─── Option finder ────────────────────────────────────────────────────────────
// Find the full option text matching the letter
function findOption(parsedContent: ParsedContent | undefined, letter: string): string | null {
  if (!parsedContent) return null;
  const optComp = parsedContent.components.find(
    (c): c is OptionsComponent => c.type === 'options'
  );
  if (!optComp) return null;
  return optComp.items.find((item) => item.trim().toUpperCase().startsWith(letter)) ?? null;
}

function MarkdownStep({ content }: { content: string }) {
  const parts = parseQuizParts(content);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === 'quiz' ? (
          <QuizBlock key={i} data={part.data} />
        ) : (
          <div key={i} className="prose prose-sm max-w-none
            prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1
            prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-gray-800
            prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4 prose-li:my-0.5
            prose-blockquote:border-l-2 prose-blockquote:border-primary-400 prose-blockquote:pl-3 prose-blockquote:text-gray-600">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={mdComponents}
            >
              {preprocessMath(part.text)}
            </ReactMarkdown>
          </div>
        )
      )}
    </div>
  );
}

interface SteppedMessageProps {
  content: string;
  messageIndex: number;
  speech: ReturnType<typeof useSpeech>;
  language: SpeechLang;
  parsedContent?: ParsedContent;
  sessionId: string;
  isLastMessage: boolean;
  onAnswerRevealed?: (letter: string | null) => void;
}

const SHOW_ANSWER_LABEL: Record<string, string> = {
  en: 'Show Answer', ms: 'Tunjuk Jawapan', zh: '显示答案',
};

// Paginated assistant message — shows one step at a time with Next + Voice + Show Answer
function SteppedMessage({ content, messageIndex, speech, language, parsedContent, sessionId, isLastMessage, onAnswerRevealed }: SteppedMessageProps) {
  const parts = splitIntoParts(content);
  const [revealed, setRevealed] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [resolvedLetter, setResolvedLetter] = useState<string | null>(null);
  const [schemeText, setSchemeText] = useState('');
  const [schemeFetching, setSchemeFetching] = useState(false);

  // Restore persisted scheme / answer from session data on mount
  useEffect(() => {
    if (!isLastMessage) return;
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/sessions/${sessionId}`, { headers })
      .then(r => r.json())
      .then((s) => {
        if (s.schemeAnswer) { setShowAnswer(true); setSchemeText(s.schemeAnswer); }
        if (s.correctLetter) { setShowAnswer(true); setResolvedLetter(s.correctLetter); onAnswerRevealed?.(s.correctLetter); }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isLastMessage]);

  const hasMore = revealed < parts.length;
  const allRevealed = !hasMore;

  const isObjective = parsedContent?.components.some(c => c.type === 'options') ?? false;
  const correctOption = resolvedLetter ? findOption(parsedContent, resolvedLetter) : null;

  async function handleShowAnswer(regenerate = false) {
    setShowAnswer(true);
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (isObjective) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/answer`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const { letter } = await res.json();
        setResolvedLetter(letter ?? null);
        onAnswerRevealed?.(letter ?? null);
      } catch (err) {
        console.error('Answer fetch failed:', err);
      }
    } else {
      setSchemeFetching(true);
      setSchemeText('');
      try {
        const res = await fetch(`/api/sessions/${sessionId}/scheme`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ language, regenerate }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
            for (const line of lines) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.chunk) { full += json.chunk; setSchemeText(full); }
              } catch { /* skip malformed SSE line */ }
            }
          }
        }
        onAnswerRevealed?.(null);
      } catch (err) {
        console.error('Scheme fetch failed:', err);
      } finally {
        setSchemeFetching(false);
      }
    }
  }

  return (
    <div className="w-full space-y-2">
      {parts.slice(0, revealed).map((part, pi) => {
        const style = STEP_STYLES[pi % STEP_STYLES.length];
        const isNew = pi === revealed - 1;
        const stepId = `msg-${messageIndex}-step-${pi}`;
        const isPlaying = speech.activeId === stepId;
        const isLoading = speech.loading === stepId;

        return (
          <div
            key={pi}
            className={`rounded-xl border px-4 py-3 ${style.bg} ${style.border} ${
              isNew ? 'animate-slide-down' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              {parts.length > 1 ? (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                  Step {pi + 1} of {parts.length}
                </span>
              ) : (
                <span />
              )}
              {speech.supported && (
                <button
                  onClick={() => speech.speak(part, language, stepId)}
                  disabled={!isPlaying && (speech.loading !== null || speech.activeId !== null)}
                  title={isPlaying ? 'Stop' : isLoading ? 'Loading…' : 'Listen'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isPlaying
                      ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                      : isLoading
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-wait'
                      : 'bg-white border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                      Stop
                    </>
                  ) : isLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Loading…
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                      Listen
                    </>
                  )}
                </button>
              )}
            </div>
            <MarkdownStep content={part} />
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setRevealed((r) => r + 1)}
          className="animate-fade-up flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors"
        >
          Next →
          <span className="text-xs text-primary-400">({parts.length - revealed} more)</span>
        </button>
      )}

      {/* Show Answer button — appears once all steps revealed, only on the last message */}
      {allRevealed && isLastMessage && !showAnswer && (
        <button
          onClick={() => handleShowAnswer()}
          className="animate-fade-up flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 hover:border-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {SHOW_ANSWER_LABEL[language] ?? 'Show Answer'}
        </button>
      )}

      {/* Objective: correct answer highlight */}
      {showAnswer && isObjective && (
        <div className="animate-slide-down rounded-xl border-2 border-green-400 bg-green-50 px-4 py-3">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Correct Answer
          </p>
          {resolvedLetter ? (
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white font-bold text-base flex items-center justify-center shadow">
                {resolvedLetter}
              </span>
              {correctOption ? (
                <p className="text-green-900 font-medium text-sm pt-1">
                  {correctOption.replace(/^[A-D][\.\)]\s*/i, '')}
                </p>
              ) : (
                <p className="text-green-900 font-medium text-sm pt-1">Option {resolvedLetter}</p>
              )}
            </div>
          ) : (
            <span className="text-green-600 text-sm animate-pulse">Looking up answer…</span>
          )}
        </div>
      )}

      {/* Subjective: scheme answer card */}
      {showAnswer && !isObjective && (
        <div className="animate-slide-down rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Marking Scheme / Model Answer
            </p>
            {!schemeFetching && schemeText && (
              <button
                onClick={() => { setSchemeText(''); handleShowAnswer(true); }}
                className="text-[10px] text-indigo-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                title="Regenerate scheme"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            )}
          </div>
          {schemeFetching && !schemeText ? (
            <span className="text-indigo-400 text-sm">Generating scheme<span className="animate-pulse">…</span></span>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-indigo-800 prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-1 prose-h3:text-sm prose-strong:text-indigo-800 prose-li:my-1 prose-ul:my-1 prose-p:my-1.5 text-indigo-900 [&>*:first-child]:mt-0">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {preprocessMath(normalizeSchemeMarkdown(stripOuterCodeFence(schemeText)))}
              </ReactMarkdown>
              {schemeFetching && <span className="animate-pulse text-indigo-400">▋</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguageStore();
  const { avatar } = useAvatarStore();
  const planTier = useAuthStore((s) => s.user?.planTier ?? 'FREE');
  const speech = useSpeech();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [highlightedAnswer, setHighlightedAnswer] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState('');
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id!),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () => completeSession(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/history');
    },
  });

  useEffect(() => {
    if (session?.messages) {
      setLocalMessages(session.messages as ChatMessage[]);
    }
    if (session?.notes != null) {
      setNotes(session.notes);
    }
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamingText]);

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaveStatus('saving');
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      try {
        await saveSessionNotes(id!, value);
        setNotesSaveStatus('saved');
        setTimeout(() => setNotesSaveStatus('idle'), 2000);
      } catch {
        setNotesSaveStatus('idle');
      }
    }, 1200);
  }

  async function sendMessage(override?: string) {
    const text = override ?? input;
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, userMsg]);
    if (!override) setInput('');
    setStreaming(true);
    setStreamingText('');

    const token = useAuthStore.getState().token;
    const res = await fetch(`/api/sessions/${id}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: text, language, avatarId: avatar.id }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let full = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const json = JSON.parse(line.slice(6));
          if (json.chunk) {
            full += json.chunk;
            setStreamingText(full);
          }
        }
      }
    }

    const assistantMsg: ChatMessage = { role: 'assistant', content: full, timestamp: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, assistantMsg]);
    setStreamingText('');
    setStreaming(false);
  }

  if (isLoading || !session) {
    return <div className="text-center text-gray-400 py-16">Loading session...</div>;
  }

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-8rem)]">
      {/* Left: Question */}
      <div className="w-full lg:w-2/5 bg-white rounded-xl border border-gray-200 shadow-sm p-5 overflow-y-auto flex-shrink-0 max-h-[50vh] lg:max-h-none">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Question</h2>
        {session.question.title && (
          <p className="text-sm font-semibold text-gray-800 mb-3 leading-snug">
            <InlineMath text={session.question.title} />
          </p>
        )}
        <QuestionRenderer
          parsedContent={session.question.parsedContent as ParsedContent}
          questionImageUrl={session.question.imageUrl ?? undefined}
          correctLetter={highlightedAnswer ?? undefined}
        />
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-xs text-gray-500">
          <p>Mode: <span className="font-medium">{session.mode === 'SELF_ATTEMPT' ? 'Self Attempt' : 'Explanation'}</span></p>
          <p>Status: <span className={`font-medium ${session.completed ? 'text-green-600' : 'text-yellow-600'}`}>{session.completed ? 'Completed' : 'In Progress'}</span></p>
        </div>
        {/* Notes panel */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Notes</p>
            {planTier !== 'FREE' && (
              <span className="text-[10px] text-gray-400">
                {notesSaveStatus === 'saving' && 'Saving…'}
                {notesSaveStatus === 'saved' && <span className="text-green-500">Saved ✓</span>}
              </span>
            )}
          </div>
          {planTier === 'FREE' ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-400 mb-1.5">Notes available on Cerdas &amp; Cemerlang</p>
              <a href="/pricing" className="text-xs font-semibold text-primary-600 hover:underline">Upgrade plan →</a>
            </div>
          ) : (
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Tulis nota anda di sini… / Write your notes here…"
              rows={5}
              className="w-full text-xs text-gray-700 placeholder-gray-300 bg-gray-50 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent leading-relaxed"
            />
          )}
        </div>

        {!session.completed && (
          <button
            onClick={() => completeMutation.mutate()}
            className="mt-4 w-full text-sm bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Mark Complete
          </button>
        )}

        {confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-2 w-full text-xs py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete Session
          </button>
        )}
      </div>

      {/* Right: Chat */}
      <div className="flex-1 min-h-[60vh] lg:min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2.5">
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="flex-shrink-0 relative group"
            title="Change tutor avatar"
          >
            <img
              src={avatar.url}
              alt={avatar.name}
              className="w-9 h-9 rounded-full object-cover bg-gray-100 ring-2 ring-primary-200 group-hover:ring-primary-400 transition-all"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 group-hover:border-primary-300 transition-colors">
              <svg className="w-2.5 h-2.5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
              </svg>
            </span>
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{avatar.name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{avatar.tagline}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center pt-10 gap-4">
              <p className="text-sm text-gray-400 text-center">
                {session.mode === 'SELF_ATTEMPT'
                  ? "Tell the tutor when you're ready to attempt the question."
                  : 'Start with a quick explanation or type your own message.'}
              </p>
              <button
                onClick={() => { sendMessage(EXPLAIN_LABELS[language]?.message ?? EXPLAIN_LABELS.en.message); }}
                disabled={streaming || session.completed}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm animate-fade-up"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {EXPLAIN_LABELS[language]?.label ?? 'Explain'}
              </button>
            </div>
          )}

          {localMessages.map((msg, i) => {
            const assistantMessages = localMessages.filter(m => m.role === 'assistant');
            const isLastAssistant = msg.role === 'assistant' && msg === assistantMessages[assistantMessages.length - 1];
            return msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm bg-primary-600 text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start gap-2">
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="flex-shrink-0 w-7 h-7 rounded-full object-cover bg-gray-100 mt-1 ring-1 ring-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <SteppedMessage
                    content={msg.content}
                    messageIndex={i}
                    speech={speech}
                    language={language as SpeechLang}
                    parsedContent={session.question.parsedContent as ParsedContent}
                    sessionId={id!}
                    isLastMessage={isLastAssistant}
                    onAnswerRevealed={isLastAssistant ? setHighlightedAnswer : undefined}
                  />
                </div>
              </div>
            );
          })}

          {/* Live streaming bubble */}
          {streaming && (
            <div className="flex justify-start gap-2">
              <img
                src={avatar.url}
                alt={avatar.name}
                className="flex-shrink-0 w-7 h-7 rounded-full object-cover bg-gray-100 mt-1 ring-1 ring-gray-200"
              />
              <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {streamingText ? (
                  <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>
                      {preprocessMath(streamingText)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Thinking…</span>
                )}
                <span className="animate-pulse text-primary-500 ml-0.5">▋</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-gray-100 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={streaming || session.completed}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
          <button
            onClick={() => { sendMessage(); }}
            disabled={!input.trim() || streaming || session.completed}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
        <div className="px-3 pb-2 flex items-start gap-1.5">
          <svg className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            AI-generated explanations may contain errors. Always verify important answers with your textbook, teacher, or authoritative sources before use in exams or assignments.
          </p>
        </div>
      </div>
    </div>
    {showAvatarPicker && <AvatarPicker onClose={() => setShowAvatarPicker(false)} />}
    </>
  );
}
