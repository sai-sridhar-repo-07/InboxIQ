import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import {
  Search, Filter, X, Mail, ChevronLeft, ChevronRight, RefreshCw, Zap, Loader2,
  CheckSquare, Download, Layers, List,
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
import { useEmails } from '@/lib/hooks';
import { emailsApi } from '@/lib/api';
import { loadRules, applyRules } from '@/lib/rules';
import type { EmailCategory, PriorityLevel, Email } from '@/lib/types';
import clsx from 'clsx';

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

  const { data, isLoading, error, mutate } = useEmails({
    category,
    priority_level: priorityLevel,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
    sort_by: 'received_at',
    sort_order: 'desc',
  });

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const rules = loadRules();
  const emails = (data?.items ?? []).map((e) => applyRules(e as unknown as Record<string, unknown>, rules) as unknown as Email);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Thread grouping
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

  const clearFilters = () => {
    setCategory(undefined);
    setPriorityLevel(undefined);
    setSearch('');
    setPage(1);
    router.replace('/email', undefined, { shallow: true });
  };

  const hasActiveFilters = !!(category || priorityLevel || search);

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
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search emails..."
                className="input-field pl-9"
              />
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{total > 0 ? `${total.toLocaleString()} email${total !== 1 ? 's' : ''}` : ''}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Thread toggle */}
              <button
                onClick={() => setThreadView((v) => !v)}
                className={clsx('btn-secondary text-sm', threadView && 'bg-primary-50 border-primary-300 text-primary-700')}
                title="Toggle thread view"
              >
                {threadView ? <List className="h-4 w-4 mr-1.5" /> : <Layers className="h-4 w-4 mr-1.5" />}
                {threadView ? 'All' : 'Threads'}
              </button>

              {/* Select mode */}
              <button
                onClick={() => {
                  if (selectionMode) { exitSelection(); } else { setSelectionMode(true); }
                }}
                className={clsx('btn-secondary text-sm', selectionMode && 'bg-primary-50 border-primary-300 text-primary-700')}
              >
                <CheckSquare className="h-4 w-4 mr-1.5" />
                {selectionMode ? 'Cancel' : 'Select'}
              </button>

              {/* Export CSV */}
              <button onClick={handleExportCSV} disabled={exportingCSV} className="btn-secondary text-sm">
                {exportingCSV
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <Download className="h-4 w-4 mr-1.5" />}
                Export CSV
              </button>

              {/* Inbox Zero */}
              <button onClick={handleInboxZero} disabled={inboxZeroing} className="btn-secondary text-sm" title="Dismiss newsletters, spam, and low-priority emails">
                {inboxZeroing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <span className="mr-1.5 text-base leading-none">✦</span>}
                Inbox Zero
              </button>

              {/* Process all */}
              <button onClick={handleBulkProcess} disabled={bulkProcessing} className="btn-secondary text-sm">
                {bulkProcessing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <Zap className="h-4 w-4 mr-1.5" />}
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

          {/* Email list */}
          {isLoading ? (
            <InboxSkeleton />
          ) : error ? (
            <ErrorCard message="Failed to load emails. Check your Gmail connection." onRetry={() => mutate()} />
          ) : displayEmails.length === 0 ? (
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
            <div className="space-y-2">
              {displayEmails.map((email) => (
                <div key={email.id} className="relative">
                  <EmailCard
                    email={email}
                    onDismiss={() => mutate()}
                    selected={selectionMode ? selectedIds.has(email.id) : undefined}
                    onToggleSelect={selectionMode ? () => toggleSelect(email.id) : undefined}
                  />
                  {/* Thread badge */}
                  {email.threadCount && email.threadCount > 1 && (
                    <span className="absolute bottom-3 right-8 inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 pointer-events-none">
                      {email.threadCount} in thread
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
    </>
  );
}
