import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Search, Filter, X, Mail, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import EmailCard from '@/components/EmailCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import CategoryBadge from '@/components/CategoryBadge';
import { useEmails } from '@/lib/hooks';
import { emailsApi } from '@/lib/api';
import type { EmailCategory, PriorityLevel } from '@/lib/types';
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

  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EmailCategory | undefined>(
    (router.query.category as EmailCategory) || undefined
  );
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel | undefined>(
    (router.query.priority_level as PriorityLevel) || undefined
  );
  const [page, setPage] = useState(1);

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

  const emails = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await emailsApi.syncEmails();
      // Poll for new emails every 5s for up to 60s while sync runs
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

  const clearFilters = () => {
    setCategory(undefined);
    setPriorityLevel(undefined);
    setSearch('');
    setPage(1);
    router.replace('/email', undefined, { shallow: true });
  };

  const hasActiveFilters = !!(category || priorityLevel || search);

  return (
    <>
      <Head>
        <title>Inbox — InboxIQ</title>
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
              <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
                  className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
              <span className="text-xs text-gray-500">Filters:</span>
              {category && (
                <CategoryBadge category={category} size="sm" />
              )}
              {priorityLevel && (
                <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                  {priorityLevel} priority
                </span>
              )}
              {search && (
                <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  &ldquo;{search}&rdquo;
                </span>
              )}
              <span className="text-xs text-gray-400">{total.toLocaleString()} result{total !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Email list */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-600">Failed to load emails. Check your Gmail connection.</p>
            </div>
          ) : emails.length === 0 ? (
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
              {emails.map((email) => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {total.toLocaleString()} emails
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
