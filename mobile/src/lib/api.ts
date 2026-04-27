import axios from 'axios';
import { supabase } from './supabase';
import { API_URL } from './config';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { detail?: string } } }).response;
    if (res?.data?.detail) return res.data.detail;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const emailsApi = {
  getEmails: async (params?: { category?: string; is_read?: boolean; search?: string }) => {
    const { data } = await api.get('/api/emails', { params });
    return data;
  },
  getEmail: async (id: string) => {
    const { data } = await api.get(`/api/emails/${id}`);
    return data;
  },
  markRead: async (id: string) => {
    const { data } = await api.patch(`/api/emails/${id}/read`);
    return data;
  },
  markUnread: async (id: string) => {
    const { data } = await api.patch(`/api/emails/${id}/unread`);
    return data;
  },
  star: async (id: string) => {
    const { data } = await api.patch(`/api/emails/${id}/star`);
    return data;
  },
  archive: async (id: string) => {
    const { data } = await api.patch(`/api/emails/${id}/archive`);
    return data;
  },
  generateReply: async (id: string) => {
    const { data } = await api.post(`/api/emails/${id}/generate-reply`);
    return data;
  },
};

export const actionsApi = {
  getActions: async () => {
    const { data } = await api.get('/api/actions');
    return data;
  },
  updateAction: async (id: string, updates: Record<string, unknown>) => {
    const { data } = await api.patch(`/api/actions/${id}`, updates);
    return data;
  },
};

export default api;
