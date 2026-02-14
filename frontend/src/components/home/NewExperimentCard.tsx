import { useState, useRef } from 'react';
import { FlaskConical } from 'lucide-react';

interface NewExperimentCardProps {
  onCreate: (name: string, brief: string) => Promise<void>;
}

export function NewExperimentCard({ onCreate }: NewExperimentCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!editing) {
      setEditing(true);
      setName('');
      setBrief('');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !brief.trim()) return;
    await onCreate(name.trim(), brief.trim());
  };

  const handleCancel = () => {
    setEditing(false);
    setName('');
    setBrief('');
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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <FlaskConical size={20} className="text-emerald-400" />
          </div>
          <input
            ref={nameInputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const textarea = e.currentTarget.nextElementSibling as HTMLTextAreaElement;
                textarea?.focus();
              }
              if (e.key === 'Escape') handleCancel();
            }}
            onBlur={() => { if (!name.trim() && !brief.trim()) handleCancel(); }}
            placeholder="Experiment name..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-zinc-300
              outline-none focus:border-emerald-500/50 text-center"
          />
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
            onBlur={() => { if (!name.trim() && !brief.trim()) handleCancel(); }}
            placeholder="Brief description..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-zinc-300
              outline-none focus:border-emerald-500/50 text-center resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !brief.trim()}
            className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
          >
            Create
          </button>
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3
            group-hover:bg-emerald-500/20 transition-colors">
            <FlaskConical size={20} className="text-emerald-400" />
          </div>
          <span className="text-[12px] text-zinc-500 group-hover:text-zinc-300 transition-colors">New Experiment</span>
        </>
      )}
    </div>
  );
}
