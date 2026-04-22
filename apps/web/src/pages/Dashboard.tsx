import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSessions } from '@/services/api';

interface Session {
  id: string;
  mode: string;
  completed: boolean;
  score?: number;
  question?: { subject?: string; difficulty?: string; title?: string };
  createdAt: string;
}

// Subject → color palette
const SUBJECT_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  Mathematics:  { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  Physics:      { bg: 'bg-violet-50',  border: 'border-violet-200',  icon: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700' },
  Chemistry:    { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  Biology:      { bg: 'bg-green-50',   border: 'border-green-200',   icon: 'text-green-600',   badge: 'bg-green-100 text-green-700' },
  History:      { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  Geography:    { bg: 'bg-teal-50',    border: 'border-teal-200',    icon: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
  'Add Maths':  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' };

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject] ?? DEFAULT_COLOR;
}

// Subject icon paths (SVG)
function SubjectIcon({ subject, className }: { subject: string; className?: string }) {
  const cls = `w-6 h-6 ${className}`;
  if (subject.toLowerCase().includes('math')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  if (subject.toLowerCase().includes('phys')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
  if (subject.toLowerCase().includes('chem')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v11a3 3 0 006 0V3M6 21h12" />
    </svg>
  );
  if (subject.toLowerCase().includes('bio')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
  if (subject.toLowerCase().includes('hist')) return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  // Default: book icon
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  });

  const sessions: Session[] = allSessions;

  // Group sessions by subject
  const subjectMap = new Map<string, Session[]>();
  for (const s of sessions) {
    const subject = s.question?.subject ?? 'Uncategorised';
    if (!subjectMap.has(subject)) subjectMap.set(subject, []);
    subjectMap.get(subject)!.push(s);
  }
  const subjects = Array.from(subjectMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const totalCompleted = sessions.filter(s => s.completed).length;

  const q = search.trim().toLowerCase();
  const filteredSubjects = q
    ? subjects.filter(([subject]) => subject.toLowerCase().includes(q))
    : subjects;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">Dashboard</h1>
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <Link
          to="/capture"
          className="flex-shrink-0 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + Capture
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Subjects', value: subjects.length },
          { label: 'Completed', value: totalCompleted },
          { label: 'Sessions', value: sessions.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <p className="text-xl sm:text-2xl font-bold text-primary-600">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subject group cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Subjects</h2>
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No sessions yet.{' '}
            <Link to="/capture" className="text-primary-600 hover:underline">Capture your first question!</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.length === 0 ? (
              <div className="col-span-full text-sm text-gray-400 text-center py-6">No subjects matching "{search}"</div>
            ) : null}
            {filteredSubjects.map(([subject, subSessions]) => {
              const color = subjectColor(subject);
              const done = subSessions.filter(s => s.completed).length;
              const inProg = subSessions.length - done;
              const pct = subSessions.length > 0 ? Math.round((done / subSessions.length) * 100) : 0;

              return (
                <Link
                  key={subject}
                  to={`/subject/${encodeURIComponent(subject)}`}
                  className={`group rounded-2xl border ${color.bg} ${color.border} p-5 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all`}
                >
                  {/* Icon + subject name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border ${color.border}`}>
                      <SubjectIcon subject={subject} className={color.icon} />
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
                      {subSessions.length} session{subSessions.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mb-1">{subject}</h3>

                  {/* Done / In Progress */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      {done} done
                    </span>
                    {inProg > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                        {inProg} in progress
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{pct}% completed</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
