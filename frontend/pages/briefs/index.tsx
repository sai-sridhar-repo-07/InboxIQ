import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { FileText, Plus, Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { briefsApi } from '@/lib/api';
import type { MeetingBrief } from '@/lib/types';

function BriefCard({ brief }: { brief: MeetingBrief }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-start justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{brief.meeting_title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{brief.meeting_time ? new Date(brief.meeting_time).toLocaleString() : 'No time set'}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {brief.attendee_emails.length} attendee{brief.attendee_emails.length !== 1 ? 's' : ''}
            </span>
            <span>Generated {formatDistanceToNow(new Date(brief.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {brief.attendee_emails.map(e => (
              <span key={e} className="rounded-full bg-primary-50 dark:bg-primary-900/20 px-2.5 py-0.5 text-xs text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-700">
                {e}
              </span>
            ))}
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans leading-relaxed">
            {brief.brief_content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function BriefsPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [briefs, setBriefs] = useState<MeetingBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title: '', startTime: '', attendees: '', description: '' });

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  const load = async () => {
    try {
      const data = await briefsApi.getAll();
      setBriefs(data.briefs || []);
    } catch {
      toast.error('Failed to load briefs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session) load(); }, [session]);

  const handleGenerate = async () => {
    if (!form.title || !form.attendees) return toast.error('Title and attendees required');
    setGenerating(true);
    try {
      const emails = form.attendees.split(',').map(s => s.trim()).filter(Boolean);
      await briefsApi.generate(form.title, form.startTime, emails, form.description);
      toast.success('Brief generated!');
      setShowForm(false);
      setForm({ title: '', startTime: '', attendees: '', description: '' });
      await load();
    } catch {
      toast.error('Failed to generate brief');
    } finally {
      setGenerating(false);
    }
  };

  if (sessionLoading || !session) return <LoadingSpinner fullPage />;

  return (
    <>
      <Head><title>Meeting Briefs — Mailair</title></Head>
      <Layout title="Meeting Briefs">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated pre-meeting context from your email history</p>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Generate Brief
            </button>
          </div>

          {showForm && (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New Meeting Brief</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Title</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Q2 Review with Acme" className="input mt-1 w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Start Time</label>
                  <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="input mt-1 w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Attendee Emails (comma-separated)</label>
                <input value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} placeholder="john@acme.com, sarah@acme.com" className="input mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Meeting Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Quarterly business review" className="input mt-1 w-full resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm">
                  {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : 'Generate Brief'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-20" />)}</div>
          ) : briefs.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No briefs yet. Generate one before your next meeting.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {briefs.map(brief => <BriefCard key={brief.id} brief={brief} />)}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
