import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import {
  Mail,
  AlertCircle,
  MessageSquare,
  CheckSquare,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import EmailCard from '@/components/EmailCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { ErrorCard } from '@/components/ErrorBoundary';
import { usePriorityInbox, useEmailStats, useGmailStatus } from '@/lib/hooks';
import { integrationsApi, emailsApi } from '@/lib/api';
import { useState } from 'react';
import type { Email } from '@/lib/types';

function GmailConnectBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary-200 bg-primary-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 flex-shrink-0">
          <Mail className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Connect your Gmail account</h3>
          <p className="mt-0.5 text-sm text-gray-600">
            Connect Gmail to start AI-powered email triage. Takes less than 60 seconds.
          </p>
        </div>
      </div>
      <button onClick={onConnect} className="btn-primary text-sm flex-shrink-0">
        Connect Gmail
        <ExternalLink className="ml-2 h-4 w-4" />
      </button>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        {count}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: priorityInbox, error: inboxError, isLoading: inboxLoading, mutate: mutateInbox } = usePriorityInbox();
  const { data: stats, isLoading: statsLoading, mutate: mutateStats } = useEmailStats();
  const { data: gmailStatus } = useGmailStatus();

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/auth/signin');
    }
  }, [session, sessionLoading, router]);

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const loadingToast = toast.loading('Syncing emails…');
    try {
      await emailsApi.syncEmails();
      await Promise.all([mutateInbox(), mutateStats()]);
      toast.success('Emails synced!', { id: loadingToast });
    } catch {
      toast.error('Failed to sync emails. Check your Gmail connection.', { id: loadingToast });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { auth_url } = await integrationsApi.connectGmail();
      window.location.href = auth_url;
    } catch {
      toast.error('Failed to initiate Gmail connection');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([mutateInbox(), mutateStats()]);
      toast.success('Inbox refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkProcess = async () => {
    setIsBulkProcessing(true);
    try {
      const { count } = await emailsApi.bulkProcess();
      await Promise.all([mutateInbox(), mutateStats()]);
      toast.success(count > 0 ? `Processing ${count} emails with AI…` : 'All emails already processed!');
    } catch {
      toast.error('Failed to start bulk processing');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const urgent = priorityInbox?.urgent ?? [];
  const needsResponse = priorityInbox?.needs_response ?? [];
  const followUp = priorityInbox?.follow_up ?? [];
  const lowPriority = priorityInbox?.low_priority ?? [];
  const isLoading = inboxLoading || statsLoading;

  return (
    <>
      <Head>
        <title>Dashboard — InboxIQ</title>
      </Head>
      <Layout title="Dashboard">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Onboarding checklist */}
          <OnboardingChecklist
            gmailConnected={gmailStatus?.connected ?? false}
            hasEmails={(stats?.total_emails ?? 0) > 0}
            hasProcessed={(stats?.total_emails ?? 0) > 0 && (stats?.urgent_count ?? 0) + (stats?.needs_response_count ?? 0) > 0}
            onSync={handleSync}
            onProcessAll={handleBulkProcess}
            isSyncing={isSyncing}
            isBulkProcessing={isBulkProcessing}
          />

          {/* Gmail connect banner */}
          {gmailStatus && !gmailStatus.connected && (
            <GmailConnectBanner onConnect={handleConnectGmail} />
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="animate-slide-up stagger-1">
              <StatsCard
                title="Total Emails"
                value={stats?.total_emails ?? 0}
                icon={Mail}
                iconColor="text-primary-600"
                iconBg="bg-primary-50"
                onClick={() => router.push('/email')}
              />
            </div>
            <div className="animate-slide-up stagger-2">
              <StatsCard
                title="Urgent"
                value={stats?.urgent_count ?? 0}
                icon={AlertCircle}
                iconColor="text-red-600"
                iconBg="bg-red-50"
                onClick={() => router.push('/email?category=urgent')}
              />
            </div>
            <div className="animate-slide-up stagger-3">
              <StatsCard
                title="Needs Response"
                value={stats?.needs_response_count ?? 0}
                icon={MessageSquare}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
                onClick={() => router.push('/email?category=needs_response')}
              />
            </div>
            <div className="animate-slide-up stagger-4">
              <StatsCard
                title="Action Items"
                value={stats?.action_items_count ?? 0}
                icon={CheckSquare}
                iconColor="text-green-600"
                iconBg="bg-green-50"
                onClick={() => router.push('/actions')}
              />
            </div>
          </div>

          {/* Inbox header with actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Priority Inbox</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkProcess}
                disabled={isBulkProcessing}
                className="btn-secondary text-sm"
              >
                {isBulkProcessing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <Zap className="h-4 w-4 mr-1.5" />}
                <span className="hidden sm:inline">{isBulkProcessing ? 'Processing…' : 'Process All'}</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-secondary text-sm"
              >
                {isRefreshing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCw className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <DashboardSkeleton />
          ) : inboxError ? (
            <ErrorCard message="Failed to load emails. Check your Gmail connection in Settings." onRetry={() => { mutateInbox(); mutateStats(); }} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Urgent */}
              <div>
                <SectionHeader title="Urgent" count={urgent.length} />
                {urgent.length === 0 ? (
                  <div className="card py-8">
                    <EmptyState
                      icon={AlertCircle}
                      title="No urgent emails"
                      description="You're all clear on urgent messages."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {urgent.slice(0, 5).map((email: Email) => (
                      <EmailCard key={email.id} email={email} />
                    ))}
                    {urgent.length > 5 && (
                      <button
                        onClick={() => router.push('/email?category=urgent')}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2 font-medium"
                      >
                        View all {urgent.length} urgent emails
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Needs Response */}
              <div>
                <SectionHeader title="Needs Response" count={needsResponse.length} />
                {needsResponse.length === 0 ? (
                  <div className="card py-8">
                    <EmptyState
                      icon={MessageSquare}
                      title="Inbox zero for responses!"
                      description="No emails waiting for your reply."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {needsResponse.slice(0, 5).map((email: Email) => (
                      <EmailCard key={email.id} email={email} />
                    ))}
                    {needsResponse.length > 5 && (
                      <button
                        onClick={() => router.push('/email?category=needs_response')}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2 font-medium"
                      >
                        View all {needsResponse.length} emails
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Follow Up */}
              <div>
                <SectionHeader title="Follow Up" count={followUp.length} />
                {followUp.length === 0 ? (
                  <div className="card py-8">
                    <EmptyState
                      icon={CheckSquare}
                      title="No follow-ups pending"
                      description="Nothing requiring follow up right now."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {followUp.slice(0, 3).map((email: Email) => (
                      <EmailCard key={email.id} email={email} />
                    ))}
                    {followUp.length > 3 && (
                      <button
                        onClick={() => router.push('/email?category=follow_up')}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2 font-medium"
                      >
                        View all {followUp.length} emails
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Low Priority */}
              <div>
                <SectionHeader title="Low Priority" count={lowPriority.length} />
                {lowPriority.length === 0 ? (
                  <div className="card py-8">
                    <EmptyState
                      icon={Mail}
                      title="Nothing here"
                      description="No low-priority emails at the moment."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowPriority.slice(0, 3).map((email: Email) => (
                      <EmailCard key={email.id} email={email} />
                    ))}
                    {lowPriority.length > 3 && (
                      <button
                        onClick={() => router.push('/email?priority_level=low')}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2 font-medium"
                      >
                        View all {lowPriority.length} low priority emails
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
