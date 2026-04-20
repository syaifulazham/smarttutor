import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Tcher Ayu" className="h-11 w-auto" />
          <span className="text-2xl text-gray-900 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
              <Link to="/register" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-6">
          AI-Powered Learning
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Snap a question.<br />
          <span className="text-primary-600">Get a tutor.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          Upload any exam question — text or image — and our AI tutor walks you through step-by-step explanations, adapts to your pace, and speaks in your language.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold text-base hover:bg-primary-700 transition-colors shadow-sm">
            Start for free
          </Link>
          <Link to="/login" className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-base hover:border-gray-400 hover:bg-gray-50 transition-colors">
            Sign in
          </Link>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: 'Capture any question',
              desc: 'Snap a photo, paste text, or type directly. AI extracts and structures the question automatically.',
              avatar: '/avatars/ayu.png',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
              title: 'Step-by-step AI tutor',
              desc: 'Get guided, animated explanations broken into digestible steps — not a wall of text.',
              avatar: '/avatars/sara.png',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              ),
              title: 'Multilingual voice',
              desc: 'Switch between English, Malay, and Mandarin. Hear explanations read aloud in your language.',
              avatar: '/avatars/rajan.png',
            },
          ].map(({ icon, title, desc, avatar }) => (
            <div key={title} className="relative bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Avatar watermark */}
              <img
                src={avatar}
                alt=""
                aria-hidden
                className="absolute -bottom-4 -right-4 w-32 h-32 object-contain opacity-10 pointer-events-none select-none"
              />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
