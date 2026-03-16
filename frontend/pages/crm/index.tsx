import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import {
  Users,
  Search,
  X,
  Mail,
  Clock,
  TrendingUp,
  MessageSquare,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import Layout from '@/components/Layout';
import { contactsApi } from '@/lib/api';
import type { ContactProfile, ContactDetail } from '@/lib/types';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const SENDER_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-teal-400 to-teal-600',
];

function avatarGradient(name: string): string {
  const code = (name.charCodeAt(0) || 0) % SENDER_GRADIENTS.length;
  return SENDER_GRADIENTS[code];
}

const CATEGORY_CONFIG: Record<string, { label: string; classes: string }> = {
  urgent: {
    label: 'Urgent',
    classes: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
  needs_response: {
    label: 'Needs Response',
    classes: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  },
  follow_up: {
    label: 'Follow Up',
    classes: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  },
  fyi: {
    label: 'FYI',
    classes: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  },
  newsletter: {
    label: 'Newsletter',
    classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  },
  spam: {
    label: 'Spam',
    classes: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  },
  other: {
    label: 'Other',
    classes: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
  },
};

function CategoryPill({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.classes)}>
      {cfg.label}
    </span>
  );
}

function priorityBarColor(avg: number): string {
  if (avg >= 7) return 'bg-red-500';
  if (avg >= 4) return 'bg-amber-500';
  return 'bg-green-500';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onClick,
}: {
  contact: ContactProfile;
  onClick: (c: ContactProfile) => void;
}) {
  const initial = (contact.name || contact.email).charAt(0).toUpperCase();
  const gradient = avatarGradient(contact.name || contact.email);
  const priorityPct = Math.min((contact.avg_priority / 10) * 100, 100);

  return (
    <button
      onClick={() => onClick(contact)}
      className="card p-4 text-left w-full hover:shadow-md transition-shadow duration-150 group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={clsx(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold text-sm',
            gradient
          )}
        >
          {initial}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
              {contact.name}
            </p>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{contact.email}</p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <CategoryPill category={contact.top_category} />
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Mail className="h-3 w-3" />
              {contact.total_emails}
            </span>
          </div>

          {/* Priority bar */}
          {contact.avg_priority > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">Avg priority</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {contact.avg_priority}/10
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all duration-700', priorityBarColor(contact.avg_priority))}
                  style={{ width: `${priorityPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            {formatDate(contact.last_email_at)}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Contact Drawer ───────────────────────────────────────────────────────────

function ContactDrawer({
  contact,
  detail,
  loading,
  onClose,
}: {
  contact: ContactProfile;
  detail: ContactDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const initial = (contact.name || contact.email).charAt(0).toUpperCase();
  const gradient = avatarGradient(contact.name || contact.email);
  const repliedPct =
    detail && detail.total_emails > 0
      ? Math.round((detail.replied_count / detail.total_emails) * 100)
      : 0;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Trap scroll on body while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white dark:bg-gray-900 shadow-2xl sm:w-[480px] animate-slide-right overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold text-sm',
                gradient
              )}
            >
              {initial}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {contact.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{contact.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
          ) : detail ? (
            <div className="p-5 space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Emails', value: detail.total_emails, icon: Mail },
                  { label: 'Replied', value: `${repliedPct}%`, icon: MessageSquare },
                  { label: 'Avg Priority', value: detail.avg_priority > 0 ? `${detail.avg_priority}/10` : '—', icon: TrendingUp },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-center"
                  >
                    <Icon className="h-4 w-4 mx-auto text-gray-400 dark:text-gray-500 mb-1" />
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {Object.keys(detail.categories).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Category Breakdown
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detail.categories)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <CategoryPill category={cat} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">×{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {(detail.first_email_at || detail.last_email_at) && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 space-y-1.5 text-xs">
                  {detail.first_email_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">First email</span>
                      <span className="text-gray-700 dark:text-gray-300">{formatDate(detail.first_email_at)}</span>
                    </div>
                  )}
                  {detail.last_email_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last email</span>
                      <span className="text-gray-700 dark:text-gray-300">{formatDate(detail.last_email_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Email history */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Email History
                </h3>
                <div className="space-y-2">
                  {detail.emails.map((email) => (
                    <div
                      key={email.id}
                      className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={clsx(
                            'text-sm font-medium leading-snug truncate',
                            email.is_read
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-900 dark:text-gray-100'
                          )}
                        >
                          {email.subject || '(no subject)'}
                        </p>
                        <Link
                          href={`/email?id=${email.id}`}
                          className="flex-shrink-0 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          title="View email"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {email.category && <CategoryPill category={email.category} />}
                        {email.priority != null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Priority: <span className="font-medium text-gray-700 dark:text-gray-300">{email.priority}/10</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                          {formatDate(email.received_at)}
                        </span>
                      </div>

                      {email.ai_summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {email.ai_summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ContactProfile | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  const loadContacts = useCallback(async (q?: string) => {
    try {
      setLoading(true);
      const data = await contactsApi.getContacts(q || undefined);
      setContacts(data);
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadContacts();
  }, [session, loadContacts]);

  // Debounced search
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      loadContacts(search.trim() || undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, session, loadContacts]);

  const handleCardClick = async (contact: ContactProfile) => {
    setActiveProfile(contact);
    setSelectedContact(null);
    setDetailLoading(true);
    try {
      const detail = await contactsApi.getContact(contact.email);
      setSelectedContact(detail);
    } catch {
      toast.error('Failed to load contact details');
      setActiveProfile(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDrawer = useCallback(() => {
    setActiveProfile(null);
    setSelectedContact(null);
    setDetailLoading(false);
  }, []);

  if (sessionLoading) return null;

  return (
    <>
      <Head>
        <title>CRM — InboxIQ</title>
      </Head>
      <Layout title="CRM">
        <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contacts</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Auto-built from your email history
              </p>
            </div>
            {!loading && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-9 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Grid / States */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
                      <div className="h-2 w-full rounded bg-gray-100 dark:bg-gray-800 mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {search ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {search
                  ? 'Try a different search term.'
                  : 'Contacts are automatically created from your email senders once emails are synced.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.email}
                  contact={contact}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>

      {/* Detail Drawer */}
      {activeProfile && (
        <ContactDrawer
          contact={activeProfile}
          detail={selectedContact}
          loading={detailLoading}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}
