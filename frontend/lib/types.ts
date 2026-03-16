// ─── Email Types ────────────────────────────────────────────────────────────

export type EmailCategory =
  | 'urgent'
  | 'needs_response'
  | 'follow_up'
  | 'fyi'
  | 'newsletter'
  | 'spam'
  | 'other';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface AIAnalysis {
  category: EmailCategory;
  priority_score: number; // 1-10
  priority_level: PriorityLevel;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-1
  key_topics: string[];
  action_required: boolean;
  processed_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string;
  from_email: string;
  from_name: string;
  to_email: string;
  snippet: string;
  body_text: string;
  body_html?: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  snooze_until?: string | null;
  labels: string[];
  ai_analysis?: AIAnalysis;
  action_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailStats {
  total_emails: number;
  urgent_count: number;
  needs_response_count: number;
  action_items_count: number;
  processed_today: number;
  avg_priority_score: number;
  category_breakdown: Record<EmailCategory, number>;
  emails_this_week: number;
  emails_last_week: number;
}

export interface PriorityInbox {
  urgent: Email[];
  needs_response: Email[];
  follow_up: Email[];
  low_priority: Email[];
}

// ─── Action Types ────────────────────────────────────────────────────────────

export type ActionStatus = 'pending' | 'completed' | 'dismissed';
export type ActionPriority = 'high' | 'medium' | 'low';

export interface Action {
  id: string;
  user_id?: string;
  email_id?: string;
  email?: Email;
  emails?: { subject?: string; user_id?: string };
  // Backend uses 'task'; frontend legacy used 'description'
  task: string;
  description?: string;
  action_type?: 'reply' | 'task' | 'meeting' | 'payment' | 'review' | 'other';
  priority: ActionPriority;
  status: ActionStatus;
  deadline?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

// ─── Reply Types ─────────────────────────────────────────────────────────────

export interface ReplyDraft {
  id: string;
  user_id: string;
  email_id: string;
  draft_content: string;
  tone: 'professional' | 'friendly' | 'concise';
  confidence_score: number; // 0-1
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── User / Profile Types ─────────────────────────────────────────────────────

export type TonePreference = 'professional' | 'friendly' | 'concise';
export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'never';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  company_name?: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  company_description: string;
  tone_preference: TonePreference;
  email_notifications: boolean;
  slack_notifications: boolean;
  notification_frequency: NotificationFrequency;
  auto_process_emails: boolean;
  priority_threshold: number; // 1-10, emails above this are "urgent"
  slack_webhook_url?: string;
  vacation_mode?: boolean;
  vacation_message?: string;
  created_at: string;
  updated_at: string;
}

// ─── Integration Types ────────────────────────────────────────────────────────

export interface GmailStatus {
  connected: boolean;
  email?: string;
  last_sync?: string;
  total_synced?: number;
  auth_url?: string;
}

export interface SlackStatus {
  connected: boolean;
  webhook_url?: string;
  channel?: string;
  last_notified?: string;
}

export interface IntegrationStatus {
  gmail: GmailStatus;
  slack: SlackStatus;
}

// ─── Billing / Plan Types ─────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'agency';

export interface Plan {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  email_limit: number | null; // null = unlimited
  gmail_accounts: number;
  features: string[];
  stripe_price_id?: string;
}

export interface BillingStatus {
  current_plan: PlanId;
  plan_details: Plan;
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  emails_used_this_month: number;
  email_limit: number | null;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ApiError {
  detail: string;
  code?: string;
}

// ─── Filter / Query Types ─────────────────────────────────────────────────────

export interface EmailFilters {
  category?: EmailCategory;
  priority_level?: PriorityLevel;
  is_read?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'received_at' | 'priority_score';
  sort_order?: 'asc' | 'desc';
}

export interface ActionFilters {
  status?: ActionStatus;
  priority?: ActionPriority;
  email_id?: string;
}

// ─── CRM Types ────────────────────────────────────────────────────────────────

export interface ContactProfile {
  email: string;
  name: string;
  total_emails: number;
  last_email_at: string;
  categories: Record<string, number>;
  top_category: string;
  avg_priority: number;
  recent_subjects: string[];
}

export interface ContactDetail extends ContactProfile {
  replied_count: number;
  first_email_at: string;
  emails: Array<{
    id: string;
    subject: string;
    category: string | null;
    priority: number | null;
    received_at: string;
    ai_summary: string | null;
    is_read: boolean;
  }>;
}

// ─── Quote / Proposal Types ───────────────────────────────────────────────────

export interface QuoteData {
  project_title: string;
  project_description: string;
  deliverables: string[];
  timeline: string;
  price_estimate: string;
  payment_terms: string;
  validity: string;
  notes?: string;
}

// ─── Meeting Detection Types ──────────────────────────────────────────────────

export interface MeetingInfo {
  is_meeting_request: boolean;
  meeting_type: string | null;
  proposed_times: string[];
  duration_hint: string | null;
  agenda: string | null;
  suggested_reply_snippet: string | null;
}
