import { Play, X } from 'lucide-react';

interface ActionButtonsProps {
  isRunning: boolean;
  isViolet: boolean;
  actionLabel: string;
  onRun: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ActionButtons({
  isRunning,
  isViolet,
  actionLabel,
  onRun,
  onCancel,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div className="pt-2 border-t border-white/[0.06]">
      {isRunning ? (
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 transition-colors"
        >
          <X size={13} />
          Cancel
        </button>
      ) : (
        <button
          onClick={onRun}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed ${
            isViolet
              ? 'bg-gradient-to-r from-violet-500 to-purple-600'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600'
          }`}
        >
          <Play size={11} fill="currentColor" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
