import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguageStore, LANGUAGE_LABELS, Language } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { getMe } from '@/services/api';

const LANGUAGES: Language[] = ['en', 'ms', 'zh'];

export default function Layout() {
  const { language, setLanguage } = useLanguageStore();
  const { user, setUser, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-sm font-medium transition-colors border-b border-gray-100 ${
      isActive
        ? 'text-primary-600 bg-primary-50'
        : 'text-gray-700 hover:bg-gray-50'
    }`;

  function handleLogout() {
    clearAuth();
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Tcher Ayu" className="h-11 w-auto" />
            <div className="flex flex-col leading-none">
              <span className="text-2xl text-gray-900 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
              {user?.planTier && (
                <span className={`text-[10px] font-semibold tracking-widest uppercase -mt-0.5 ${
                  user.planTier === 'CEMERLANG' ? 'text-violet-500' :
                  user.planTier === 'CERDAS' ? 'text-primary-500' :
                  'text-gray-400'
                }`}>
                  {user.planTier === 'CEMERLANG' ? 'Cemerlang' :
                   user.planTier === 'CERDAS' ? 'Cerdas' : 'Free'}
                </span>
              )}
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex gap-1">
              <NavLink to="/dashboard" end className={linkClass}>Dashboard</NavLink>
              <NavLink to="/capture" className={linkClass}>Capture</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>
              <NavLink to="/billing" className={linkClass}>Billing</NavLink>
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
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                  {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-600 font-medium max-w-24 truncate">
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

          {/* Mobile: user avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <nav>
              <NavLink to="/dashboard" end className={mobileLinkClass}>Dashboard</NavLink>
              <NavLink to="/capture" className={mobileLinkClass}>Capture</NavLink>
              <NavLink to="/history" className={mobileLinkClass}>History</NavLink>
              <NavLink to="/billing" className={mobileLinkClass}>Billing</NavLink>
            </nav>
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Language</span>
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
                  >
                    {lang === 'en' ? 'EN' : lang === 'ms' ? 'MS' : '中文'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
