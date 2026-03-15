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
    classes: 'bg-red-100 text-red-700 border border-red-200',
    Icon: AlertCircle,
  },
  needs_response: {
    label: 'Needs Response',
    classes: 'bg-blue-100 text-blue-700 border border-blue-200',
    Icon: MessageSquare,
  },
  follow_up: {
    label: 'Follow Up',
    classes: 'bg-amber-100 text-amber-700 border border-amber-200',
    Icon: Clock,
  },
  fyi: {
    label: 'FYI',
    classes: 'bg-purple-100 text-purple-700 border border-purple-200',
    Icon: Info,
  },
  newsletter: {
    label: 'Newsletter',
    classes: 'bg-gray-100 text-gray-600 border border-gray-200',
    Icon: Mail,
  },
  spam: {
    label: 'Spam',
    classes: 'bg-orange-100 text-orange-700 border border-orange-200',
    Icon: AlertTriangle,
  },
  other: {
    label: 'Other',
    classes: 'bg-slate-100 text-slate-600 border border-slate-200',
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
