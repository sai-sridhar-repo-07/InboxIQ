import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  emails?: Array<{ id: string }>;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  onOpenEmail?: (id: string) => void;
  onDismissEmail?: (id: string) => void;
  onStarEmail?: (id: string) => void;
  onOpenShortcuts?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({
  emails = [],
  selectedIndex = -1,
  onSelectIndex,
  onOpenEmail,
  onDismissEmail,
  onStarEmail,
  onOpenShortcuts,
  onEscape,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Skip if focused in an input, textarea, or contentEditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          const next = Math.min(selectedIndex + 1, emails.length - 1);
          onSelectIndex?.(next);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          const prev = Math.max(selectedIndex - 1, 0);
          onSelectIndex?.(prev);
          break;
        }
        case 'o':
        case 'Enter': {
          if (selectedIndex >= 0 && emails[selectedIndex]) {
            e.preventDefault();
            onOpenEmail?.(emails[selectedIndex].id);
          }
          break;
        }
        case 'd': {
          if (selectedIndex >= 0 && emails[selectedIndex]) {
            e.preventDefault();
            onDismissEmail?.(emails[selectedIndex].id);
          }
          break;
        }
        case 's': {
          if (selectedIndex >= 0 && emails[selectedIndex]) {
            e.preventDefault();
            onStarEmail?.(emails[selectedIndex].id);
          }
          break;
        }
        case '?': {
          e.preventDefault();
          onOpenShortcuts?.();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onEscape?.();
          break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [emails, selectedIndex, onSelectIndex, onOpenEmail, onDismissEmail, onStarEmail, onOpenShortcuts, onEscape]);
}
