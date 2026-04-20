import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSessions, deleteSession, exportSessionsPdf } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import InlineMath from '@/components/shared/InlineMath';

interface Session {
  id: string;
  mode: string;
  completed: boolean;
  score?: number;
  question?: { subject?: string; difficulty?: string; title?: string };
  createdAt: string;
}

export default function History() {
  const queryClient = useQueryClient();
  const planTier = useAuthStore((s) => s.user?.planTier ?? 'FREE');

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setConfirmId(null);
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set((sessions as Session[]).map((s) => s.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setExportError(null);
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportSessionsPdf(Array.from(selected));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcher-ayu-sessions-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      exitSelectMode();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setExportError(e?.response?.data?.error ?? 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const canExport = planTier === 'CERDAS' || planTier === 'CEMERLANG';

  if (isLoading) return <div className="text-center text-gray-400 py-16">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {selected.size === sessions.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={selected.size === 0 || exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting ? (
                    <>
                      <span className="animate-spin text-xs">⏳</span>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Export PDF {selected.size > 0 && `(${selected.size})`}
                    </>
                  )}
                </button>
                <button
                  onClick={exitSelectMode}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : canExport ? (
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Export PDF
              </button>
            ) : (
              <Link
                to="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Upgrade to export PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Export PDF
              </Link>
            )}
          </div>
        )}
      </div>

      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {exportError}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No sessions yet.{' '}
          <Link to="/capture" className="text-primary-600 hover:underline">Start one!</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions as Session[]).map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border shadow-sm transition-colors ${
                selectMode && selected.has(s.id)
                  ? 'border-primary-400 ring-1 ring-primary-300'
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              {confirmId === s.id ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-700">Delete this session?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3">
                  {/* Checkbox in select mode */}
                  {selectMode && (
                    <button
                      onClick={() => toggleSelect(s.id)}
                      className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: selected.has(s.id) ? '#4f46e5' : '#d1d5db',
                        backgroundColor: selected.has(s.id) ? '#4f46e5' : 'white',
                      }}
                    >
                      {selected.has(s.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Clickable session info */}
                  {selectMode ? (
                    <button className="flex-1 min-w-0 text-left" onClick={() => toggleSelect(s.id)}>
                      <SessionInfo s={s} />
                    </button>
                  ) : (
                    <Link to={`/session/${s.id}`} className="flex-1 min-w-0">
                      <SessionInfo s={s} />
                    </Link>
                  )}

                  {/* Delete button — hidden in select mode */}
                  {!selectMode && (
                    <button
                      onClick={() => setConfirmId(s.id)}
                      title="Delete session"
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionInfo({ s }: { s: Session }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          <InlineMath text={s.question?.title ?? s.question?.subject ?? 'Unknown Question'} />
        </p>
        <p className="text-xs text-gray-400 truncate">
          {s.question?.subject ?? ''}
          <span className="ml-1">{s.mode === 'SELF_ATTEMPT' ? '· Self Attempt' : '· Explanation'}</span>
          <span className="ml-1">· {new Date(s.createdAt).toLocaleString()}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {s.score != null && (
          <span className="text-xs font-semibold text-primary-600">{s.score}/100</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          s.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {s.completed ? 'Done' : 'In Progress'}
        </span>
      </div>
    </div>
  );
}
