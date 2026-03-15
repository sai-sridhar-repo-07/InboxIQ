import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { CheckSquare, Filter } from 'lucide-react';
import Layout from '@/components/Layout';
import ActionItem from '@/components/ActionItem';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { useActions } from '@/lib/hooks';
import type { Action, ActionStatus } from '@/lib/types';
import clsx from 'clsx';

type FilterTab = 'pending' | 'completed' | 'all';

export default function ActionsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/auth/signin');
    }
  }, [session, sessionLoading, router]);

  const status: ActionStatus | undefined =
    filterTab === 'all' ? undefined : filterTab === 'pending' ? 'pending' : 'completed';

  const { data, isLoading } = useActions({ status });

  useEffect(() => {
    if (data) setActions(data);
  }, [data]);

  const handleUpdate = (updated: Action) => {
    setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All' },
  ];

  return (
    <>
      <Head>
        <title>Action Items — InboxIQ</title>
      </Head>
      <Layout title="Action Items">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={clsx(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    filterTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter className="h-4 w-4" />
              {actions.length} item{actions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : actions.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={filterTab === 'pending' ? 'No pending actions' : 'No action items'}
              description={
                filterTab === 'pending'
                  ? "You're all caught up! No pending actions right now."
                  : 'Action items extracted from your emails will appear here.'
              }
              className="card py-16"
            />
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <ActionItem key={action.id} action={action} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
