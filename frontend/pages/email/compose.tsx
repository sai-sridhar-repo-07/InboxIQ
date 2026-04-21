import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useRef, useEffect } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { ArrowLeft, Send, Loader2, X, Sparkles, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { emailsApi } from '@/lib/api';

const MAX_CHARS = 10000;

export default function ComposePage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendCountdown, setSendCountdown] = useState<number | null>(null);
  const sendRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI draft
  const [aiContext, setAiContext] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Schedule send
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  if (sessionLoading) return <LoadingSpinner fullPage />;
  if (!session) return null;

  const handleSend = () => {
    if (!to.trim()) { toast.error('Recipient is required'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Message body is required'); return; }
    let countdown = 5;
    setSendCountdown(countdown);
    const tick = setInterval(() => {
      countdown--;
      setSendCountdown(countdown);
      if (countdown <= 0) {
        clearInterval(tick);
        setSendCountdown(null);
        doSend();
      }
    }, 1000);
    sendRef.current = tick;
  };

  const handleUndo = () => {
    if (sendRef.current) clearInterval(sendRef.current);
    setSendCountdown(null);
    toast('Send cancelled');
  };

  const doSend = async () => {
    setSending(true);
    try {
      await emailsApi.composeEmail(to.trim(), subject.trim(), body.trim());
      toast.success('Email sent!');
      router.push('/email');
    } catch {
      toast.error('Failed to send. Check Gmail connection.');
    } finally {
      setSending(false);
    }
  };

  const handleAiDraft = async () => {
    if (!subject.trim() && !to.trim()) {
      toast.error('Enter a recipient and subject first');
      return;
    }
    setGeneratingDraft(true);
    try {
      const result = await emailsApi.aiDraft(to.trim(), subject.trim(), aiContext.trim());
      setBody(result.draft);
      setShowAiPanel(false);
      setAiContext('');
      toast.success('AI draft generated');
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleScheduleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Fill in all fields before scheduling');
      return;
    }
    if (!scheduleAt) {
      toast.error('Pick a date/time to schedule');
      return;
    }
    const sendAt = new Date(scheduleAt);
    if (sendAt <= new Date()) {
      toast.error('Schedule time must be in the future');
      return;
    }
    setScheduling(true);
    try {
      await emailsApi.scheduleSend(to.trim(), subject.trim(), body.trim(), sendAt.toISOString());
      toast.success(`Email scheduled for ${sendAt.toLocaleString()}`);
      router.push('/email');
    } catch {
      toast.error('Failed to schedule email');
    } finally {
      setScheduling(false);
    }
  };

  // Min datetime for schedule input (now + 2 min)
  const minSchedule = new Date(Date.now() + 2 * 60000).toISOString().slice(0, 16);

  return (
    <>
      <Head><title>Compose — Mailair</title></Head>
      <Layout title="Compose Email">
        <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />Back
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">New Email</h1>
          </div>

          <div className="card p-5 space-y-4">
            {/* To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="input-field w-full"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="input-field w-full"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Message</label>
                <button
                  type="button"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Draft
                </button>
              </div>

              {showAiPanel && (
                <div className="mb-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 space-y-2">
                  <p className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    Describe what you want to say (optional)
                  </p>
                  <input
                    type="text"
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="e.g. Follow up on the proposal, ask about timeline"
                    className="input-field w-full text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiDraft(); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAiPanel(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={generatingDraft}
                      className="btn-primary text-xs gap-1.5 py-1"
                    >
                      {generatingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {generatingDraft ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={body}
                onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setBody(e.target.value); }}
                placeholder="Write your message here…"
                rows={12}
                className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{body.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}</p>
            </div>

            {/* Schedule panel */}
            {showSchedule && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Schedule for later</p>
                </div>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  min={minSchedule}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="input-field w-full text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSchedule(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleSend}
                    disabled={scheduling || !scheduleAt}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {scheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    {scheduling ? 'Scheduling…' : 'Schedule Send'}
                  </button>
                </div>
              </div>
            )}

            {/* Undo send bar */}
            {sendCountdown !== null && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                  Sending in {sendCountdown}s…
                </span>
                <button
                  onClick={handleUndo}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />Undo
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 justify-between">
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                Schedule
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="btn-secondary text-sm"
                >
                  Discard
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || sendCountdown !== null || !to || !subject || !body}
                  className="btn-primary text-sm gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
