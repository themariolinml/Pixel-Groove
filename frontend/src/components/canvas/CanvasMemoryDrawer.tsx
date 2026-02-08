import { useState, useEffect, useRef } from 'react';
import { Brain, X } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { useActiveGraph } from '../../hooks/useActiveGraph';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CanvasMemoryDrawer({ isOpen, onClose }: Props) {
  const updateCanvasMemory = useGraphStore(s => s.updateCanvasMemory);

  const activeGraph = useActiveGraph();

  const [memory, setMemory] = useState('');
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync from store when graph changes or drawer opens
  useEffect(() => {
    if (activeGraph) {
      setMemory(activeGraph.canvas_memory ?? '');
      setDirty(false);
    }
  }, [activeGraph?.id, isOpen]);

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const save = (text: string) => {
    updateCanvasMemory(text);
    setDirty(false);
  };

  const handleChange = (text: string) => {
    setMemory(text);
    setDirty(true);
    // Debounce auto-save at 2s
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(text), 2000);
  };

  const handleBlur = () => {
    if (dirty) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      save(memory);
    }
  };

  if (!activeGraph) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { handleBlur(); onClose(); }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[360px] z-50
          bg-[rgb(14,14,14)] border-l border-white/[0.08] backdrop-blur-xl
          transform transition-transform duration-250 ease-in-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Brain size={15} className="text-violet-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200 flex-1">Canvas Memory</span>
          <button
            onClick={() => { handleBlur(); onClose(); }}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            This context is prepended to every node's prompt when generating. Use it for style guidelines, world-building, or brand context.
          </p>
        </div>

        {/* Textarea */}
        <div className="flex-1 px-5 pb-5">
          <textarea
            ref={textareaRef}
            value={memory}
            onChange={e => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g. Fantasy RPG world, dark medieval aesthetic, cel-shaded art style..."
            className="w-full h-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-4
              text-[13px] text-zinc-200 placeholder-zinc-600
              outline-none resize-none
              focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30
              transition-all"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">
            {memory.length} chars
          </span>
          {dirty && (
            <span className="text-[10px] text-violet-400 animate-pulse">Saving...</span>
          )}
        </div>
      </div>
    </>
  );
}
