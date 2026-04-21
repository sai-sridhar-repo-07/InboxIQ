import { WifiOff, RefreshCw } from 'lucide-react';

interface PageErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function PageError({ message = 'Failed to load data', onRetry }: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 mb-4">
        <WifiOff className="h-6 w-6 text-red-400" />
      </div>
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{message}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Check your connection or try again.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
