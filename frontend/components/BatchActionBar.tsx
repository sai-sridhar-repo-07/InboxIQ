import { useState } from 'react';
import { CheckCheck, Eye, Trash2, X, Loader2, FileText } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { emailsApi } from '@/lib/api';

interface BatchActionBarProps {
  selectedIds: Set<string>;
  onCancel: () => void;
  onComplete: () => void;
  onSummarize?: (summaries: Array<{ id: string; summary: string }>) => void;
}

export default function BatchActionBar({ selectedIds, onCancel, onComplete, onSummarize }: BatchActionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const ids = Array.from(selectedIds);
  const count = ids.length;

  const handleMarkRead = async () => {
    setLoading('read');
    try {
      const { updated } = await emailsApi.bulkMarkRead(ids);
      toast.success(`Marked ${updated} email${updated !== 1 ? 's' : ''} as read`);
      onComplete();
    } catch {
      toast.error('Failed to mark as read');
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = async () => {
    setLoading('dismiss');
    try {
      const { dismissed } = await emailsApi.bulkDismiss(ids);
      toast.success(`Dismissed ${dismissed} email${dismissed !== 1 ? 's' : ''}`);
      onComplete();
    } catch {
      toast.error('Failed to dismiss emails');
    } finally {
      setLoading(null);
    }
  };

  const handleSummarize = async () => {
    if (ids.length > 10) {
      toast.error('Summarize supports up to 10 emails at a time');
      return;
    }
    setLoading('summarize');
    try {
      const results = await emailsApi.bulkSummarize(ids);
      if (onSummarize) {
        onSummarize(results);
      } else {
        toast.success(`Generated ${results.length} summaries`);
      }
    } catch {
      toast.error('Failed to summarize emails');
    } finally {
      setLoading(null);
    }
  };

  const handleBulkProcess = async () => {
    setLoading('process');
    try {
      // Use existing bulk process (processes all unprocessed)
      const { count: processed } = await emailsApi.bulkProcess();
      toast.success(processed > 0 ? `Processing ${processed} emails with AI…` : 'All emails already processed!');
      onComplete();
    } catch {
      toast.error('Failed to start processing');
    } finally {
      setLoading(null);
    }
  };

  if (count === 0) return null;

  return (
    <div className="sticky top-14 z-20 bg-primary-600 text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-lg animate-slide-down">
      <span className="text-sm font-semibold shrink-0">
        {count} selected
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleMarkRead}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'read' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Mark read
        </button>

        {count <= 10 && (
          <button
            onClick={handleSummarize}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading === 'summarize' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Summarize
          </button>
        )}

        <button
          onClick={handleBulkProcess}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'process' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
          Process with AI
        </button>

        <button
          onClick={handleDismiss}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'dismiss' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Dismiss
        </button>
      </div>

      <button
        onClick={onCancel}
        className="shrink-0 rounded-lg p-1.5 hover:bg-white/20 transition-colors"
        title="Cancel selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
