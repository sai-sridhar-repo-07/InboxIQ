import useSWR, { SWRConfiguration } from 'swr';
import {
  emailsApi,
  actionsApi,
  repliesApi,
  integrationsApi,
  settingsApi,
  billingApi,
} from './api';
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
} from './types';

const defaultOptions: SWRConfiguration = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};

// ─── Email Hooks ──────────────────────────────────────────────────────────────

export function useEmails(filters: EmailFilters = {}, options?: SWRConfiguration) {
  const key = ['emails', JSON.stringify(filters)];
  return useSWR<PaginatedResponse<Email>>(
    key,
    () => emailsApi.getEmails(filters),
    { ...defaultOptions, ...options }
  );
}

export function useEmail(id: string | null | undefined, options?: SWRConfiguration) {
  return useSWR<Email>(
    id ? ['email', id] : null,
    () => emailsApi.getEmail(id!),
    { ...defaultOptions, ...options }
  );
}

export function useEmailStats(options?: SWRConfiguration) {
  return useSWR<EmailStats>(
    'email-stats',
    () => emailsApi.getEmailStats(),
    { ...defaultOptions, refreshInterval: 60000, ...options }
  );
}

export function usePriorityInbox(options?: SWRConfiguration) {
  return useSWR<PriorityInbox>(
    'priority-inbox',
    () => emailsApi.getPriorityInbox(),
    { ...defaultOptions, refreshInterval: 30000, ...options }
  );
}

// ─── Actions Hooks ────────────────────────────────────────────────────────────

export function useActions(filters: ActionFilters = {}, options?: SWRConfiguration) {
  const key = ['actions', JSON.stringify(filters)];
  return useSWR<Action[]>(
    key,
    () => actionsApi.getActions(filters),
    { ...defaultOptions, ...options }
  );
}

export function useEmailActions(emailId: string | null | undefined, options?: SWRConfiguration) {
  return useSWR<Action[]>(
    emailId ? ['email-actions', emailId] : null,
    () => actionsApi.getEmailActions(emailId!),
    { ...defaultOptions, ...options }
  );
}

// ─── Reply Hooks ──────────────────────────────────────────────────────────────

export function useReplyDraft(emailId: string | null | undefined, options?: SWRConfiguration) {
  return useSWR<ReplyDraft>(
    emailId ? ['reply-draft', emailId] : null,
    () => repliesApi.getReplyDraft(emailId!),
    { ...defaultOptions, ...options }
  );
}

// ─── Settings Hooks ───────────────────────────────────────────────────────────

export function useSettings(options?: SWRConfiguration) {
  return useSWR<UserSettings>(
    'settings',
    () => settingsApi.getSettings(),
    { ...defaultOptions, ...options }
  );
}

// ─── Billing Hooks ────────────────────────────────────────────────────────────

export function useBillingStatus(options?: SWRConfiguration) {
  return useSWR<BillingStatus>(
    'billing-status',
    () => billingApi.getBillingStatus(),
    { ...defaultOptions, refreshInterval: 300000, ...options }
  );
}

// ─── Integration Hooks ────────────────────────────────────────────────────────

export function useGmailStatus(options?: SWRConfiguration) {
  return useSWR<GmailStatus>(
    'gmail-status',
    () => integrationsApi.getGmailStatus(),
    { ...defaultOptions, refreshInterval: 60000, ...options }
  );
}
