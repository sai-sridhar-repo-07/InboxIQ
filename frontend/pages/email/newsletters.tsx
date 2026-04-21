import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Mail, ChevronRight, Loader2, Newspaper, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { emailsApi } from '@/lib/api';
import type { Email } from '@/lib/types';

interface SenderGroup {
  sender: string;
  name: string;
  emails: Email[];
  latestDate: string;
  unreadCount: number;
  hasUnsub: boolean;
}

function groupBySender(emails: Email[]): SenderGroup[] {
  const map = new Map<string, SenderGroup>();
  for (const email of emails) {
    const key = email.from_email || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        sender: key,
        name: email.from_name || key,
        emails: [],
        latestDate: email.received_at,
        unreadCount: 0,
        hasUnsub: false,
      });
    }
    const group = map.get(key)!;
    group.emails.push(email);
    if (!email.is_read) group.unreadCount++;
    if (email.received_at > group.latestDate) group.latestDate = email.received_at;
    if ((email.labels || []).some((l) => l.startsWith('__unsub__:'))) group.hasUnsub = true;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NewslettersPage() {
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/auth/signin');
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!session) return;
    emailsApi.getEmails({ category: 'newsletter', page_size: 200 }).then((res) => {
      setEmails(res.items || []);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load newsletters');
      setLoading(false);
    });
  }, [session]);

  const groups = useMemo(() => groupBySender(emails), [emails]);
  const selected = useMemo(() => groups.find((g) => g.sender === selectedSender), [groups, selectedSender]);

  const handleUnsubscribe = async (email: Email) => {
    setUnsubscribing(email.id);
    try {
      await emailsApi.unsubscribe(email.id);
      toast.success('Unsubscribe request sent');
    } catch {
      toast.error('Unsubscribe failed');
    } finally {
      setUnsubscribing(null);
    }
  };

  if (sessionLoading || !session) return <LoadingSpinner fullPage />;

  return (
    <>
      <Head><title>Newsletters — Mailair</title></Head>
      <Layout title="Newsletters">
        <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-10rem)]">
          {/* Sender list */}
          <div className="w-full lg:w-80 lg:shrink-0 card overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 max-h-64 lg:max-h-none">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {groups.length} senders
              </h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No newsletters found</div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.sender}
                  onClick={() => setSelectedSender(group.sender)}
                  className={`w-full text-left px-3 py-3 flex items-start gap-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${
                    selectedSender === group.sender ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{group.name}</p>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(group.latestDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{group.emails.length} emails</span>
                      {group.unreadCount > 0 && (
                        <span className="text-xs bg-primary-500 text-white rounded-full px-1.5 py-0.5">{group.unreadCount}</span>
                      )}
                      {group.hasUnsub && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">can unsub</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Email list for selected sender */}
          <div className="flex-1 card overflow-y-auto min-h-64">
            {!selectedSender ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <Mail className="h-10 w-10 opacity-40" />
                <p className="text-sm">Select a sender to view their newsletters</p>
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected?.name}</h2>
                    <p className="text-xs text-gray-500">{selected?.sender}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected?.hasUnsub && (
                      <button
                        onClick={() => {
                          const latestWithUnsub = selected.emails.find(
                            (e) => (e.labels || []).some((l) => l.startsWith('__unsub__:'))
                          );
                          if (latestWithUnsub) handleUnsubscribe(latestWithUnsub);
                        }}
                        disabled={!!unsubscribing}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        {unsubscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Unsubscribe
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(selected?.emails || []).map((email) => (
                    <Link
                      key={email.id}
                      href={`/email/${email.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${email.is_read ? 'bg-gray-200 dark:bg-gray-600' : 'bg-primary-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm truncate ${email.is_read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-gray-900 dark:text-gray-100'}`}>
                            {email.subject}
                          </p>
                          <span className="text-xs text-gray-400 shrink-0">{formatDate(email.received_at)}</span>
                        </div>
                        {email.snippet && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{email.snippet}</p>
                        )}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
