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
  Paperclip,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Star,
  AlarmClock,
  FileEdit,
  CalendarCheck,
  ClipboardCopy,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Layout from '@/components/Layout';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import ActionItem from '@/components/ActionItem';
import ReplyEditor from '@/components/ReplyEditor';
import LoadingSpinner from '@/components/LoadingSpinner';
import AttachmentViewer from '@/components/AttachmentViewer';
import SnoozeModal from '@/components/SnoozeModal';
import { useEmail, useEmailActions, useReplyDraft } from '@/lib/hooks';
import { emailsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Action, QuoteData, MeetingInfo } from '@/lib/types';

type Attachment = {
  attachment_id: string;
  message_id: string;
  filename: string;
  mime_type: string;
  size: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))              return ImageIcon;
  if (mimeType.includes('pdf'))                   return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  return File;
}

function getFileColor(mimeType: string): string {
  if (mimeType.startsWith('image/'))   return 'text-pink-500 bg-pink-50';
  if (mimeType.includes('pdf'))        return 'text-red-500 bg-red-50';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-green-600 bg-green-50';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-500 bg-blue-50';
  return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
}

export default function EmailDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const emailId = typeof id === 'string' ? id : undefined;

  const { session, isLoading: sessionLoading } = useSessionContext();
  const [isReprocessing, setIsReprocessing]   = useState(false);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [isStarring, setIsStarring]           = useState(false);
  const [isStarred, setIsStarred]             = useState<boolean | null>(null);
  const [snoozeOpen, setSnoozeOpen]           = useState(false);
  const [actions, setActions]                 = useState<Action[]>([]);
  const [attachments, setAttachments]         = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

  // Quote generator state
  const [quoteModalOpen, setQuoteModalOpen]       = useState(false);
  const [quoteProjectDesc, setQuoteProjectDesc]   = useState('');
  const [quoteBudgetHint, setQuoteBudgetHint]     = useState('');
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [generatedQuote, setGeneratedQuote]       = useState<QuoteData | null>(null);

  // Meeting detection state
  const [meetingInfo, setMeetingInfo]   = useState<MeetingInfo | null>(null);

  const { data: email, error: emailError, isLoading: emailLoading, mutate: mutateEmail } = useEmail(emailId);
  const { data: rawActions, isLoading: actionsLoading } = useEmailActions(emailId);
  const { data: replyDraft } = useReplyDraft(emailId);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (rawActions) setActions(rawActions);
  }, [rawActions]);

  // Mark email as read when opened
  useEffect(() => {
    if (!emailId || !email) return;
    emailsApi.markAsRead(emailId).catch(() => {});
  }, [emailId, email?.id]);

  // Mark onboarding "reply" step done when user views an email with an AI draft
  useEffect(() => {
    if (replyDraft && typeof window !== 'undefined') {
      localStorage.setItem('onboarding_reply_done', 'true');
    }
  }, [replyDraft]);

  // Load attachments once email is loaded
  useEffect(() => {
    if (!emailId || !email) return;
    setAttachmentsLoading(true);
    emailsApi.getAttachments(emailId)
      .then(setAttachments)
      .catch(() => setAttachments([]))
      .finally(() => setAttachmentsLoading(false));
  }, [emailId, email]);

  // Meeting detection: run when email loads (skip spam/newsletters)
  useEffect(() => {
    if (!emailId || !email) return;
    const cat = email.ai_analysis?.category;
    if (cat === 'spam' || cat === 'newsletter') return;
    emailsApi.getMeetingInfo(emailId)
      .then((info) => { if (info.is_meeting_request) setMeetingInfo(info); })
      .catch(() => {});
  }, [emailId, email?.id]);

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session)       return null;

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

  const handleStar = async () => {
    if (!emailId || !email) return;
    const currentStarred = isStarred !== null ? isStarred : email.is_starred;
    const next = !currentStarred;
    setIsStarred(next); // optimistic
    setIsStarring(true);
    try {
      await emailsApi.starEmail(emailId, next);
      await mutateEmail();
    } catch {
      setIsStarred(currentStarred); // revert
      toast.error('Failed to update star');
    } finally {
      setIsStarring(false);
    }
  };

  const handleDelete = async () => {
    if (!emailId) return;
    if (!confirm('Remove this email from InboxIQ? It will not be synced again.')) return;
    setIsDeleting(true);
    try {
      await emailsApi.deleteEmail(emailId);
      toast.success('Email removed — won\'t sync again');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to delete email');
      setIsDeleting(false);
    }
  };

  const handleDownloadAttachment = async (att: Attachment) => {
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${base}/api/emails/${emailId}/attachments/${att.attachment_id}/download?filename=${encodeURIComponent(att.filename)}&mime_type=${encodeURIComponent(att.mime_type)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${sess?.access_token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = att.filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Failed to download attachment');
    }
  };

  const handleGenerateQuote = async () => {
    if (!emailId) return;
    setIsGeneratingQuote(true);
    try {
      const result = await emailsApi.generateQuote(emailId, {
        project_description: quoteProjectDesc || undefined,
        budget_hint: quoteBudgetHint || undefined,
      });
      setGeneratedQuote(result.quote);
      toast.success('Quote generated!');
    } catch {
      toast.error('Failed to generate quote');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const handleCopyQuote = () => {
    if (!generatedQuote) return;
    const lines = [
      `PROJECT QUOTE: ${generatedQuote.project_title}`,
      '',
      generatedQuote.project_description,
      '',
      'DELIVERABLES:',
      ...generatedQuote.deliverables.map((d) => `• ${d}`),
      '',
      `Timeline: ${generatedQuote.timeline}`,
      `Price Estimate: ${generatedQuote.price_estimate}`,
      `Payment Terms: ${generatedQuote.payment_terms}`,
      `Validity: ${generatedQuote.validity}`,
      ...(generatedQuote.notes ? ['', `Notes: ${generatedQuote.notes}`] : []),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Quote copied to clipboard');
  };

  if (emailLoading) {
    return (
      <Layout title="Loading…">
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
      </Layout>
    );
  }

  if (emailError || !email) {
    return (
      <Layout title="Email not found">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="btn-secondary text-sm mb-6">
            <ArrowLeft className="h-4 w-4 mr-1.5" />Back
          </button>
          <div className="card p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Email not found</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This email may have been deleted or is not accessible.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const analysis = email.ai_analysis;

  return (
    <>
      {viewingAttachment && emailId && (
        <AttachmentViewer
          attachment={viewingAttachment}
          emailId={emailId}
          onClose={() => setViewingAttachment(null)}
        />
      )}
      {snoozeOpen && emailId && (
        <SnoozeModal
          emailId={emailId}
          currentSnooze={email?.snooze_until ?? null}
          onSnoozed={() => { setSnoozeOpen(false); mutateEmail(); }}
          onClose={() => setSnoozeOpen(false)}
        />
      )}

      {/* Quote Generator Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Generate Project Quote</h2>
              </div>
              <button
                onClick={() => { setQuoteModalOpen(false); setGeneratedQuote(null); setQuoteProjectDesc(''); setQuoteBudgetHint(''); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!generatedQuote ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Optionally provide extra context to improve the quote.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Project Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={quoteProjectDesc}
                      onChange={(e) => setQuoteProjectDesc(e.target.value)}
                      placeholder="Describe the project scope or any extra details..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Budget Hint <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={quoteBudgetHint}
                      onChange={(e) => setQuoteBudgetHint(e.target.value)}
                      placeholder="e.g. $500–$1000 or client mentioned a tight budget"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateQuote}
                      disabled={isGeneratingQuote}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingQuote ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
                      ) : (
                        <><FileEdit className="h-4 w-4" />Generate Quote</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Generated Quote Card */}
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 space-y-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{generatedQuote.project_title}</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{generatedQuote.project_description}</p>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Deliverables</p>
                      <ul className="space-y-1">
                        {generatedQuote.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timeline</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{generatedQuote.timeline}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price Estimate</p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{generatedQuote.price_estimate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment Terms</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{generatedQuote.payment_terms}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Validity</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{generatedQuote.validity}</p>
                      </div>
                    </div>

                    {generatedQuote.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">{generatedQuote.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-between">
                    <button
                      onClick={() => setGeneratedQuote(null)}
                      className="btn-secondary text-sm"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleCopyQuote}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      Copy to Clipboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Head><title>{email.subject} — InboxIQ</title></Head>
      <Layout title="Email Detail">
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">

          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => router.back()} className="btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="btn-secondary text-sm"
              >
                {isReprocessing
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <RefreshCw className="h-4 w-4 mr-1.5" />}
                <span className="hidden sm:inline">{isReprocessing ? 'Processing…' : 'Re-process with AI'}</span>
                <span className="sm:hidden">{isReprocessing ? '…' : 'AI'}</span>
              </button>

              {/* Star button */}
              <button
                onClick={handleStar}
                disabled={isStarring}
                className="btn-secondary text-sm"
                title={(isStarred !== null ? isStarred : email.is_starred) ? 'Unstar' : 'Star'}
              >
                <Star
                  className={clsx(
                    'h-4 w-4',
                    (isStarred !== null ? isStarred : email.is_starred)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-400'
                  )}
                />
                <span className="hidden sm:inline ml-1.5">
                  {(isStarred !== null ? isStarred : email.is_starred) ? 'Starred' : 'Star'}
                </span>
              </button>

              {/* Snooze button */}
              <button
                onClick={() => setSnoozeOpen(true)}
                className="btn-secondary text-sm"
                title="Snooze"
              >
                <AlarmClock className="h-4 w-4 text-blue-500" />
                <span className="hidden sm:inline ml-1.5">Snooze</span>
              </button>

              {/* Generate Quote button — shown for quote_request emails */}
              {(String(analysis?.category ?? '').toLowerCase().includes('quote') || String(analysis?.category ?? '') === 'needs_response') && (
                <button
                  onClick={() => { setQuoteModalOpen(true); setGeneratedQuote(null); }}
                  className="btn-secondary text-sm"
                  title="Generate Quote"
                >
                  <FileEdit className="h-4 w-4 text-emerald-500" />
                  <span className="hidden sm:inline ml-1.5">Generate Quote</span>
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>

          {/* Email header card */}
          <div className="card p-4 sm:p-6 animate-slide-up">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-base font-bold shadow-sm">
                {(email.from_name || email.from_email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug break-words">
                  {email.subject}
                </h1>
                <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <strong className="font-medium text-gray-900 dark:text-gray-100 truncate">{email.from_name || email.from_email}</strong>
                    {email.from_name && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs hidden sm:inline">({email.from_email})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{format(new Date(email.received_at), 'MMM d, yyyy · h:mm a')}</span>
                  </span>
                  {email.to_email && (
                    <span className="flex items-center gap-1.5 hidden sm:flex">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[200px]">{email.to_email}</span>
                    </span>
                  )}
                </div>
                {(analysis?.category || analysis?.priority_level) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.category && <CategoryBadge category={analysis.category} />}
                    {analysis.priority_level && (
                      <PriorityBadge level={analysis.priority_level} score={analysis.priority_score} showScore />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Detection Banner */}
            {meetingInfo && meetingInfo.is_meeting_request && (
              <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Meeting Request Detected
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                        {meetingInfo.meeting_type && (
                          <span className="capitalize">{meetingInfo.meeting_type.replace('_', ' ')}</span>
                        )}
                        {meetingInfo.duration_hint && <span>{meetingInfo.duration_hint}</span>}
                        {meetingInfo.proposed_times && meetingInfo.proposed_times.length > 0 && (
                          <span>Proposed: {meetingInfo.proposed_times.join(', ')}</span>
                        )}
                      </div>
                      {meetingInfo.agenda && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{meetingInfo.agenda}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMeetingInfo(null)}
                    className="flex-shrink-0 p-1 rounded text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {meetingInfo.suggested_reply_snippet && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700 flex items-start justify-between gap-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400 italic flex-1">{meetingInfo.suggested_reply_snippet}</p>
                    <button
                      onClick={() => {
                        // Dispatch a custom event that ReplyEditor could listen to, or simply copy to clipboard
                        if (meetingInfo.suggested_reply_snippet) {
                          navigator.clipboard.writeText(meetingInfo.suggested_reply_snippet);
                          toast.success('Suggested reply copied to clipboard');
                        }
                      }}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-800/30 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors whitespace-nowrap"
                    >
                      <ClipboardCopy className="h-3 w-3" />
                      Copy Reply
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Email body */}
            <div className="mt-5 border-t border-gray-100 dark:border-gray-700 pt-5">
              {email.body_html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: email.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                  {email.body_text || email.snippet}
                </pre>
              )}
            </div>

            {/* Attachments */}
            {(attachmentsLoading || attachments.length > 0) && (
              <div className="mt-5 border-t border-gray-100 dark:border-gray-700 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Attachments {attachments.length > 0 && `(${attachments.length})`}
                  </span>
                </div>
                {attachmentsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading attachments…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => {
                      const FileIcon = getFileIcon(att.mime_type);
                      const colorClass = getFileColor(att.mime_type);
                      return (
                        <div
                          key={att.attachment_id}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 group hover:border-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{att.filename}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(att.size)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setViewingAttachment(att)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Analysis + Action Items — stacked on mobile, side-by-side on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* AI Analysis Panel */}
            {analysis && (
              <div className="card p-4 sm:p-5 animate-slide-up stagger-2">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Analysis</h2>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                    {Math.round(analysis.confidence * 100)}% confidence
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Summary</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Priority Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            analysis.priority_score >= 7 ? 'bg-red-500'
                            : analysis.priority_score >= 4 ? 'bg-amber-500'
                            : 'bg-green-500'
                          }`}
                          style={{ width: `${(analysis.priority_score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-8 text-right">
                        {analysis.priority_score}/10
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Sentiment</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      analysis.sentiment === 'positive' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : analysis.sentiment === 'negative' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {analysis.sentiment}
                    </span>
                  </div>
                  {analysis.key_topics && analysis.key_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Key Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.key_topics.map((topic) => (
                          <span key={topic} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <Tag className="h-3 w-3" />{topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Items */}
            <div className="card p-4 sm:p-5 animate-slide-up stagger-3">
              <div className="flex items-center gap-2 mb-4">
                <List className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Action Items</h2>
                <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {actions.length}
                </span>
              </div>
              {actionsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : actions.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckSquare className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No action items extracted</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Re-process the email to generate action items</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <ActionItem key={action.id} action={action} onUpdate={(updated) =>
                      setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                    } />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reply Editor */}
          <div className="animate-slide-up stagger-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Reply Draft</h2>
            </div>
            <ReplyEditor emailId={email.id} draft={replyDraft} onSent={() => mutateEmail()} />
          </div>

        </div>
      </Layout>
    </>
  );
}
