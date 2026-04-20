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
}

export default function CaptureQuestion() {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const [tab, setTab] = useState<Tab>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [captured, setCaptured] = useState<CapturedQuestion | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  function extractApiError(err: unknown): { message: string; upgrade: boolean } {
    const e = err as { response?: { status?: number; data?: { error?: string; upgradeRequired?: boolean } } };
    if (e?.response?.status === 403) {
      return { message: e.response.data?.error ?? 'Plan limit reached.', upgrade: true };
    }
    return { message: 'Failed to analyse question. Please try again.', upgrade: false };
  }

  async function handleText(text: string) {
    setIsLoading(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const question = await captureText(text, language);
      setCaptured(question);
    } catch (err) {
      const { message, upgrade } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImage(file: File) {
    setIsLoading(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const question = await captureImage(file, language);
      setCaptured(question);
    } catch (err) {
      const { message, upgrade } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
    } finally {
      setIsLoading(false);
    }
  }

  async function startSession(mode: Mode) {
    if (!captured) return;
    setStartingSession(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const session = await createSession(captured.id, mode);
      navigate(`/session/${session.id}`);
    } catch (err) {
      const { message, upgrade } = extractApiError(err);
      setError(message);
      setUpgradeRequired(upgrade);
      setStartingSession(false);
    }
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      tab === t
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Capture a Question</h1>

      {!captured ? (
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
            <div className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Parsed Question
            </h2>
            <QuestionRenderer parsedContent={captured.parsedContent} questionImageUrl={captured.imageUrl} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              How would you like to approach this question?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startSession('SELF_ATTEMPT')}
                disabled={startingSession}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                <span className="text-3xl">💪</span>
                <span className="font-medium text-sm">I'll try it myself</span>
                <span className="text-xs text-gray-500 text-center">Attempt then get reviewed</span>
              </button>
              <button
                onClick={() => startSession('DIRECT_EXPLANATION')}
                disabled={startingSession}
                className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                <span className="text-3xl">🎓</span>
                <span className="font-medium text-sm">Explain it to me</span>
                <span className="text-xs text-gray-500 text-center">Step-by-step explanation</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setCaptured(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Capture a different question
          </button>
        </div>
      )}
    </div>
  );
}
