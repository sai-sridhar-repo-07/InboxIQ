import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { supabase } from './supabase';
import type {
  Email,
  EmailStats,
  PriorityInbox,
  Action,
  ReplyDraft,
  UserSettings,
  GmailStatus,
  BillingStatus,
  PaginatedResponse,
  EmailFilters,
  ActionFilters,
  ActionStatus,
  ContactProfile,
  ContactDetail,
  QuoteData,
  MeetingInfo,
} from './types';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: inject Supabase auth token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Email Endpoints ──────────────────────────────────────────────────────────

export const emailsApi = {
  getEmails: async (filters: EmailFilters = {}): Promise<PaginatedResponse<Email>> => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.priority_level) params.set('priority_level', filters.priority_level);
    if (filters.is_read !== undefined) params.set('is_read', String(filters.is_read));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.page_size) params.set('page_size', String(filters.page_size));
    if (filters.sort_by) params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params.set('sort_order', filters.sort_order);
    const { data } = await api.get(`/api/emails?${params.toString()}`);
    return data;
  },

  getEmail: async (id: string): Promise<Email> => {
    const { data } = await api.get(`/api/emails/${id}`);
    return data;
  },

  getEmailStats: async (): Promise<EmailStats> => {
    const { data } = await api.get('/api/emails/stats');
    return data;
  },

  getPriorityInbox: async (): Promise<PriorityInbox> => {
    const { data } = await api.get('/api/emails/priority-inbox');
    return data;
  },

  processEmail: async (id: string): Promise<Email> => {
    const { data } = await api.post(`/api/emails/${id}/process`);
    return data;
  },

  deleteEmail: async (id: string): Promise<void> => {
    await api.delete(`/api/emails/${id}`);
  },

  syncEmails: async (): Promise<void> => {
    await api.post('/api/emails/sync');
  },

  bulkProcess: async (): Promise<{ count: number }> => {
    const { data } = await api.post('/api/emails/bulk-process');
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/api/emails/${id}/read`);
  },

  getAnalytics: async (): Promise<{
    total_emails: number;
    processed_emails: number;
    unread_emails: number;
    processing_rate: number;
    by_category: Record<string, number>;
    by_priority: Record<string, number>;
    emails_per_day: Array<{ day: string; count: number }>;
  }> => {
    const { data } = await api.get('/api/emails/analytics');
    return data;
  },

  generateReply: async (id: string, instructions: string): Promise<{ draft_content: string; confidence_score: number }> => {
    const { data } = await api.post(`/api/emails/${id}/generate-reply`, { instructions });
    return data;
  },

  getAttachments: async (id: string): Promise<Array<{ attachment_id: string; message_id: string; filename: string; mime_type: string; size: number }>> => {
    const { data } = await api.get(`/api/emails/${id}/attachments`);
    return data;
  },

  getAttachmentDownloadUrl: (id: string, attachmentId: string, filename: string, mimeType: string): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${base}/api/emails/${id}/attachments/${attachmentId}/download?filename=${encodeURIComponent(filename)}&mime_type=${encodeURIComponent(mimeType)}`;
  },

  starEmail: async (id: string, starred: boolean): Promise<void> => {
    await api.patch(`/api/emails/${id}/star`, { starred });
  },

  snoozeEmail: async (id: string, snoozeUntil: string | null): Promise<void> => {
    await api.patch(`/api/emails/${id}/snooze`, { snooze_until: snoozeUntil });
  },

  getSnoozed: async (): Promise<Email[]> => {
    const { data } = await api.get('/api/emails/snoozed');
    return data;
  },

  inboxZero: async (): Promise<{ dismissed: number; message: string }> => {
    const { data } = await api.post('/api/emails/inbox-zero');
    return data;
  },

  bulkSummarize: async (ids: string[]): Promise<Array<{ id: string; summary: string }>> => {
    const { data } = await api.post('/api/emails/bulk-summarize', { email_ids: ids });
    return data;
  },

  bulkDismiss: async (ids: string[]): Promise<{ dismissed: number }> => {
    const { data } = await api.post('/api/emails/bulk-dismiss', { email_ids: ids });
    return data;
  },

  bulkMarkRead: async (ids: string[]): Promise<{ updated: number }> => {
    const { data } = await api.post('/api/emails/bulk-read', { email_ids: ids });
    return data;
  },

  getFollowUps: async (): Promise<Email[]> => {
    const { data } = await api.get('/api/emails/follow-ups');
    return data;
  },

  getSenderInsights: async (): Promise<Array<{
    sender_email: string;
    sender_name: string;
    count: number;
    last_email_at: string;
    categories: Record<string, number>;
  }>> => {
    const { data } = await api.get('/api/emails/sender-insights');
    return data;
  },

  getResponseTimeAnalytics: async (): Promise<{
    overall_avg_hours: number;
    by_category: Record<string, number>;
    daily_trend: Array<{ day: string; avg_hours: number }>;
    total_replied: number;
  }> => {
    const { data } = await api.get('/api/emails/response-time');
    return data;
  },

  exportCSV: async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${base}/api/emails/export`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inboxiq-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  generateQuote: async (
    id: string,
    body: { project_description?: string; budget_hint?: string }
  ): Promise<{ quote: QuoteData; email_id: string }> => {
    const { data } = await api.post(`/api/emails/${id}/generate-quote`, body);
    return data;
  },

  getMeetingInfo: async (id: string): Promise<MeetingInfo> => {
    const { data } = await api.get(`/api/emails/${id}/meeting-info`);
    return data;
  },
};

// ─── Actions Endpoints ────────────────────────────────────────────────────────

export const actionsApi = {
  getActions: async (filters: ActionFilters = {}): Promise<Action[]> => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.email_id) params.set('email_id', filters.email_id);
    const { data } = await api.get(`/api/actions?${params.toString()}`);
    return data;
  },

  getEmailActions: async (emailId: string): Promise<Action[]> => {
    const { data } = await api.get(`/api/emails/${emailId}/actions`);
    return data;
  },

  updateAction: async (
    id: string,
    updates: { status?: ActionStatus; notes?: string; deadline?: string }
  ): Promise<Action> => {
    const { data } = await api.patch(`/api/actions/${id}`, updates);
    return data;
  },

  createAction: async (body: {
    task: string;
    priority?: string;
    deadline?: string;
    notes?: string;
    email_id?: string;
  }): Promise<Action> => {
    const { data } = await api.post('/api/actions', body);
    return data;
  },

  deleteAction: async (id: string): Promise<void> => {
    await api.delete(`/api/actions/${id}`);
  },
};

// ─── Replies Endpoints ────────────────────────────────────────────────────────

export const repliesApi = {
  getReplyDraft: async (emailId: string): Promise<ReplyDraft> => {
    const { data } = await api.get(`/api/emails/${emailId}/reply-draft`);
    return data;
  },

  updateReplyDraft: async (
    emailId: string,
    content: string
  ): Promise<ReplyDraft> => {
    const { data } = await api.patch(`/api/emails/${emailId}/reply-draft`, {
      draft_content: content,
    });
    return data;
  },

  sendReply: async (emailId: string, content: string): Promise<{ success: boolean; message_id?: string }> => {
    const { data } = await api.post(`/api/emails/${emailId}/send-reply`, {
      content,
    });
    return data;
  },
};

// ─── Integrations Endpoints ───────────────────────────────────────────────────

export const integrationsApi = {
  getGmailStatus: async (): Promise<GmailStatus> => {
    const { data } = await api.get('/api/integrations/gmail/status');
    // backend returns { gmail_connected } — normalise to { connected }
    return { connected: data.gmail_connected, email: data.gmail_address, last_sync: data.last_sync, total_synced: data.total_synced };
  },

  connectGmail: async (): Promise<{ auth_url: string }> => {
    const { data } = await api.get('/api/integrations/gmail/connect');
    return data;
  },

  disconnectGmail: async (): Promise<void> => {
    await api.delete('/api/integrations/gmail/disconnect');
  },

  saveSlackWebhook: async (webhookUrl: string): Promise<{ success: boolean }> => {
    const { data } = await api.post('/api/integrations/slack/webhook', {
      webhook_url: webhookUrl,
    });
    return { success: true, ...data };
  },

  testSlackWebhook: async (): Promise<{ success: boolean; message?: string }> => {
    const { data } = await api.post('/api/integrations/slack/test');
    return data;
  },
};

// ─── Settings Endpoints ───────────────────────────────────────────────────────

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const { data } = await api.get('/api/settings');
    return data;
  },

  updateSettings: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    const { data } = await api.put('/api/settings', settings);
    return data;
  },
};

// ─── Billing Endpoints ────────────────────────────────────────────────────────

export const billingApi = {
  getBillingStatus: async (): Promise<BillingStatus> => {
    const { data } = await api.get('/api/billing/status');
    return data;
  },

  createCheckoutSession: async (
    planId: string,
    interval: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ checkout_url: string }> => {
    const { data } = await api.post('/api/billing/checkout', {
      plan_id: planId,
      interval,
    });
    return data;
  },

  createPortalSession: async (): Promise<{ portal_url: string }> => {
    const { data } = await api.post('/api/billing/portal');
    return data;
  },
};

// ─── Contacts (Mini CRM) Endpoints ───────────────────────────────────────────

export const contactsApi = {
  getContacts: async (search?: string): Promise<ContactProfile[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const { data } = await api.get(`/api/contacts${params}`);
    return data;
  },
  getContact: async (email: string): Promise<ContactDetail> => {
    const { data } = await api.get(`/api/contacts/${encodeURIComponent(email)}`);
    return data;
  },
};

export default api;
