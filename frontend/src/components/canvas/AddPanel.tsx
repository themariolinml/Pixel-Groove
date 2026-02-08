import { Sparkles, X } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { NODE_REGISTRY } from '../nodes/nodeRegistry';

interface AddPanelProps {
  activeType: string | null;
  onClose: () => void;
}

export function AddPanel({ activeType, onClose }: AddPanelProps) {
  const addNode = useGraphStore(s => s.addNode);

  const info = activeType ? NODE_REGISTRY[activeType] : null;

  const handleAdd = async () => {
    if (!info) return;
    const x = 200 + Math.random() * 200;
    const y = 100 + Math.random() * 200;
    try {
      await addNode(info.type, info.fullTitle, { x, y });
      onClose();
    } catch (err) {
      console.error('Failed to add node:', err);
    }
  };

  const isOpen = !!info;
  const accent = info?.accent ?? 'violet';
  const Icon = info?.icon;

  return (
    <div
      className={`absolute left-16 top-1/2 -translate-y-1/2 z-20 w-72 transition-all duration-200 ease-out ${
        isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
      }`}
    >
      <div className="glass rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X size={14} />
        </button>

        {info && Icon && (
          <>
            {/* Header with icon */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${accent}-500/10 flex items-center justify-center shrink-0`}>
                <Icon size={18} className={`text-${accent}-400`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-100">{info.fullTitle}</h3>
                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-zinc-500">
                  <Sparkles size={8} />
                  {info.provider}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-[11px] text-zinc-400 leading-relaxed mt-3">{info.description}</p>

            {/* Add button */}
            <button
              onClick={handleAdd}
              className={`w-full py-2 mt-4 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90
                ${accent === 'violet'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
            >
              Add to Canvas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
