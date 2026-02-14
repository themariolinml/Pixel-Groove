import { useState } from 'react';
import { Dna, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExperimentStore } from '../../stores/experimentStore';

export function GenomeHeaderBar() {
  const activeExperiment = useExperimentStore(s => s.activeExperiment());
  const genome = activeExperiment?.genome;
  const hooks = activeExperiment?.hooks ?? [];
  const [collapsed, setCollapsed] = useState(false);

  const selectedCount = hooks.filter(h => h.status === 'selected').length;

  if (!genome) return null;

  return (
    <div className={`absolute top-20 left-4 z-20 transition-all duration-200 ${
      collapsed ? 'w-8' : 'w-64'
    }`}>
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="glass rounded-xl p-2 hover:bg-white/[0.06] transition-colors"
          title="Show genome panel"
        >
          <ChevronRight size={14} className="text-zinc-400" />
        </button>
      ) : (
        <div className="glass rounded-2xl p-3 space-y-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna size={14} className="text-violet-400" />
              <span className="text-[11px] font-medium text-violet-300">
                {hooks.length} hooks
              </span>
              <span className="text-[10px] text-zinc-500">
                {selectedCount} selected
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Collapse"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="space-y-2">
            {genome.dimensions.map((dim) => (
              <div key={dim.name}>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  {dim.name}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {dim.values.map((val) => (
                    <span
                      key={val}
                      className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] text-violet-300"
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
