import { useState, useEffect } from 'react';
import { CheckCircle, Circle, X, ChevronRight, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Step {
  id: string;
  label: string;
  description: string;
  href?: string;
  action?: string;
}

const STEPS: Step[] = [
  {
    id: 'account',
    label: 'Create your account',
    description: 'You\'re in! Account created successfully.',
  },
  {
    id: 'gmail',
    label: 'Connect Gmail',
    description: 'Link your Gmail to start syncing emails.',
    href: '/settings',
    action: 'Connect now',
  },
  {
    id: 'sync',
    label: 'Sync your first emails',
    description: 'Fetch emails from your inbox.',
    action: 'Sync now',
  },
  {
    id: 'process',
    label: 'Process emails with AI',
    description: 'Let AI categorize and prioritize your emails.',
    action: 'Process all',
  },
  {
    id: 'reply',
    label: 'Generate an AI reply',
    description: 'Open an email and try the AI reply feature.',
    href: '/email',
    action: 'View inbox',
  },
];

interface Props {
  gmailConnected: boolean;
  hasEmails: boolean;
  hasProcessed: boolean;
  onSync: () => void;
  onProcessAll: () => void;
  isSyncing?: boolean;
  isBulkProcessing?: boolean;
}

export default function OnboardingChecklist({ gmailConnected, hasEmails, hasProcessed, onSync, onProcessAll, isSyncing, isBulkProcessing }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [replyDone, setReplyDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem('onboarding_dismissed') === 'true');
      setReplyDone(localStorage.getItem('onboarding_reply_done') === 'true');
    }
  }, []);

  const completedMap: Record<string, boolean> = {
    account: true,
    gmail: gmailConnected,
    sync: hasEmails,
    process: hasProcessed,
    reply: replyDone,
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding_dismissed', 'true');
  };

  return (
    <div className="card p-4 sm:p-5 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {allDone ? '🎉 You\'re all set!' : 'Get started with InboxIQ'}
            </h3>
            <p className="text-xs text-gray-500">{completedCount} of {STEPS.length} steps complete</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-700"
          style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completedMap[step.id];
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                done ? 'bg-green-50' : 'bg-white border border-gray-100'
              }`}
            >
              {done
                ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-green-700 line-through decoration-green-400' : 'text-gray-800'}`}>
                  {step.label}
                </p>
                {!done && (
                  <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                )}
              </div>
              {!done && step.action && (() => {
                const isLoading = step.id === 'sync' ? isSyncing : step.id === 'process' ? isBulkProcessing : false;
                return step.href ? (
                  <Link href={step.href} className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 flex-shrink-0">
                    {step.action} <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <button
                    onClick={step.id === 'sync' ? onSync : onProcessAll}
                    disabled={!!isLoading}
                    className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 flex-shrink-0 disabled:opacity-60"
                  >
                    {isLoading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <>{step.action} <ChevronRight className="h-3 w-3" /></>
                    }
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>

      {allDone && (
        <button onClick={handleDismiss} className="btn-primary w-full mt-4 text-sm">
          Dismiss checklist
        </button>
      )}
    </div>
  );
}
