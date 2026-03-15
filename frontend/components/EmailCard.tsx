import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, CheckSquare } from 'lucide-react';
import clsx from 'clsx';
import type { Email } from '@/lib/types';
import PriorityBadge from './PriorityBadge';
import CategoryBadge from './CategoryBadge';

interface EmailCardProps {
  email: Email;
  className?: string;
}

export default function EmailCard({ email, className }: EmailCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/email/${email.id}`);
  };

  const analysis = email.ai_analysis;
  const timeAgo = formatDistanceToNow(new Date(email.received_at), { addSuffix: true });

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'card group flex cursor-pointer items-start gap-4 p-4 transition-all hover:shadow-md hover:border-gray-300',
        !email.is_read && 'border-l-4 border-l-primary-500',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Sender Avatar */}
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
          {(email.from_name || email.from_email || '?')[0].toUpperCase()}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx('text-sm font-semibold text-gray-900 truncate', !email.is_read && 'font-bold')}>
                {email.from_name || email.from_email}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
            </div>
            <p className={clsx('mt-0.5 text-sm truncate', email.is_read ? 'text-gray-700' : 'text-gray-900 font-medium')}>
              {email.subject}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors" />
        </div>

        {/* AI Summary */}
        {analysis?.summary && (
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {analysis.summary}
          </p>
        )}

        {/* Badges row */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {analysis?.category && (
            <CategoryBadge category={analysis.category} size="sm" />
          )}
          {analysis?.priority_level && (
            <PriorityBadge level={analysis.priority_level} size="sm" />
          )}
          {(email.action_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 border border-primary-100">
              <CheckSquare className="h-3 w-3" />
              {email.action_count} action{(email.action_count ?? 0) > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
