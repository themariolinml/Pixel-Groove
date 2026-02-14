import type { LucideIcon } from 'lucide-react';
import { NODE_GROUPS, NODE_REGISTRY } from '../nodes/nodeRegistry';

interface ToolbarProps {
  activeType: string | null;
  onSelect: (type: string | null) => void;
}

export function Toolbar({ activeType, onSelect }: ToolbarProps) {
  const renderButton = ({ type, icon: Icon }: { type: string; icon: LucideIcon; fullTitle: string }) => {
    const isActive = activeType === type;
    const accent = NODE_REGISTRY[type]?.accent ?? 'violet';

    return (
      <button
        key={type}
        onClick={() => onSelect(isActive ? null : type)}
        title={NODE_REGISTRY[type]?.label}
        className={`
          relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
          ${isActive
            ? `bg-${accent}-500/15 text-${accent}-400`
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
        `}
      >
        {isActive && (
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-${accent}-500 rounded-r`} />
        )}
        <Icon size={16} />
      </button>
    );
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="flex flex-col items-center py-2 px-1 gap-0.5 glass rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        {NODE_GROUPS.text.map(renderButton)}
        <div className="h-px bg-white/10 my-1 w-5" />
        {NODE_GROUPS.image.map(renderButton)}
        <div className="h-px bg-white/10 my-1 w-5" />
        {NODE_GROUPS.video.map(renderButton)}
        <div className="h-px bg-white/10 my-1 w-5" />
        {NODE_GROUPS.audio.map(renderButton)}
      </div>
    </div>
  );
}
