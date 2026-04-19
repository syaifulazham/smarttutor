import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '@/services/api';

interface Session {
  id: string;
  mode: string;
  completed: boolean;
  score?: number;
  question?: { subject?: string; difficulty?: string; title?: string };
  createdAt: string;
}

export default function SubjectSessions() {
  const { subject } = useParams<{ subject: string }>();
  const decodedSubject = decodeURIComponent(subject ?? '');

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  });

  const sessions: Session[] = allSessions.filter(
    (s: Session) => s.question?.subject === decodedSubject
  );

  const completed = sessions.filter(s => s.completed).length;
  const inProgress = sessions.length - completed;

  if (isLoading) return <div className="text-center text-gray-400 py-16">Loading...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{decodedSubject}</h1>
          <p className="text-sm text-gray-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''} · {completed} done · {inProgress} in progress</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          No sessions for this subject yet.{' '}
          <Link to="/capture" className="text-primary-600 hover:underline">Capture a question!</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/session/${s.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:border-primary-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {s.question?.title ?? s.question?.subject ?? 'Question'}
                  </p>
                  {s.question?.difficulty && (
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                      s.question.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      s.question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {s.question.difficulty}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.mode === 'SELF_ATTEMPT' ? 'Self Attempt' : 'Explanation'}
                  {' · '}{new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.score != null && (
                  <span className="text-xs font-semibold text-primary-600">{s.score}/100</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.completed ? 'Done' : 'In Progress'}
                </span>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
