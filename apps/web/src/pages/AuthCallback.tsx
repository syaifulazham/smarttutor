import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getMe } from '@/services/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login?error=oauth');
      return;
    }

    // Temporarily store token so getMe() can use it
    useAuthStore.setState({ token });

    getMe()
      .then((user) => {
        setAuth(token, user);
        navigate('/dashboard');
      })
      .catch(() => {
        navigate('/login?error=oauth');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Signing you in…
    </div>
  );
}
