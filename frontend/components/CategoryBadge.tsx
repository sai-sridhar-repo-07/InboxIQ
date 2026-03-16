import clsx from 'clsx';
import {
  AlertCircle,
  MessageSquare,
  Clock,
  Info,
  Mail,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import type { EmailCategory } from '@/lib/types';

interface CategoryBadgeProps {
  category: EmailCategory;
  size?: 'sm' | 'md';
}

const categoryConfig: Record<
  EmailCategory,
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  urgent: {
    label: 'Urgent',
    classes: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    Icon: AlertCircle,
  },
  needs_response: {
    label: 'Needs Response',
    classes: 'bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800',
    Icon: MessageSquare,
  },
  follow_up: {
    label: 'Follow Up',
    classes: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    Icon: Clock,
  },
  fyi: {
    label: 'FYI',
    classes: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    Icon: Info,
  },
  newsletter: {
    label: 'Newsletter',
    classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
    Icon: Mail,
  },
  spam: {
    label: 'Spam',
    classes: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    Icon: AlertTriangle,
  },
  other: {
    label: 'Other',
    classes: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
    Icon: Tag,
  },
};

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const config = categoryConfig[category] ?? categoryConfig.other;
  const { Icon } = config;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </span>
  );
}
