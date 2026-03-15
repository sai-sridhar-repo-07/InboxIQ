import { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { Calendar, Loader2, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { actionsApi } from '@/lib/api';
import type { Action } from '@/lib/types';

interface ActionItemProps {
  action: Action;
  onUpdate?: (updated: Action) => void;
  className?: string;
}

export default function ActionItem({ action, onUpdate, className }: ActionItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isCompleted = action.status === 'completed';
  const isOverdue = action.deadline && isPast(parseISO(action.deadline)) && !isCompleted;

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      const newStatus = isCompleted ? 'pending' : 'completed';
      const updated = await actionsApi.updateAction(action.id, { status: newStatus });
      onUpdate?.(updated);
      toast.success(newStatus === 'completed' ? 'Action marked complete!' : 'Action reopened');
    } catch {
      toast.error('Failed to update action');
    } finally {
      setIsUpdating(false);
    }
  };

  const priorityColor = {
    high: 'text-red-600',
    medium: 'text-amber-600',
    low: 'text-gray-400',
  }[action.priority];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isCompleted ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        className
      )}
    >
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-50"
        aria-label={isCompleted ? 'Mark as pending' : 'Mark as complete'}
      >
        {isUpdating ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            'text-sm font-medium leading-snug',
            isCompleted ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'
          )}
        >
          {action.description}
        </p>

        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
          <span
            className={clsx(
              'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
              {
                high: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
                low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
              }[action.priority]
            )}
          >
            {action.priority} priority
          </span>

          {action.deadline && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Calendar className="h-3 w-3" />
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {format(parseISO(action.deadline), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {action.notes && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">{action.notes}</p>
        )}
      </div>
    </div>
  );
}
