import { memo } from 'react';
import { Check, Circle } from 'lucide-react';
import { useExperimentStore } from '../../stores/experimentStore';

interface HookBoundaryData {
  _hookType: 'boundary';
  hookId: string;
  hookLabel: string;
  genomeLabel: Record<string, string>;
  status: 'draft' | 'selected' | 'executed' | 'rejected';
}

interface HookBoundaryProps {
  data: HookBoundaryData;
}

export const HookBoundary = memo(function HookBoundary({ data }: HookBoundaryProps) {
  const toggleHookSelection = useExperimentStore(s => s.toggleHookSelection);

  const isSelected = data.status === 'selected';
  const isExecuted = data.status === 'executed';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleHookSelection(data.hookId);
  };

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl backdrop-blur-md pointer-events-auto cursor-default transition-all ${
        isExecuted
          ? 'bg-green-500/10 border border-green-500/30 shadow-[0_2px_12px_rgba(34,197,94,0.15)]'
          : isSelected
          ? 'bg-violet-500/10 border border-violet-500/30 shadow-[0_2px_12px_rgba(139,92,246,0.15)]'
          : 'bg-zinc-900/80 border border-white/[0.08]'
      }`}
    >
      {/* Select toggle */}
      <button
        onClick={handleToggle}
        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-all ${
          isExecuted
            ? 'bg-green-500/20 border border-green-500/40'
            : isSelected
            ? 'bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30'
            : 'bg-white/[0.05] border border-white/[0.15] hover:border-violet-500/40'
        }`}
      >
        {(isSelected || isExecuted) && (
          <Check size={11} className={isExecuted ? 'text-green-400' : 'text-violet-400'} />
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-white truncate max-w-[200px]">
          {data.hookLabel}
        </div>
      </div>

      {/* Genome chips */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {Object.entries(data.genomeLabel).slice(0, 3).map(([key, value]) => (
          <span
            key={key}
            className={`text-[8px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
              isExecuted
                ? 'bg-green-500/10 text-green-300/80'
                : isSelected
                ? 'bg-violet-500/10 text-violet-300/80'
                : 'bg-white/[0.05] text-zinc-500'
            }`}
          >
            {value}
          </span>
        ))}
      </div>

      {/* Status dot */}
      <Circle
        size={6}
        fill="currentColor"
        className={`flex-shrink-0 ${
          isExecuted ? 'text-green-400' : isSelected ? 'text-violet-400' : 'text-zinc-600'
        }`}
      />
    </div>
  );
});
