import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import CaptureQuestion from '@/pages/CaptureQuestion';
import SessionView from '@/pages/SessionView';
import History from '@/pages/History';
import SubjectSessions from '@/pages/SubjectSessions';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AuthCallback from '@/pages/AuthCallback';
import PricingPage from '@/pages/PricingPage';
import BillingPage from '@/pages/BillingPage';
import Layout from '@/components/shared/Layout';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/capture" element={<CaptureQuestion />} />
            <Route path="/session/:id" element={<SessionView />} />
            <Route path="/history" element={<History />} />
            <Route path="/subject/:subject" element={<SubjectSessions />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
