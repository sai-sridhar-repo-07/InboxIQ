import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import {
  Search, Filter, X, Mail, ChevronLeft, ChevronRight, RefreshCw, Zap, Loader2,
  CheckSquare, Download, Layers, List, AlignJustify, LayoutList, Maximize2,
  PanelRightOpen, PanelRightClose, MailCheck, PenSquare, Heart, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import EmailCard from '@/components/EmailCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { InboxSkeleton } from '@/components/SkeletonLoader';
import { ErrorCard } from '@/components/ErrorBoundary';
import CategoryBadge from '@/components/CategoryBadge';
import BatchActionBar from '@/components/BatchActionBar';
import BulkSummaryModal from '@/components/BulkSummaryModal';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import ReadingPane from '@/components/ReadingPane';
import { useEmails, useBillingStatus } from '@/lib/hooks';
import { emailsApi } from '@/lib/api';
import { loadRules, applyRules } from '@/lib/rules';
import type { EmailCategory, PriorityLevel, Email } from '@/lib/types';
import clsx from 'clsx';

type Density = 'compact' | 'comfortable' | 'spacious';

const DENSITY_KEY = 'mailair_density';

function getDateBucket(dateStr: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const d = new Date(dateStr);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDay >= today) return 'Today';
  if (dDay >= yesterday) return 'Yesterday';
  if (dDay >= weekAgo) return 'This Week';
  return 'Older';
}

const CATEGORIES: EmailCategory[] = [
  'urgent',
  'needs_response',
  'follow_up',
  'fyi',
  'newsletter',
  'spam',
  'other',
];

const PAGE_SIZE = 20;

