import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Mail,
  Calendar,
  User,
  Brain,
  Tag,
  List,
  MessageSquare,
  Trash2,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import ActionItem from '@/components/ActionItem';
import ReplyEditor from '@/components/ReplyEditor';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useEmail, useEmailActions, useReplyDraft } from '@/lib/hooks';
import { emailsApi } from '@/lib/api';
import type { Action } from '@/lib/types';

export default function EmailDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const emailId = typeof id === 'string' ? id : undefined;

  const { session, isLoading: sessionLoading } = useSessionContext();
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);

  const { data: email, error: emailError, isLoading: emailLoading, mutate: mutateEmail } = useEmail(emailId);
  const { data: rawActions, isLoading: actionsLoading } = useEmailActions(emailId);
  const { data: replyDraft } = useReplyDraft(emailId);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/auth/signin');
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (rawActions) setActions(rawActions);
  }, [rawActions]);

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const handleReprocess = async () => {
    if (!emailId) return;
    setIsReprocessing(true);
    try {
      await emailsApi.processEmail(emailId);
      await mutateEmail();
      toast.success('Email re-processed with AI');
    } catch {
      toast.error('Failed to re-process email');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!emailId) return;
    if (!confirm('Delete this email from InboxIQ? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await emailsApi.deleteEmail(emailId);
      toast.success('Email deleted');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to delete email');
      setIsDeleting(false);
    }
  };

  const handleActionUpdate = (updated: Action) => {
    setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  if (emailLoading) {
    return (
      <Layout title="Loading...">
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (emailError || !email) {
    return (
      <Layout title="Email not found">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="btn-secondary text-sm mb-6">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </button>
          <div className="card p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email not found</h2>
            <p className="text-sm text-gray-500">This email may have been deleted or is not accessible.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const analysis = email.ai_analysis;

  return (
    <>
      <Head>
        <title>{email.subject} — InboxIQ</title>
      </Head>
      <Layout title="Email Detail">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="btn-secondary text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="btn-secondary text-sm"
              >
                {isReprocessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                {isReprocessing ? 'Processing...' : 'Re-process with AI'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>

          {/* Email header card */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-base font-bold">
                {(email.from_name || email.from_email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-snug">{email.subject}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <strong className="font-medium text-gray-900">{email.from_name || email.from_email}</strong>
                    {email.from_name && (
                      <span className="text-gray-400">({email.from_email})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {format(new Date(email.received_at), 'MMM d, yyyy · h:mm a')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">{email.to_email}</span>
                  </span>
                </div>
                {(analysis?.category || analysis?.priority_level) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.category && <CategoryBadge category={analysis.category} />}
                    {analysis.priority_level && (
                      <PriorityBadge
                        level={analysis.priority_level}
                        score={analysis.priority_score}
                        showScore
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Email body */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              {email.body_html ? (
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: email.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {email.body_text || email.snippet}
                </pre>
              )}
            </div>
          </div>

          {/* Two column layout for AI analysis + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* AI Analysis Panel */}
            {analysis && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <h2 className="text-sm font-semibold text-gray-900">AI Analysis</h2>
                  <span className="ml-auto text-xs text-gray-400">
                    {Math.round(analysis.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Summary */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Priority score */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Priority Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            analysis.priority_score >= 7
                              ? 'bg-red-500'
                              : analysis.priority_score >= 4
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(analysis.priority_score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">
                        {analysis.priority_score}/10
                      </span>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Sentiment</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        analysis.sentiment === 'positive'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : analysis.sentiment === 'negative'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {analysis.sentiment}
                    </span>
                  </div>

                  {/* Key topics */}
                  {analysis.key_topics && analysis.key_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Key Topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.key_topics.map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                          >
                            <Tag className="h-3 w-3" />
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Items */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <List className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900">Action Items</h2>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {actions.length}
                </span>
              </div>

              {actionsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : actions.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No action items extracted</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      onUpdate={handleActionUpdate}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reply Editor */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">AI Reply Draft</h2>
            </div>
            <ReplyEditor
              emailId={email.id}
              draft={replyDraft}
              onSent={() => mutateEmail()}
            />
          </div>
        </div>
      </Layout>
    </>
  );
}

