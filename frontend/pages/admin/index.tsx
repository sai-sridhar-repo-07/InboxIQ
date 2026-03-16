import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import {
  Users, Mail, Activity, RefreshCw, Loader2, Shield, BarChart2, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { teamsApi } from '@/lib/api';
import type { AdminStats, ActivityLogEntry } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  created_org: 'Created the organization',
  invited_member: 'Invited a member',
  joined_org: 'Joined the organization',
  removed_member: 'Removed a member',
  assigned_email: 'Assigned an email',
  added_note: 'Added an internal note',
};

function formatDate(d: string) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); }
  catch { return d; }
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamsApi.getAdminStats();
      setStats(data);
    } catch {
      setError('Failed to load admin stats. Make sure you are an admin or owner of an organization.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (sessionLoading || loading) return <LoadingSpinner fullPage />;

  return (
    <>
      <Head><title>Admin Dashboard — InboxIQ</title></Head>
      <Layout title="Admin Dashboard">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
            </div>
            <button onClick={load} className="btn-secondary text-sm gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {error ? (
            <div className="card p-8 text-center">
              <Shield className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Active Members"
                  value={stats.member_count}
                  color="bg-primary-600"
                />
                <StatCard
                  icon={Clock}
                  label="Pending Invites"
                  value={stats.pending_invites}
                  sub="Awaiting acceptance"
                  color="bg-amber-500"
                />
                <StatCard
                  icon={Mail}
                  label="Total Emails"
                  value={stats.total_emails.toLocaleString()}
                  sub="Across all members"
                  color="bg-emerald-600"
                />
                <StatCard
                  icon={BarChart2}
                  label="Emails Today"
                  value={stats.emails_today}
                  color="bg-violet-600"
                />
              </div>

              {/* Recent Activity */}
              <div className="card">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <Activity className="h-4 w-4 text-primary-600" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
                </div>
                {stats.recent_activity.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No activity yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stats.recent_activity.map((entry: ActivityLogEntry) => (
                      <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                        <div className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                          {(entry.actor_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-medium">{entry.actor_name || 'Someone'}</span>{' '}
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </Layout>
    </>
  );
}
