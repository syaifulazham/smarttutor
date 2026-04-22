import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@/services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error ?? 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex flex-col items-center gap-1 mb-6">
          <img src="/logo.png" alt="Tcher Ayu" className="h-20 w-auto" />
          <span className="text-2xl text-gray-900 tracking-wide" style={{ fontFamily: "'Bitcount Prop Single', sans-serif" }}>TCHER AYU</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {status === 'loading' && (
            <>
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying…</h2>
              <p className="text-sm text-gray-500">Please wait while we verify your email.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-sm text-gray-500 mb-6">Your account is now active. You can sign in and start learning.</p>
              <Link
                to="/login"
                className="inline-block w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Sign in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-sm text-gray-500 mb-6">{message || 'The link may have expired or already been used.'}</p>
              <Link
                to="/login"
                className="text-sm text-primary-600 font-medium hover:underline"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
