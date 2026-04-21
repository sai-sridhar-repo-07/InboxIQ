import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'j / ↓', action: 'Select next email' },
  { key: 'k / ↑', action: 'Select previous email' },
  { key: 'o / Enter', action: 'Open selected email' },
  { key: 'e', action: 'Archive (remove) focused email' },
  { key: 'd', action: 'Dismiss selected email' },
  { key: 's', action: 'Star / unstar selected email' },
  { key: '/', action: 'Focus search bar' },
  { key: '?', action: 'Open this shortcuts panel' },
  { key: 'Esc', action: 'Close modals / deselect' },
];

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts table */}
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-1/3">Key</th>
                <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {shortcuts.map(({ key, action }) => (
                <tr key={key}>
                  <td className="py-2.5">
                    <kbd className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
                      {key}
                    </kbd>
                  </td>
                  <td className="py-2.5 text-sm text-gray-700 dark:text-gray-300">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400 text-center">Shortcuts are disabled while typing in inputs</p>
        </div>
      </div>
    </div>
  );
}
