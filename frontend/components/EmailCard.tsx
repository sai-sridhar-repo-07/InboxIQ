import { useState } from 'react';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, CheckSquare, Paperclip, X, Star, AlarmClock, Zap, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { Email } from '@/lib/types';
import PriorityBadge from './PriorityBadge';
import CategoryBadge from './CategoryBadge';
import { emailsApi } from '@/lib/api';
import SnoozeModal from './SnoozeModal';

interface EmailCardProps {
  email: Email;
  className?: string;
  onDismiss?: (id: string) => void;
  onProcessed?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

// Gradient colors for avatars based on first letter
const AVATAR_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-teal-400 to-teal-600',
];

function getGradient(name: string) {
  const code = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[code];
}

export default function EmailCard({ email, className, onDismiss, onProcessed, selected, onToggleSelect }: EmailCardProps) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [starred, setStarred] = useState(email.is_starred);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const handleClick = () => {
    if (onToggleSelect) return; // in selection mode, don't navigate
    router.push(`/email/${email.id}`);
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissing(true);
    try {
      await emailsApi.deleteEmail(email.id);
      onDismiss?.(email.id);
      toast.success('Email removed — won\'t sync again');
    } catch {
      toast.error('Failed to remove email');
      setDismissing(false);
    }
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !starred;
    setStarred(next); // optimistic update
    try {
      await emailsApi.starEmail(email.id, next);
    } catch {
      setStarred(!next); // revert
      toast.error('Failed to update star');
    }
  };

  const handleProcess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessing(true);
    try {
      await emailsApi.processEmail(email.id);
      toast.success('Processing with AI…');
      onProcessed?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Failed to process email');
    } finally {
      setProcessing(false);
    }
  };

  const handleSnoozeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSnoozeOpen(true);
  };

  const analysis  = email.ai_analysis;
  const senderName = email.from_name || email.from_email || '?';
  const timeAgo   = formatDistanceToNow(new Date(email.received_at), { addSuffix: true });
  const gradient  = getGradient(senderName);
  const isSnoozed = !!(email.snooze_until);

  return (
    <>
      <div
        onClick={onToggleSelect ? onToggleSelect : handleClick}
        className={clsx(
          'card card-hover group flex cursor-pointer items-start gap-3 sm:gap-4 p-3 sm:p-4 relative',
          !email.is_read && 'border-l-4 border-l-primary-500',
          dismissing && 'opacity-40 pointer-events-none',
          selected && 'ring-2 ring-primary-500 bg-primary-50/50',
          className
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && (onToggleSelect ? onToggleSelect() : handleClick())}
      >
        {/* Checkbox (selection mode) */}
        {onToggleSelect && (
          <div className="flex-shrink-0 flex items-center mt-1" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Sender Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
            {senderName[0].toUpperCase()}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx(
                  'text-sm truncate max-w-[160px] sm:max-w-none',
                  !email.is_read ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-semibold text-gray-700 dark:text-gray-300'
                )}>
                  {senderName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:inline">{timeAgo}</span>
              </div>
              <p className={clsx(
                'mt-0.5 text-sm leading-snug line-clamp-1',
                !email.is_read ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'
              )}>
                {email.subject}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">{timeAgo}</span>
              {/* Star button */}
              <button
                onClick={handleStar}
                className={clsx(
                  'rounded p-0.5 transition-all duration-150',
                  starred
                    ? 'text-amber-400'
                    : 'opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 hover:text-amber-400'
                )}
                title={starred ? 'Unstar' : 'Star'}
              >
                <Star className={clsx('h-3.5 w-3.5', starred && 'fill-amber-400')} />
              </button>
              {/* Snooze button */}
              <button
                onClick={handleSnoozeClick}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150"
                title="Snooze"
              >
                <AlarmClock className="h-3.5 w-3.5" />
              </button>
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150"
                title="Remove — won't sync again"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-400 transition-all duration-150 group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* AI Summary */}
          {analysis?.summary && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed hidden sm:block">
              {analysis.summary}
            </p>
          )}

          {/* Badges row */}
          <div className="mt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Process with AI button — only shown for unprocessed emails */}
            {!email.processed && !email.ai_analysis && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                {processing ? 'Processing…' : 'Process with AI'}
              </button>
            )}
            {analysis?.category && (
              <CategoryBadge category={analysis.category} size="sm" />
            )}
            {analysis?.priority_level && (
              <PriorityBadge level={analysis.priority_level} size="sm" />
            )}
            {(email.action_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 border border-primary-100">
                <CheckSquare className="h-3 w-3" />
                {email.action_count}
              </span>
            )}
            {(email as any).has_attachments && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                <Paperclip className="h-3 w-3" />
                Attachments
              </span>
            )}
            {isSnoozed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 border border-blue-100">
                <AlarmClock className="h-3 w-3" />
                Snoozed
              </span>
            )}
          </div>
        </div>
      </div>

      {snoozeOpen && (
        <SnoozeModal
          emailId={email.id}
          currentSnooze={email.snooze_until ?? null}
          onSnoozed={() => {
            setSnoozeOpen(false);
            onDismiss?.(email.id);
          }}
          onClose={() => setSnoozeOpen(false)}
        />
      )}
    </>
  );
}
