import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach JWT from auth store on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function register(email: string, password: string, name?: string) {
  const { data } = await api.post('/auth/register', { email, password, name });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function verifyEmail(token: string) {
  const { data } = await api.get('/auth/verify-email', { params: { token } });
  return data;
}

export async function resendVerification(email: string) {
  const { data } = await api.post('/auth/resend-verification', { email });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

// ─── Capture ─────────────────────────────────────────────────────────────────
export async function captureText(text: string, language = 'en') {
  const { data } = await api.post('/capture/text', { text, language });
  return data;
}

export async function captureImage(file: File, language = 'en') {
  const form = new FormData();
  form.append('image', file);
  form.append('language', language);
  const { data } = await api.post('/capture/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ─── Questions ────────────────────────────────────────────────────────────────
export async function getQuestions(page = 1) {
  const { data } = await api.get('/questions', { params: { page } });
  return data;
}

export async function getQuestion(id: string) {
  const { data } = await api.get(`/questions/${id}`);
  return data;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function createSession(questionId: string, mode: 'SELF_ATTEMPT' | 'DIRECT_EXPLANATION') {
  const { data } = await api.post('/sessions', { questionId, mode });
  return data;
}

export async function getSessions() {
  const { data } = await api.get('/sessions');
  return data;
}

export async function getSession(id: string) {
  const { data } = await api.get(`/sessions/${id}`);
  return data;
}

export async function submitAnswer(sessionId: string, answer: string) {
  const { data } = await api.post(`/sessions/${sessionId}/submit`, { answer });
  return data;
}

export async function completeSession(sessionId: string) {
  const { data } = await api.post(`/sessions/${sessionId}/complete`);
  return data;
}

export async function saveSessionNotes(sessionId: string, notes: string) {
  const { data } = await api.patch(`/sessions/${sessionId}/notes`, { notes });
  return data as { notes: string };
}

export async function deleteSession(sessionId: string) {
  const { data } = await api.delete(`/sessions/${sessionId}`);
  return data;
}

// ─── Billing ──────────────────────────────────────────────────────────────────
export async function getBillingPlans() {
  const { data } = await api.get('/billing/plans');
  return data;
}

export async function getBillingStatus() {
  const { data } = await api.get('/billing/status');
  return data;
}

export async function createCheckoutSession(tier: 'CERDAS' | 'CEMERLANG') {
  const { data } = await api.post('/billing/checkout', { tier });
  return data as { url: string };
}

export async function openCustomerPortal() {
  const { data } = await api.post('/billing/portal');
  return data as { url: string };
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function exportSessionsPdf(sessionIds: string[]): Promise<Blob> {
  const response = await api.post('/export/pdf', { sessionIds }, { responseType: 'blob' });
  return response.data as Blob;
}
