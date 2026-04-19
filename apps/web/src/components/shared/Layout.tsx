import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useLanguageStore, LANGUAGE_LABELS, Language } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';

const LANGUAGES: Language[] = ['en', 'ms', 'zh'];

export default function Layout() {
  const { language, setLanguage } = useLanguageStore();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-primary-600 text-lg">Tcher Ayu</span>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              <NavLink to="/dashboard" end className={linkClass}>Dashboard</NavLink>
              <NavLink to="/capture" className={linkClass}>Capture</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>
            </nav>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    language === lang
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title={LANGUAGE_LABELS[lang]}
                >
                  {lang === 'en' ? 'EN' : lang === 'ms' ? 'MS' : '中文'}
                </button>
              ))}
            </div>
            {/* User menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                  {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-600 font-medium max-w-24 truncate hidden sm:block">
                {user?.name ?? user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
