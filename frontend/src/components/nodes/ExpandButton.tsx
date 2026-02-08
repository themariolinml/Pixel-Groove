import { Expand } from 'lucide-react';

export function ExpandButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center
        text-zinc-400 hover:text-zinc-100 opacity-0 group-hover/result:opacity-100 transition-opacity"
      title="Expand"
    >
      <Expand size={11} />
    </button>
  );
}
