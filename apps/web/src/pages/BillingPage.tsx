import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBillingStatus, openCustomerPortal } from '@/services/api';

interface BillingStatus {
  plan: 'FREE' | 'CERDAS' | 'CEMERLANG';
  capturesUsed: number;
  sessionsUsed: number;
  billingCycleStart: string;
  hasSubscription: boolean;
  limits: {
    capturesPerMonth: number;
    sessionsPerMonth: number;
    imageCapture: boolean;
    markingScheme: boolean;
    regenerateScheme: boolean;
    historyDays: number;
    avatars: boolean;
    languages: string[];
  };
}

const PLAN_LABELS: Record<string, string> = { FREE: 'Free', CERDAS: 'Cerdas', CEMERLANG: 'Cemerlang' };
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  CERDAS: 'bg-primary-100 text-primary-700',
  CEMERLANG: 'bg-violet-100 text-violet-700',
};

function UsageBar({ used, max, label }: { used: number; max: number | null; label: string }) {
  const unlimited = max === null || max === Infinity || max > 9999;
  const pct = unlimited ? 0 : Math.min(100, (used / max!) * 100);
  const nearLimit = !unlimited && pct >= 80;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{unlimited ? `${used} used (unlimited)` : `${used} / ${max}`}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {unlimited ? (
          <div className="h-2 bg-green-400 rounded-full w-full opacity-30" />
        ) : (
          <div
            className={`h-2 rounded-full transition-all ${nearLimit ? 'bg-amber-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === '1';

  useEffect(() => {
    getBillingStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await openCustomerPortal();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  const cycleStart = status ? new Date(status.billingCycleStart).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '';

  const nextReset = status ? new Date(
    new Date(status.billingCycleStart).getTime() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <Link to="/pricing" className="text-sm text-primary-600 hover:underline">View all plans</Link>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          Subscription activated! Your plan has been upgraded.
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Loading billing info…
        </div>
      )}

      {status && (
        <>
          {/* Current plan card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Current plan</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${PLAN_COLORS[status.plan]}`}>
                    {PLAN_LABELS[status.plan]}
                  </span>
                </div>
              </div>
              {status.hasSubscription ? (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {portalLoading ? 'Redirecting…' : 'Manage subscription'}
                </button>
              ) : (
                <Link
                  to="/pricing"
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Upgrade plan
                </Link>
              )}
            </div>

            <div className="text-xs text-gray-400">
              Billing cycle started {cycleStart} · Resets on {nextReset}
            </div>
          </div>

          {/* Usage */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">This month's usage</h2>
            <UsageBar
              used={status.capturesUsed}
              max={status.limits.capturesPerMonth > 9999 ? null : status.limits.capturesPerMonth}
              label="Question captures"
            />
            <UsageBar
              used={status.sessionsUsed}
              max={status.limits.sessionsPerMonth > 9999 ? null : status.limits.sessionsPerMonth}
              label="Tutor sessions"
            />
          </div>

          {/* Plan features */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Your plan includes</h2>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Image capture', on: status.limits.imageCapture },
                { label: 'Bahasa Melayu & Mandarin', on: status.limits.languages.includes('ms') },
                { label: 'Marking scheme', on: status.limits.markingScheme },
                { label: 'Regenerate marking scheme', on: status.limits.regenerateScheme },
                { label: 'All tutor avatars', on: status.limits.avatars },
                { label: `History (${status.limits.historyDays > 9999 ? 'unlimited' : `${status.limits.historyDays} days`})`, on: true },
              ].map(({ label, on }) => (
                <li key={label} className={`flex items-center gap-2 ${on ? 'text-gray-700' : 'text-gray-300'}`}>
                  {on ? (
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
