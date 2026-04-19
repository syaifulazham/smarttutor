import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSessions, deleteSession } from '@/services/api';

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
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  if (isLoading) return <div className="text-center text-gray-400 py-16">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">History</h1>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No sessions yet.{' '}
          <Link to="/capture" className="text-primary-600 hover:underline">Start one!</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: Session) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-primary-300 transition-colors"
            >
              {confirmId === s.id ? (
                // Inline confirmation row
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
                  {/* Clickable session info */}
                  <Link to={`/session/${s.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {s.question?.title ?? s.question?.subject ?? 'Unknown Question'}
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
                  </Link>

                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmId(s.id)}
                    title="Delete session"
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
