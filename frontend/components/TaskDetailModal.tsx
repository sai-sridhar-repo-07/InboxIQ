import { useState } from 'react';
import { X, Loader2, Check, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { actionsApi } from '@/lib/api';
import type { Action } from '@/lib/types';

interface TaskDetailModalProps {
  action: Action;
  onClose: () => void;
  onUpdate: (a: Action) => void;
  onDelete: (id: string) => void;
}

export default function TaskDetailModal({ action, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const router = useRouter();
  const [task, setTask] = useState(action.task);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>((action.priority as 'high' | 'medium' | 'low') || 'medium');
  const [deadline, setDeadline] = useState(
    action.deadline ? new Date(action.deadline).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState(action.notes || '');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCompleted = action.status === 'completed';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await actionsApi.updateAction(action.id, {
        status: action.status,
        notes: notes.trim() || undefined,
        deadline: deadline || undefined,
      });
      onUpdate({ ...updated, task, priority });
      toast.success('Task updated');
      onClose();
    } catch {
      toast.error('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const updated = await actionsApi.updateAction(action.id, { status: 'completed' });
      onUpdate({ ...action, ...updated, status: 'completed' });
      toast.success('Task marked complete');
      onClose();
    } catch {
      toast.error('Failed to update task');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await actionsApi.deleteAction(action.id);
      onDelete(action.id);
      toast.success('Task deleted');
      onClose();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Task Details</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Task */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Linked email */}
          {action.email_id && (
            <button
              onClick={() => router.push(`/email/${action.email_id}`)}
              className="w-full flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {(action as any).emails?.subject || 'View linked email'}
              </span>
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 transition-colors"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>

            {!isCompleted && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="rounded-lg border border-green-200 dark:border-green-800 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-1.5 transition-colors"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Complete
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