export default function EmailListPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [syncing, setSyncing]               = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exportingCSV, setExportingCSV]     = useState(false);
  const [inboxZeroing, setInboxZeroing]     = useState(false);
  const [search, setSearch]                 = useState('');
  // AI search
  const [aiSearchMode, setAiSearchMode]     = useState(false);
  const [aiSearchQuery, setAiSearchQuery]   = useState('');
  const [aiSearchResults, setAiSearchResults] = useState<Email[] | null>(null);
  const [aiSearching, setAiSearching]       = useState(false);
  const [category, setCategory]             = useState<EmailCategory | undefined>(
    (router.query.category as EmailCategory) || undefined
  );
  const [priorityLevel, setPriorityLevel]   = useState<PriorityLevel | undefined>(
    (router.query.priority_level as PriorityLevel) || undefined
  );
  const [page, setPage]                     = useState(1);

  // Selection state
  const [selectionMode, setSelectionMode]   = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());

  // Thread view state
  const [threadView, setThreadView]         = useState(false);

  // Bulk summary state
  const [summaries, setSummaries]           = useState<Array<{ id: string; summary: string }> | null>(null);

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex]     = useState(-1);
  const [shortcutsOpen, setShortcutsOpen]   = useState(false);

  // Density toggle (localStorage)
  const [density, setDensity] = useState<Density>('comfortable');
  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_KEY) as Density | null;
    if (saved) setDensity(saved);
  }, []);
  const cycleDensity = useCallback(() => {
    setDensity((d) => {
      const next: Density = d === 'compact' ? 'comfortable' : d === 'comfortable' ? 'spacious' : 'compact';
      localStorage.setItem(DENSITY_KEY, next);
      return next;
    });
  }, []);

  // Reading pane
  const [readingPane, setReadingPane]         = useState(false);
  const [readingPaneId, setReadingPaneId]     = useState<string | null>(null);

  // Recurring senders
  const [recurringSenders, setRecurringSenders] = useState<Record<string, number>>({});
  useEffect(() => {
    emailsApi.getRecurringSenders().then(setRecurringSenders).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/auth/signin');
    }
  }, [session, sessionLoading, router]);

  // Sync query params to filters
  useEffect(() => {
    setCategory((router.query.category as EmailCategory) || undefined);
    setPriorityLevel((router.query.priority_level as PriorityLevel) || undefined);
    setPage(1);
  }, [router.query.category, router.query.priority_level]);

  const { data: billing, mutate: refreshBilling } = useBillingStatus();
  const { data, isLoading, error, mutate } = useEmails({
    category,
    priority_level: priorityLevel,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
    sort_by: 'received_at',
    sort_order: 'desc',
  });

  const rules = loadRules();
  const emails = (data?.items ?? []).map((e) => applyRules(e as unknown as Record<string, unknown>, rules) as unknown as Email);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Thread grouping — must be before any conditional returns (Rules of Hooks)
  const displayEmails: Array<Email & { threadCount?: number }> = useMemo(() => {
    if (!threadView) return emails;
    const threadMap = new Map<string, Email[]>();
    emails.forEach((email) => {
      const tid = email.gmail_thread_id || email.id;
      if (!threadMap.has(tid)) threadMap.set(tid, []);
      threadMap.get(tid)!.push(email);
    });
    const result: Array<Email & { threadCount?: number }> = [];
    threadMap.forEach((group) => {
      const newest = group.reduce((a, b) =>
        new Date(a.received_at) > new Date(b.received_at) ? a : b
      );
      result.push({ ...newest, threadCount: group.length > 1 ? group.length : undefined });
    });
    result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
    return result;
  }, [emails, threadView]);

  // Sort: pinned emails to the top
  const sortedEmails = useMemo(() => {
    return [...displayEmails].sort((a, b) => {
      const aPin = (a.labels ?? []).includes('__pinned__');
      const bPin = (b.labels ?? []).includes('__pinned__');
      if (aPin === bPin) return 0;
      return aPin ? -1 : 1;
    });
  }, [displayEmails]);

  // Inbox health score (0–100)
  const healthScore = useMemo(() => {
    if (!emails.length) return null;
    const processed = emails.filter((e) => e.processed).length;
    const unread = emails.filter((e) => !e.is_read).length;
    const processedRate = processed / emails.length;
    const unreadPenalty = Math.min(unread / 15, 0.4);
    return Math.round((processedRate * 0.7 + (1 - unreadPenalty) * 0.3) * 100);
  }, [emails]);

  // Keyboard navigation — must be before early returns (Rules of Hooks)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, displayEmails.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case 'o':
          if (focusedIndex >= 0 && displayEmails[focusedIndex]) {
            router.push(`/email/${displayEmails[focusedIndex].id}`);
          }
          break;
        case 'e':
          if (focusedIndex >= 0 && displayEmails[focusedIndex]) {
            const toArchive = displayEmails[focusedIndex];
            emailsApi.deleteEmail(toArchive.id)
              .then(() => { mutate(); toast.success('Archived'); })
              .catch(() => toast.error('Failed to archive'));
            setFocusedIndex((i) => Math.max(0, i - 1));
          }
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[placeholder="Search emails..."]')?.focus();
          break;
        case '?':
          setShortcutsOpen((v) => !v);
          break;
        case 'Escape':
          setShortcutsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayEmails, focusedIndex, router]);

  // All hooks above — safe to return early now
  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await emailsApi.syncEmails();
      let attempts = 0;
      const poll = setInterval(async () => {
        await mutate();
        attempts++;
        if (attempts >= 12) { clearInterval(poll); setSyncing(false); }
      }, 5000);
    } catch {
      setSyncing(false);
    }
  };

  const handleBulkProcess = async () => {
    setBulkProcessing(true);
    try {
      const { count } = await emailsApi.bulkProcess();
      await mutate();
      toast.success(count > 0 ? `Processing ${count} emails with AI…` : 'All emails already processed!');
    } catch {
      toast.error('Failed to start bulk processing');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleInboxZero = async () => {
    if (!confirm('This will dismiss all newsletters, spam, and low-priority FYI emails. Continue?')) return;
    setInboxZeroing(true);
    try {
      const result = await emailsApi.inboxZero();
      await mutate();
      toast.success(result.message || `Dismissed ${result.dismissed} emails`);
    } catch {
      toast.error('Inbox Zero failed');
    } finally {
      setInboxZeroing(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      await emailsApi.exportCSV();
      toast.success('Export started!');
    } catch {
      toast.error('Failed to export emails');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = displayEmails.filter((e) => !e.is_read).map((e) => e.id);
    if (!unreadIds.length) { toast('All emails already read'); return; }
    try {
      await emailsApi.bulkMarkRead(unreadIds);
      await mutate();
      toast.success(`Marked ${unreadIds.length} as read`);
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const clearFilters = () => {
    setCategory(undefined);
    setPriorityLevel(undefined);
    setSearch('');
    setPage(1);
    setAiSearchResults(null);
    setAiSearchQuery('');
    router.replace('/email', undefined, { shallow: true });
  };

  const hasActiveFilters = !!(category || priorityLevel || search);

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearching(true);
    try {
      const res = await emailsApi.aiSearch(aiSearchQuery.trim());
      setAiSearchResults(res.items);
      if (res.items.length === 0) toast('No emails matched your query', { icon: '🔍' });
    } catch {
      toast.error('AI search failed');
    } finally {
      setAiSearching(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <>
      <Head>
        <title>Inbox — Mailair</title>
      </Head>
      <Layout title="Inbox">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Plan limit banner */}
          {billing && billing.email_limit !== null && Number(billing.emails_used_this_month) >= Number(billing.email_limit) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>You've used all {billing.email_limit} free AI processes this month.</strong> Upgrade to Pro for unlimited processing.
                </p>
              </div>
              <a href="/billing" className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                Upgrade
              </a>
            </div>
          )}
          {/* Search and filter bar */}
          <div className="card p-3 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn-secondary flex items-center gap-2 shrink-0"
              title="Sync Gmail"
            >
              <RefreshCw className={clsx('h-4 w-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <div className="relative flex-1 flex gap-1.5">
              {aiSearchMode ? (
                <>
                  <div className="relative flex-1">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400" />
                    <input
                      type="text"
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAiSearch(); }}
                      placeholder="e.g. unread emails from John about invoices last week"
                      className="input-field pl-9 pr-3 w-full text-sm"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleAiSearch}
                    disabled={aiSearching || !aiSearchQuery.trim()}
                    className="btn-primary text-xs gap-1 shrink-0"
                  >
                    {aiSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </button>
                  <button
                    onClick={() => { setAiSearchMode(false); setAiSearchResults(null); setAiSearchQuery(''); }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Exit AI search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Search emails..."
                      className="input-field pl-9"
                    />
                  </div>
                  <button
                    onClick={() => setAiSearchMode(true)}
                    title="AI natural language search"
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-primary-500 hover:border-primary-300 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <select
                value={category ?? ''}
                onChange={(e) => {
                  setCategory((e.target.value as EmailCategory) || undefined);
                  setPage(1);
                }}
                className="input-field py-2 pr-8 text-sm"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>

              <select
                value={priorityLevel ?? ''}
                onChange={(e) => {
                  setPriorityLevel((e.target.value as PriorityLevel) || undefined);
                  setPage(1);
                }}
                className="input-field py-2 pr-8 text-sm"
              >
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Filters:</span>
              {category && (
                <CategoryBadge category={category} size="sm" />
              )}
              {priorityLevel && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {priorityLevel} priority
                </span>
              )}
              {search && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  &ldquo;{search}&rdquo;
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">{total.toLocaleString()} result{total !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">{total > 0 ? `${total.toLocaleString()} email${total !== 1 ? 's' : ''}` : ''}</p>
              {healthScore !== null && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border',
                    healthScore >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                    : healthScore >= 50 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700'
                  )}
                  title="Inbox Health Score: based on % processed + unread emails"
                >
                  <Heart className="h-3 w-3" />
                  {healthScore}% health
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Compose */}
              <button
                onClick={() => router.push('/email/compose')}
                className="btn-primary text-sm"
              >
                <PenSquare className="h-4 w-4" />
                Compose
              </button>
              {/* Density toggle */}
              <button
                onClick={cycleDensity}
                className="btn-secondary text-sm"
                title={`Density: ${density}`}
              >
                {density === 'compact' ? <AlignJustify className="h-4 w-4" /> : density === 'spacious' ? <Maximize2 className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
                {density === 'compact' ? 'Compact' : density === 'spacious' ? 'Spacious' : 'Comfortable'}
              </button>

              {/* Reading pane toggle */}
              <button
                onClick={() => { setReadingPane((v) => !v); setReadingPaneId(null); }}
                className={clsx('btn-secondary text-sm', readingPane && 'bg-primary-50 border-primary-300 text-primary-700')}
                title="Reading pane"
              >
                {readingPane ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                Pane
              </button>

              {/* Mark all read */}
              <button onClick={handleMarkAllRead} className="btn-secondary text-sm" title="Mark all visible as read">
                <MailCheck className="h-4 w-4" />
                Mark Read
              </button>

              {/* Thread toggle */}
              <button
                onClick={() => setThreadView((v) => !v)}
                className={clsx('btn-secondary text-sm', threadView && 'bg-primary-50 border-primary-300 text-primary-700')}
                title="Toggle thread view"
              >
                {threadView ? <List className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                {threadView ? 'All' : 'Threads'}
              </button>

              {/* Select mode */}
              <button
                onClick={() => {
                  if (selectionMode) { exitSelection(); } else { setSelectionMode(true); }
                }}
                className={clsx('btn-secondary text-sm', selectionMode && 'bg-primary-50 border-primary-300 text-primary-700')}
              >
                <CheckSquare className="h-4 w-4" />
                {selectionMode ? 'Cancel' : 'Select'}
              </button>

              {/* Export CSV */}
              <button onClick={handleExportCSV} disabled={exportingCSV} className="btn-secondary text-sm">
                {exportingCSV
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Export CSV
              </button>

              {/* Inbox Zero */}
              <button onClick={handleInboxZero} disabled={inboxZeroing} className="btn-secondary text-sm" title="Dismiss newsletters, spam, and low-priority emails">
                {inboxZeroing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <span className="mr-1.5 text-base leading-none">✦</span>}
                Inbox Zero
              </button>

              {/* Process all */}
              <button onClick={handleBulkProcess} disabled={bulkProcessing} className="btn-secondary text-sm">
                {bulkProcessing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Zap className="h-4 w-4" />}
                {bulkProcessing ? 'Processing…' : 'Process All with AI'}
              </button>
            </div>
          </div>

          {/* Batch action bar */}
          {selectionMode && selectedIds.size > 0 && (
            <BatchActionBar
              selectedIds={selectedIds}
              onCancel={exitSelection}
              onComplete={() => { exitSelection(); mutate(); }}
              onSummarize={(results) => setSummaries(results)}
            />
          )}

          {/* AI Search Results */}
          {aiSearchResults !== null && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    AI Search: {aiSearchResults.length} result{aiSearchResults.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-400">for &ldquo;{aiSearchQuery}&rdquo;</span>
                </div>
                <button onClick={() => { setAiSearchResults(null); setAiSearchMode(false); setAiSearchQuery(''); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              </div>
              {aiSearchResults.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No emails matched your query.</p>
              ) : (
                <div className="space-y-1">
                  {aiSearchResults.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      density={density}
                      onDismiss={() => setAiSearchResults((prev) => prev?.filter((e) => e.id !== email.id) ?? null)}
                      onProcessed={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email list + optional reading pane */}
          {aiSearchResults === null && (
          <div className={clsx('flex gap-4', readingPane && readingPaneId && 'lg:gap-3')}>
            <div className={clsx('min-w-0 flex-1', readingPane && readingPaneId && 'lg:max-w-[45%]')}>
              {isLoading ? (
                <InboxSkeleton />
              ) : error ? (
                <ErrorCard message="Failed to load emails. Check your Gmail connection." onRetry={() => mutate()} />
              ) : sortedEmails.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title={hasActiveFilters ? 'No emails match your filters' : 'No emails yet'}
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your search or filters.'
                      : 'Connect your Gmail account to start processing emails.'
                  }
                  action={
                    hasActiveFilters
                      ? { label: 'Clear filters', onClick: clearFilters }
                      : { label: 'Go to Settings', onClick: () => router.push('/settings') }
                  }
                  className="card py-16"
                />
              ) : (
                <div className="space-y-1">
                  {(() => {
                    const nodes: React.ReactNode[] = [];
                    let lastBucket = '';
                    let shownPinnedDivider = false;
                    sortedEmails.forEach((email, idx) => {
                      const emailIsPinned = (email.labels ?? []).includes('__pinned__');
                      if (emailIsPinned && !shownPinnedDivider) {
                        shownPinnedDivider = true;
                        lastBucket = '';
                        nodes.push(
                          <div key="divider-pinned" className="flex items-center gap-3 py-1.5 px-1">
                            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider whitespace-nowrap">Pinned</span>
                            <div className="flex-1 h-px bg-amber-100 dark:bg-amber-900/30" />
                          </div>
                        );
                      } else if (!emailIsPinned) {
                        const bucket = getDateBucket(email.received_at);
                        if (bucket !== lastBucket) {
                          lastBucket = bucket;
                          nodes.push(
                            <div key={`divider-${bucket}`} className="flex items-center gap-3 py-1.5 px-1">
                              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{bucket}</span>
                              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                            </div>
                          );
                        }
                      }
                      const senderKey = email.from_email || email.from_name || '';
                      const recurringCount = recurringSenders[senderKey] ?? 0;
                      nodes.push(
                        <div key={email.id} className="relative">
                          <EmailCard
                            email={email}
                            density={density}
                            recurringCount={recurringCount}
                            onDismiss={() => mutate()}
                            onProcessed={() => { mutate(); refreshBilling(); }}
                            selected={selectionMode ? selectedIds.has(email.id) : undefined}
                            onToggleSelect={selectionMode ? () => toggleSelect(email.id) : undefined}
                            onReadingPaneSelect={readingPane ? () => setReadingPaneId(email.id) : undefined}
                            readingPaneActive={readingPane && readingPaneId === email.id}
                            className={clsx(focusedIndex === idx && 'ring-2 ring-primary-400 ring-offset-1')}
                          />
                          {email.threadCount && email.threadCount > 1 && (
                            <span className="absolute bottom-3 right-8 inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 pointer-events-none">
                              {email.threadCount} in thread
                            </span>
                          )}
                        </div>
                      );
                    });
                    return nodes;
                  })()}
                </div>
              )}
            </div>

            {/* Reading pane */}
            {readingPane && readingPaneId && (
              <div className="hidden lg:block flex-1 min-w-0 sticky top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto">
                <ReadingPane
                  emailId={readingPaneId}
                  onClose={() => setReadingPaneId(null)}
                  onMutate={() => mutate()}
                />
              </div>
            )}
          </div>

          )} {/* end aiSearchResults === null */}

          {/* Pagination */}
          {aiSearchResults === null && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} · {total.toLocaleString()} emails
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'min-w-[36px] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        pageNum === page
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>

      {/* Bulk summary modal */}
      {summaries && (
        <BulkSummaryModal
          summaries={summaries}
          onClose={() => setSummaries(null)}
        />
      )}

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
