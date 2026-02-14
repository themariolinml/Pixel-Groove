import { Sparkles } from 'lucide-react';

interface EnhancePromptToggleProps {
  enabled: boolean;
  onToggle: () => void;
  isRunning: boolean;
}

export function EnhancePromptToggle({ enabled, onToggle, isRunning }: EnhancePromptToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} className="text-zinc-500" />
        <span className="text-[11px] text-zinc-400">Enhance prompt</span>
      </div>
      <button
        onClick={onToggle}
        disabled={isRunning}
        className={`relative w-8 h-[18px] rounded-full transition-all duration-200 disabled:opacity-40 ${
          enabled ? 'bg-violet-500/60' : 'bg-white/10'
        }`}
      >
        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 ${
          enabled ? 'translate-x-[14px]' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}
