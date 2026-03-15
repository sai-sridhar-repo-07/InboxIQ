import { useState } from 'react';
import { format, addHours, setHours, setMinutes, nextSaturday, nextMonday } from 'date-fns';
import { AlarmClock, X, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailsApi } from '@/lib/api';

interface SnoozeModalProps {
  emailId: string;
  currentSnooze: string | null;
  onSnoozed: () => void;
  onClose: () => void;
}

function getSnoozeOptions() {
  const now = new Date();
  const laterToday = addHours(now, 4);

  const tomorrowMorning = setMinutes(setHours(new Date(now), 9), 0);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);

  const thisSaturday = setMinutes(setHours(nextSaturday(now), 9), 0);

  const nextMon = setMinutes(setHours(nextMonday(now), 9), 0);

  return [
    { label: 'Later today', sublabel: format(laterToday, 'h:mm a'), iso: laterToday.toISOString() },
    { label: 'Tomorrow morning', sublabel: format(tomorrowMorning, 'EEE, MMM d · 9:00 am'), iso: tomorrowMorning.toISOString() },
    { label: 'This weekend', sublabel: format(thisSaturday, 'EEE, MMM d · 9:00 am'), iso: thisSaturday.toISOString() },
    { label: 'Next week', sublabel: format(nextMon, 'EEE, MMM d · 9:00 am'), iso: nextMon.toISOString() },
  ];
}

export default function SnoozeModal({ emailId, currentSnooze, onSnoozed, onClose }: SnoozeModalProps) {
  const [loading, setLoading] = useState(false);
  const [customDateTime, setCustomDateTime] = useState('');
  const options = getSnoozeOptions();

  const handleSnooze = async (isoString: string) => {
    setLoading(true);
    try {
      await emailsApi.snoozeEmail(emailId, isoString);
      const formatted = format(new Date(isoString), 'EEE, MMM d · h:mm a');
      toast.success(`Snoozed until ${formatted}`);
      onSnoozed();
    } catch {
      toast.error('Failed to snooze email');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsnooze = async () => {
    setLoading(true);
    try {
      await emailsApi.snoozeEmail(emailId, null);
      toast.success('Email unsnoozed');
      onSnoozed();
    } catch {
      toast.error('Failed to unsnooze email');
    } finally {
      setLoading(false);
    }
  };

  const handleCustom = () => {
    if (!customDateTime) return;
    handleSnooze(new Date(customDateTime).toISOString());
  };

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
            <AlarmClock className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Snooze email</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-3 space-y-1">
          {options.map((opt) => (
            <button
              key={opt.iso}
              onClick={() => handleSnooze(opt.iso)}
              disabled={loading}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.sublabel}</span>
            </button>
          ))}

          {/* Custom datetime */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="px-1 pb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Custom date & time</p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="input-field text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
              <button
                onClick={handleCustom}
                disabled={!customDateTime || loading}
                className="btn-primary text-sm px-3 py-2 shrink-0"
              >
                Set
              </button>
            </div>
          </div>

          {/* Unsnooze */}
          {currentSnooze && (
            <button
              onClick={handleUnsnooze}
              disabled={loading}
              className="w-full flex items-center gap-2 rounded-xl px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
            >
              <BellOff className="h-4 w-4" />
              <span className="text-sm font-medium">Remove snooze</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
