import { useState } from 'react';
import { Check, Trash2, Link, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Action } from '@/lib/types';

interface TaskCardProps {
  action: Action;
  onUpdate: (a: Action) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

const priorityDot: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-500',
};

function formatDeadline(deadline: string): { label: string; overdue: boolean } {
  const d = new Date(deadline);
  const now = new Date();
  const overdue = d < now;
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return { label, overdue };
}

export default function TaskCard({ action, onUpdate, onDelete, onClick }: TaskCardProps) {
  const [hovering, setHovering] = useState(false);

  const deadline = action.deadline ? formatDeadline(action.deadline) : null;
  const isCompleted = action.status === 'completed';

  return (
    <div
      className={clsx(
        'group relative rounded-lg border p-3 cursor-pointer transition-all select-none',
        isCompleted
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 opacity-70'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      )}
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Priority dot + task */}
      <div className="flex items-start gap-2">
        <span
          className={clsx(
            'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
            priorityDot[action.priority || 'medium']
          )}
        />
        <p
          className={clsx(
            'text-sm font-medium leading-snug line-clamp-2',
            isCompleted
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-800 dark:text-gray-100'
          )}
        >
          {action.task}
        </p>
      </div>

      {/* Deadline */}
      {deadline && (
        <div
          className={clsx(
            'mt-2 flex items-center gap-1 text-xs',
            deadline.overdue && !isCompleted
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {deadline.overdue && !isCompleted && <AlertCircle className="h-3 w-3" />}
          {deadline.label}
        </div>
      )}

      {/* Email link */}
      {action.email_id && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Link className="h-3 w-3" />
          <span className="truncate max-w-[160px]">
            {(action as any).emails?.subject || 'Linked email'}
          </span>
        </div>
      )}

      {/* Hover actions */}
      {hovering && !isCompleted && (
        <div
          className="absolute top-2 right-2 flex gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onUpdate({ ...action, status: 'completed' })}
            className="rounded p-1 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60"
            title="Mark complete"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(action.id)}
            className="rounded p-1 bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
