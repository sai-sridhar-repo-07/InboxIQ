import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { CheckSquare, Plus, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import TaskCard from '@/components/TaskCard';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import PageError from '@/components/PageError';
import { useActions } from '@/lib/hooks';
import { actionsApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import type { Action, ActionPriority } from '@/lib/types';
import clsx from 'clsx';

type PriorityFilter = 'all' | ActionPriority;

function isOverdue(action: Action): boolean {
  return action.status === 'pending' && !!action.deadline && new Date(action.deadline) < new Date();
}

export default function ActionsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [actions, setActions] = useState<Action[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailAction, setDetailAction] = useState<Action | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  const { data, isLoading, error: actionsError, mutate: reloadActions } = useActions({});

  useEffect(() => {
    if (data) setActions(data);
  }, [data]);

  const handleUpdate = async (updated: Action) => {
    try {
      const result = await actionsApi.updateAction(updated.id, {
        status: updated.status,
        notes: updated.notes,
        deadline: updated.deadline,
      });
      setActions((prev) => prev.map((a) => (a.id === result.id ? { ...a, ...result } : a)));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update task'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await actionsApi.deleteAction(id);
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete task'));
    }
  };

  const handleCreate = (action: Action) => {
    setActions((prev) => [action, ...prev]);
  };

  if (sessionLoading || isLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;
  if (actionsError) return (
    <Layout title="Actions">
      <PageError message="Couldn't load actions" onRetry={() => reloadActions()} />
    </Layout>
  );

  // Filter by priority
  const filtered =
    priorityFilter === 'all'
      ? actions
      : actions.filter((a) => a.priority === priorityFilter);

  // Split into columns
  const pending = filtered.filter((a) => a.status === 'pending' && !isOverdue(a));
  const overdue = filtered.filter((a) => isOverdue(a));
  const completed = filtered.filter((a) => a.status === 'completed');

  const columns = [
    {
      id: 'pending',
      label: 'Pending',
      icon: Clock,
      items: pending,
      headerClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
      iconClass: 'text-amber-600 dark:text-amber-400',
      countClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      emptyText: 'No pending tasks',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: AlertCircle,
      items: overdue,
      headerClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
      iconClass: 'text-red-500 dark:text-red-400',
      countClass: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      emptyText: 'Nothing overdue',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
      items: completed,
      headerClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
      iconClass: 'text-green-600 dark:text-green-400',
      countClass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      emptyText: 'No completed tasks yet',
    },
  ];

  return (
    <>
      <Head>
        <title>Task Manager — Mailair</title>
      </Head>
      <Layout title="Task Manager">
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Priority:</span>
              {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all',
                    priorityFilter === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>

          {/* Kanban board */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : actions.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Action items extracted from emails appear here. You can also create tasks manually."
              className="card py-20"
              action={{ label: 'Create Task', onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((col) => {
                const Icon = col.icon;
                return (
                  <div key={col.id} className="flex flex-col min-h-[400px]">
                    {/* Column header */}
                    <div
                      className={clsx(
                        'flex items-center justify-between rounded-t-xl border px-4 py-3',
                        col.headerClass
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={clsx('h-4 w-4', col.iconClass)} />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {col.label}
                        </span>
                      </div>
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-bold', col.countClass)}>
                        {col.items.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-2 space-y-2">
                      {col.items.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
                          {col.emptyText}
                        </p>
                      ) : (
                        col.items.map((action) => (
                          <TaskCard
                            key={action.id}
                            action={action}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onClick={() => setDetailAction(action)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        {createOpen && (
          <CreateTaskModal onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
        )}
        {detailAction && (
          <TaskDetailModal
            action={detailAction}
            onClose={() => setDetailAction(null)}
            onUpdate={(updated) => {
              setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
              setDetailAction(null);
            }}
            onDelete={(id) => {
              setActions((prev) => prev.filter((a) => a.id !== id));
              setDetailAction(null);
            }}
          />
        )}
      </Layout>
    </>
  );
}
