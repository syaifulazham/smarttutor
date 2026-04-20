import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TextCapture from '@/components/capture/TextCapture';
import ImageCapture from '@/components/capture/ImageCapture';
import QuestionRenderer from '@/components/question/QuestionRenderer';
import { captureText, captureImage, createSession } from '@/services/api';
import { useLanguageStore } from '@/store/languageStore';
import type { ParsedContent } from '../../../../packages/shared/types/question';

type Tab = 'text' | 'image';
type Mode = 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION';

interface CapturedQuestion {
  id: string;
  parsedContent: ParsedContent;
  imageUrl?: string;
  title?: string;
}

export default function CaptureQuestion() {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const [tab, setTab] = useState<Tab>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [nonAcademic, setNonAcademic] = useState(false);
  const [captured, setCaptured] = useState<CapturedQuestion[]>([]);
  const [startingFor, setStartingFor] = useState<string | null>(null); // questionId

  function extractApiError(err: unknown): { message: string; upgrade: boolean; nonAcademic: boolean } {
    const e = err as { response?: { status?: number; data?: { error?: string; upgradeRequired?: boolean; nonAcademic?: boolean } } };
    if (e?.response?.status === 403) {
      return { message: e.response.data?.error ?? 'Plan limit reached.', upgrade: true, nonAcademic: false };
    }
    if (e?.response?.status === 422) {
      return { message: e.response.data?.error ?? 'Content is not an academic question.', upgrade: false, nonAcademic: true };
    }
    return { message: 'Failed to analyse question. Please try again.', upgrade: false, nonAcademic: false };
  }

  async function handleText(text: string) {
    setIsLoading(true);
    setError(null);
    setUpgradeRequired(false);
    setNonAcademic(false);
    try {
      const questions = await captureText(text, language);
      setCaptured(Array.isArray(questions) ? questions : [questions]);
    } catch (err) {
      const { message, upgrade, nonAcademic: na } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
      setNonAcademic(na);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImage(file: File) {
    setIsLoading(true);
    setError(null);
    setUpgradeRequired(false);
    setNonAcademic(false);
    try {
      const questions = await captureImage(file, language);
      setCaptured(Array.isArray(questions) ? questions : [questions]);
    } catch (err) {
      const { message, upgrade, nonAcademic: na } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
      setNonAcademic(na);
    } finally {
      setIsLoading(false);
    }
  }

  async function startSession(questionId: string, mode: Mode) {
    setStartingFor(questionId);
    setError(null);
    setUpgradeRequired(false);
    try {
      const session = await createSession(questionId, mode);
      navigate(`/session/${session.id}`);
    } catch (err) {
      const { message, upgrade } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
      setStartingFor(null);
    }
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      tab === t
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  const isCaptured = captured.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Capture a Question</h1>

      {!isCaptured ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex border-b border-gray-200 px-4">
            <button className={tabClass('text')} onClick={() => setTab('text')}>Text</button>
            <button className={tabClass('image')} onClick={() => setTab('image')}>Image</button>
          </div>
          <div className="p-5">
            {tab === 'text' ? (
              <TextCapture onSubmit={handleText} isLoading={isLoading} />
            ) : (
              <ImageCapture onSubmit={handleImage} isLoading={isLoading} />
            )}
          </div>
          {isLoading && (
            <div className="px-5 pb-4 text-sm text-gray-500 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Analysing your question with AI...
            </div>
          )}
          {error && (
            <div className={`mx-5 mb-4 p-3 rounded-lg border text-sm ${nonAcademic ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {nonAcademic && (
                <p className="font-semibold mb-1">Content not recognised as an academic question</p>
              )}
              <p>{error}</p>
              {upgradeRequired && (
                <Link to="/pricing" className="mt-2 inline-block font-semibold underline text-primary-600">
                  View upgrade plans →
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {captured.length > 1 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-700 font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              {captured.length} questions detected — each has been saved separately.
            </div>
          )}

          {captured.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Question header */}
              {captured.length > 1 && (
                <div className="px-5 pt-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question {index + 1}</span>
                </div>
              )}

              <div className="p-5">
                {captured.length === 1 && (
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Parsed Question</h2>
                )}
                <QuestionRenderer
                  parsedContent={q.parsedContent}
                  questionImageUrl={q.imageUrl}
                />
              </div>

              {/* Session mode selector */}
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {captured.length > 1 ? 'Start a session for this question:' : 'How would you like to approach this question?'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => startSession(q.id, 'SELF_ATTEMPT')}
                    disabled={startingFor !== null}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <span className="text-3xl">💪</span>
                    <span className="font-medium text-sm">I'll try it myself</span>
                    <span className="text-xs text-gray-500 text-center">Attempt then get reviewed</span>
                  </button>
                  <button
                    onClick={() => startSession(q.id, 'DIRECT_EXPLANATION')}
                    disabled={startingFor !== null}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <span className="text-3xl">🎓</span>
                    <span className="font-medium text-sm">Explain it to me</span>
                    <span className="text-xs text-gray-500 text-center">Step-by-step explanation</span>
                  </button>
                </div>
                {error && startingFor === null && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <p>{error}</p>
                    {upgradeRequired && (
                      <Link to="/pricing" className="mt-1 inline-block font-semibold underline text-primary-600">
                        View upgrade plans →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => { setCaptured([]); setError(null); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Capture a different question
          </button>
        </div>
      )}
    </div>
  );
}
