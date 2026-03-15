import { useState, useEffect } from 'react';
import { Send, Save, Zap, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { repliesApi, emailsApi } from '@/lib/api';
import type { ReplyDraft } from '@/lib/types';

interface ReplyEditorProps {
  emailId: string;
  draft: ReplyDraft | null | undefined;
  onSent?: () => void;
  className?: string;
}

const MAX_CHARS = 5000;

export default function ReplyEditor({ emailId, draft, onSent, className }: ReplyEditorProps) {
  const [content, setContent] = useState(draft?.draft_content ?? '');
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confidence, setConfidence] = useState(draft?.confidence_score);

  useEffect(() => {
    if (draft?.draft_content) {
      setContent(draft.draft_content);
      setConfidence(draft.confidence_score);
      setHasChanges(false);
    }
  }, [draft?.draft_content]);

  const handleChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setContent(value);
      setHasChanges(value !== (draft?.draft_content ?? ''));
    }
  };

  const handleGenerate = async () => {
    if (!instructions.trim()) {
      toast.error('Enter instructions for the AI first');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await emailsApi.generateReply(emailId, instructions.trim());
      setContent(result.draft_content);
      setConfidence(result.confidence_score);
      setHasChanges(true);
      setInstructions('');
      toast.success('New draft generated');
    } catch {
      toast.error('Failed to generate reply');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await repliesApi.updateReplyDraft(emailId, content);
      setHasChanges(false);
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    setIsSending(true);
    try {
      await repliesApi.sendReply(emailId, content);
      toast.success('Reply sent successfully!');
      onSent?.();
    } catch {
      toast.error('Failed to send reply. Check Gmail connection.');
    } finally {
      setIsSending(false);
    }
  };

  const charPercentage = (content.length / MAX_CHARS) * 100;

  return (
    <div className={clsx('card', className)}>
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Reply Draft</h3>
          {confidence !== undefined && (
            <span className="rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
        {hasChanges && (
          <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Instruction input */}
        <div className="rounded-lg border border-primary-100 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-3">
          <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-2">Tell AI how to reply</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              placeholder='e.g. "Decline politely" or "Ask for more details by Friday"'
              className="flex-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !instructions.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>

        {/* Draft textarea */}
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="AI-generated reply will appear here. Use the field above to guide the AI, or edit directly."
          rows={8}
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors placeholder-gray-400 dark:placeholder-gray-500"
        />

        {/* Character count bar */}
        <div className="flex items-center justify-between">
          <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mr-3">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                charPercentage > 90 ? 'bg-red-500' : charPercentage > 70 ? 'bg-amber-500' : 'bg-primary-500'
              )}
              style={{ width: `${Math.min(charPercentage, 100)}%` }}
            />
          </div>
          <span
            className={clsx(
              'text-xs tabular-nums',
              content.length > MAX_CHARS * 0.9 ? 'text-red-500 font-medium' : 'text-gray-400'
            )}
          >
            {content.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="btn-secondary text-sm gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={handleSend}
            disabled={isSending || !content.trim()}
            className="btn-primary text-sm gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? 'Sending...' : 'Send via Gmail'}
          </button>
        </div>

        {draft?.is_sent && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              Reply sent {draft.sent_at ? `on ${new Date(draft.sent_at).toLocaleDateString()}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
