import { useState } from 'react';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, CheckSquare, Paperclip, X } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { Email } from '@/lib/types';
import PriorityBadge from './PriorityBadge';
import CategoryBadge from './CategoryBadge';
import { emailsApi } from '@/lib/api';

interface EmailCardProps {
  email: Email;
  className?: string;
  onDismiss?: (id: string) => void;
}

// Gradient colors for avatars based on first letter
const AVATAR_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
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

export default function EmailCard({ email, className, onDismiss }: EmailCardProps) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const handleClick = () => router.push(`/email/${email.id}`);

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

  const analysis  = email.ai_analysis;
  const senderName = email.from_name || email.from_email || '?';
  const timeAgo   = formatDistanceToNow(new Date(email.received_at), { addSuffix: true });
  const gradient  = getGradient(senderName);

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'card card-hover group flex cursor-pointer items-start gap-3 sm:gap-4 p-3 sm:p-4 relative',
        !email.is_read && 'border-l-4 border-l-primary-500',
        dismissing && 'opacity-40 pointer-events-none',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
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
                !email.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
              )}>
                {senderName}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{timeAgo}</span>
            </div>
            <p className={clsx(
              'mt-0.5 text-sm leading-snug line-clamp-1',
              !email.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'
            )}>
              {email.subject}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400 sm:hidden">{timeAgo}</span>
            <button
              onClick={handleDismiss}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all duration-150"
              title="Remove — won't sync again"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-400 transition-all duration-150 group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* AI Summary */}
        {analysis?.summary && (
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed hidden sm:block">
            {analysis.summary}
          </p>
        )}

        {/* Badges row */}
        <div className="mt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
              <Paperclip className="h-3 w-3" />
              Attachments
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
