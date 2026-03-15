import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { BarChart2, TrendingUp, Mail, CheckCircle, Inbox, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import { StatsCardSkeleton } from '@/components/SkeletonLoader';
import { ErrorCard } from '@/components/ErrorBoundary';
import { emailsApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Analytics = {
  total_emails: number;
  processed_emails: number;
  unread_emails: number;
  processing_rate: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  emails_per_day: Array<{ day: string; count: number }>;
};

const CATEGORY_COLORS: Record<string, string> = {
  urgent:         '#ef4444',
  needs_response: '#f59e0b',
  follow_up:      '#3b82f6',
  fyi:            '#8b5cf6',
  newsletter:     '#10b981',
  spam:           '#6b7280',
  other:          '#94a3b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  urgent:         'Urgent',
  needs_response: 'Needs Response',
  follow_up:      'Follow Up',
  fyi:            'FYI',
  newsletter:     'Newsletter',
  spam:           'Spam',
  other:          'Other',
};

function DonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
  );

  // Build conic-gradient
  let cumulative = 0;
  const segments = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => {
      const pct = (value / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { key, value, pct, start, color: CATEGORY_COLORS[key] || '#94a3b8' };
    });

  const gradient = segments
    .map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`)
    .join(', ');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut */}
      <div className="relative flex-shrink-0">
        <div
          className="h-36 w-36 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-400">total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 grid grid-cols-1 gap-1.5 w-full">
        {segments.map(s => (
          <div key={s.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-gray-600 truncate">{CATEGORY_LABELS[s.key] || s.key}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-900">{s.value}</span>
              <span className="text-xs text-gray-400 w-8 text-right">{s.pct.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartComponent({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-32 px-1">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-700">{d.count > 0 ? d.count : ''}</span>
          <div className="w-full flex items-end justify-center">
            <div
              className="w-full rounded-t-md bg-primary-500 transition-all duration-700 hover:bg-primary-600 min-h-[4px]"
              style={{ height: `${Math.max((d.count / max) * 96, d.count > 0 ? 4 : 2)}px` }}
            />
          </div>
          <span className="text-xs text-gray-400">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

function PriorityBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value} <span className="text-gray-400">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  const load = async () => {
    try {
      setError(false);
      const data = await emailsApi.getAnalytics();
      setAnalytics(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (session) load(); }, [session]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    toast.success('Analytics refreshed');
  };

  if (sessionLoading) return null;

  const p = analytics?.by_priority ?? {};
  const priorityTotal = (p.high ?? 0) + (p.medium ?? 0) + (p.low ?? 0);

  return (
    <>
      <Head><title>Analytics — InboxIQ</title></Head>
      <Layout title="Analytics">
        <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Email Analytics</h1>
              <p className="text-sm text-gray-500 mt-0.5">Insights into your inbox patterns</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary text-sm">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && <ErrorCard message="Failed to load analytics" onRetry={load} />}

          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {loading ? [...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />) : (
              <>
                {[
                  { label: 'Total Emails', value: analytics?.total_emails ?? 0, icon: Mail, color: 'text-primary-600', bg: 'bg-primary-50' },
                  { label: 'Processed', value: analytics?.processed_emails ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Unread', value: analytics?.unread_emails ?? 0, icon: Inbox, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'AI Rate', value: `${analytics?.processing_rate ?? 0}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className={`card p-4 animate-slide-up stagger-${i + 1}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Emails by category donut */}
            <div className="card p-5 animate-slide-up stagger-2">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 className="h-4 w-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-gray-900">Emails by Category</h2>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="skeleton h-3 w-3 rounded-full" />
                      <div className="skeleton h-3 flex-1 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <DonutChart data={analytics?.by_category ?? {}} />
              )}
            </div>

            {/* Emails per day bar chart */}
            <div className="card p-5 animate-slide-up stagger-3">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900">Emails Last 7 Days</h2>
              </div>
              {loading ? (
                <div className="flex items-end gap-1 h-32">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                      <div className="skeleton w-full rounded" style={{ height: `${20 + Math.random() * 60}px` }} />
                      <div className="skeleton h-3 w-6 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <BarChartComponent data={analytics?.emails_per_day ?? []} />
              )}
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="card p-5 animate-slide-up stagger-4">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Priority Breakdown</h2>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-6 w-full rounded" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <PriorityBar label="High Priority" value={p.high ?? 0} total={priorityTotal} color="#ef4444" />
                <PriorityBar label="Medium Priority" value={p.medium ?? 0} total={priorityTotal} color="#f59e0b" />
                <PriorityBar label="Low Priority" value={p.low ?? 0} total={priorityTotal} color="#10b981" />
              </div>
            )}
          </div>

        </div>
      </Layout>
    </>
  );
}
