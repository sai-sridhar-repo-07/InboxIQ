import clsx from 'clsx';
import type { PriorityLevel } from '@/lib/types';

interface PriorityBadgeProps {
  level?: PriorityLevel;
  score?: number;
  size?: 'sm' | 'md';
  showScore?: boolean;
}

function getPriorityFromScore(score: number): PriorityLevel {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

const priorityConfig: Record<PriorityLevel, { label: string; classes: string; dot: string }> = {
  high: {
    label: 'High Priority',
    classes: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    classes: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
};

export default function PriorityBadge({
  level,
  score,
  size = 'md',
  showScore = false,
}: PriorityBadgeProps) {
  const resolvedLevel: PriorityLevel =
    level ?? (score !== undefined ? getPriorityFromScore(score) : 'low');
  const config = priorityConfig[resolvedLevel];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
      {showScore && score !== undefined && (
        <span className="ml-0.5 opacity-75">({score}/10)</span>
      )}
    </span>
  );
}
