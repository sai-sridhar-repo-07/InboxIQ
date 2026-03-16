import { X, FileText } from 'lucide-react';

interface SummaryItem {
  id: string;
  summary: string;
}

interface BulkSummaryModalProps {
  summaries: SummaryItem[];
  onClose: () => void;
}

export default function BulkSummaryModal({ summaries, onClose }: BulkSummaryModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                AI Summaries ({summaries.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {summaries.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4"
              >
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                  Email {idx + 1}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
