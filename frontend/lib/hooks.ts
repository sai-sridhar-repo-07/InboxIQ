import useSWR, { SWRConfiguration } from 'swr';
import { useSessionContext } from '@supabase/auth-helpers-react';
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

// Returns null (suspends SWR) until the session is confirmed loaded.
// This prevents unauthenticated API calls that would fail with 401.
function useReadyKey(key: unknown) {
  const { isLoading, session } = useSessionContext();
  if (isLoading || !session) return null;
  return key;
}

// ─── Email Hooks ──────────────────────────────────────────────────────────────

export function useEmails(filters: EmailFilters = {}, options?: SWRConfiguration) {
  const key = useReadyKey(['emails', JSON.stringify(filters)]);
  return useSWR<PaginatedResponse<Email>>(
    key,
    () => emailsApi.getEmails(filters),
    { ...defaultOptions, ...options }
  );
}

export function useEmail(id: string | null | undefined, options?: SWRConfiguration) {
  const key = useReadyKey(id ? ['email', id] : null);
  return useSWR<Email>(
    key,
    () => emailsApi.getEmail(id!),
    { ...defaultOptions, ...options }
  );
}

export function useEmailStats(options?: SWRConfiguration) {
  const key = useReadyKey('email-stats');
  return useSWR<EmailStats>(
    key,
    () => emailsApi.getEmailStats(),
    { ...defaultOptions, refreshInterval: 60000, ...options }
  );
}

export function usePriorityInbox(options?: SWRConfiguration) {
  const key = useReadyKey('priority-inbox');
  return useSWR<PriorityInbox>(
    key,
    () => emailsApi.getPriorityInbox(),
    { ...defaultOptions, refreshInterval: 30000, ...options }
  );
}

// ─── Actions Hooks ────────────────────────────────────────────────────────────

export function useActions(filters: ActionFilters = {}, options?: SWRConfiguration) {
  const key = useReadyKey(['actions', JSON.stringify(filters)]);
  return useSWR<Action[]>(
    key,
    () => actionsApi.getActions(filters),
    { ...defaultOptions, ...options }
  );
}

export function useEmailActions(emailId: string | null | undefined, options?: SWRConfiguration) {
  const key = useReadyKey(emailId ? ['email-actions', emailId] : null);
  return useSWR<Action[]>(
    key,
    () => actionsApi.getEmailActions(emailId!),
    { ...defaultOptions, ...options }
  );
}

// ─── Reply Hooks ──────────────────────────────────────────────────────────────

export function useReplyDraft(emailId: string | null | undefined, options?: SWRConfiguration) {
  const key = useReadyKey(emailId ? ['reply-draft', emailId] : null);
  return useSWR<ReplyDraft>(
    key,
    () => repliesApi.getReplyDraft(emailId!),
    { ...defaultOptions, ...options }
  );
}

// ─── Settings Hooks ───────────────────────────────────────────────────────────

export function useSettings(options?: SWRConfiguration) {
  const key = useReadyKey('settings');
  return useSWR<UserSettings>(
    key,
    () => settingsApi.getSettings(),
    { ...defaultOptions, ...options }
  );
}

// ─── Billing Hooks ────────────────────────────────────────────────────────────

export function useBillingStatus(options?: SWRConfiguration) {
  const key = useReadyKey('billing-status');
  return useSWR<BillingStatus>(
    key,
    () => billingApi.getBillingStatus(),
    { ...defaultOptions, refreshInterval: 300000, ...options }
  );
}

// ─── Integration Hooks ────────────────────────────────────────────────────────

export function useGmailStatus(options?: SWRConfiguration) {
  const key = useReadyKey('gmail-status');
  return useSWR<GmailStatus>(
    key,
    () => integrationsApi.getGmailStatus(),
    { ...defaultOptions, refreshInterval: 60000, ...options }
  );
}
