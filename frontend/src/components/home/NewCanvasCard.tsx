import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface NewCanvasCardProps {
  onCreate: (name: string) => Promise<void>;
}

export function NewCanvasCard({ onCreate }: NewCanvasCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!editing) {
      setEditing(true);
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim());
  };

  const handleCancel = () => {
    setEditing(false);
    setName('');
  };

  return (
    <div
      onClick={handleClick}
      className="flex flex-col items-center justify-center h-[230px] rounded-xl
        border border-dashed border-white/[0.12]
        bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.2]
        transition-all duration-200 cursor-pointer group"
    >
      {editing ? (
        <div className="flex flex-col items-center gap-3 px-6 w-full" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Plus size={20} className="text-violet-400" />
          </div>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
            onBlur={() => { if (!name.trim()) handleCancel(); }}
            placeholder="Canvas name..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-zinc-300
              outline-none focus:border-violet-500/50 text-center"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="text-[12px] font-medium text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors"
          >
            Create
          </button>
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3
            group-hover:bg-violet-500/20 transition-colors">
            <Plus size={20} className="text-violet-400" />
          </div>
          <span className="text-[12px] text-zinc-500 group-hover:text-zinc-300 transition-colors">New Canvas</span>
        </>
      )}
    </div>
  );
}
