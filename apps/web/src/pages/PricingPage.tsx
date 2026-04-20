import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { createCheckoutSession } from '@/services/api';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 'RM 0',
    period: '',
    tagline: 'Get started, no card needed',
    color: 'border-gray-200',
    badge: null,
    features: [
      '5 question captures / month',
      'Text input only',
      'English only',
      '3 tutor sessions / month',
      '7-day history',
    ],
    locked: [
      'Image capture',
      'Bahasa Melayu & Mandarin',
      'Marking scheme',
      'All tutor avatars',
    ],
    cta: 'Get started free',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    tier: null,
  },
  {
    key: 'CERDAS',
    name: 'Cerdas',
    price: 'RM 9.90',
    period: '/ month',
    tagline: 'For students who mean business',
    color: 'border-primary-500',
    badge: 'Popular',
    features: [
      '30 question captures / month',
      'Text & image capture',
      'English, Bahasa Melayu, Mandarin',
      'Unlimited tutor sessions',
      'Marking scheme',
      '90-day history',
      'All 6 tutor avatars',
    ],
    locked: ['Regenerate marking scheme', 'Priority AI', 'Voice & PDF (Phase 2)'],
    cta: 'Subscribe — RM 9.90 / mo',
    ctaStyle: 'bg-primary-600 text-white hover:bg-primary-700',
    tier: 'CERDAS',
  },
  {
    key: 'CEMERLANG',
    name: 'Cemerlang',
    price: 'RM 19.90',
    period: '/ month',
    tagline: 'For students chasing excellence',
    color: 'border-violet-500',
    badge: 'Best value',
    features: [
      'Unlimited question captures',
      'Text & image capture',
      'English, Bahasa Melayu, Mandarin',
      'Unlimited tutor sessions',
      'Marking scheme + regenerate',
      'Unlimited history',
      'All 6 tutor avatars',
      'Priority AI response',
      'Voice explanations (Phase 2)',
      'PDF export (Phase 2)',
    ],
    locked: [],
    cta: 'Subscribe — RM 19.90 / mo',
    ctaStyle: 'bg-violet-600 text-white hover:bg-violet-700',
    tier: 'CEMERLANG',
  },
];

export default function PricingPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get('cancelled') === '1';

  async function subscribe(tier: string) {
    if (!user) return;
    setLoading(tier);
    try {
      const { url } = await createCheckoutSession(tier as 'CERDAS' | 'CEMERLANG');
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Tcher Ayu" className="h-11 w-auto" />
          <span className="text-2xl text-gray-900 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16 pb-32">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Simple, honest pricing</h1>
          <p className="text-gray-500 text-lg">Less than one tutoring session a month. Cancel anytime.</p>
          {cancelled && (
            <div className="mt-4 inline-block px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Checkout was cancelled — your plan has not changed.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative bg-white rounded-2xl border-2 ${plan.color} p-6 shadow-sm flex flex-col`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary-600 text-white">
                  {plan.badge}
                </span>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                <p className="text-xs text-gray-400 mb-3">{plan.tagline}</p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-400 mb-1">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.locked.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {!user ? (
                <Link
                  to="/register"
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${plan.ctaStyle}`}
                >
                  {plan.key === 'FREE' ? 'Get started free' : 'Sign up to subscribe'}
                </Link>
              ) : plan.tier ? (
                <button
                  onClick={() => subscribe(plan.tier!)}
                  disabled={loading === plan.tier}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${plan.ctaStyle}`}
                >
                  {loading === plan.tier ? 'Redirecting…' : plan.cta}
                </button>
              ) : (
                <Link
                  to="/dashboard"
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${plan.ctaStyle}`}
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Prices in Malaysian Ringgit (MYR) · Billed monthly · Cancel anytime from your billing dashboard
        </p>
      </main>
    </div>
  );
}
