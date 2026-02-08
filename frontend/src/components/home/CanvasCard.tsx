import { useState, useEffect } from 'react';
import { MoreHorizontal, Trash2, Copy, Pencil } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { NODE_CONFIGS } from '../nodes/nodeConfig';
import { timeAgo } from '../../utils/format';
import { getWorkflowLabel, getGradient } from '../../utils/graph';
import type { Graph } from '../../types/graph';

interface CanvasCardProps {
  graph: Graph;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function CanvasCard({ graph, onOpen, onDelete, onDuplicate }: CanvasCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(graph.name);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    setTimeout(() => window.addEventListener('click', handler), 0);
    return () => window.removeEventListener('click', handler);
  }, [menuOpen]);

  const handleRename = async () => {
    if (newName.trim() && newName.trim() !== graph.name) {
      const { graphsApi } = await import('../../api');
      await graphsApi.update(graph.id, { name: newName.trim() });
      useGraphStore.getState().loadGraphs();
    }
    setRenaming(false);
  };

  return (
    <div
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer
        bg-white/[0.03] border border-white/[0.08]
        hover:border-white/[0.15] hover:bg-white/[0.05]
        shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-200"
      onClick={onOpen}
    >
      {/* Preview area */}
      <div className={`h-[140px] bg-gradient-to-br ${getGradient(graph)} flex items-center justify-center gap-2`}>
        {graph.nodes.length > 0 ? (
          [...new Set(graph.nodes.map(n => n.type))].slice(0, 5).map(type => {
            const config = NODE_CONFIGS[type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  config.accent === 'violet' ? 'bg-violet-500/10' : 'bg-cyan-500/10'
                }`}
              >
                <Icon size={16} className={config.accent === 'violet' ? 'text-violet-400/60' : 'text-cyan-400/60'} />
              </div>
            );
          })
        ) : (
          <span className="text-[11px] text-zinc-600">Empty</span>
        )}
      </div>

      {/* Info */}
      <div className="px-3.5 py-3 space-y-1">
        {renaming ? (
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={e => e.stopPropagation()}
            autoFocus
            className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[13px] text-zinc-200 outline-none focus:border-violet-500/50 w-full"
          />
        ) : (
          <h3 className="text-[13px] font-medium text-zinc-200 truncate">{graph.name}</h3>
        )}
        <p className="text-[10px] text-zinc-500 truncate">{getWorkflowLabel(graph)}</p>
        <p className="text-[10px] text-zinc-600">
          {graph.nodes.length} node{graph.nodes.length !== 1 ? 's' : ''}
          {' \u00b7 '}
          {timeAgo(graph.updated_at)}
        </p>
      </div>

      {/* Context menu trigger */}
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm
          flex items-center justify-center
          text-zinc-500 hover:text-zinc-200
          opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Context menu */}
      {menuOpen && (
        <div
          className="absolute top-10 right-2 w-[140px] z-50
            bg-zinc-900/95 backdrop-blur-md border border-white/[0.08]
            rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            py-1 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setRenaming(true); setNewName(graph.name); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <Pencil size={12} /> Rename
          </button>
          <button
            onClick={() => { onDuplicate(); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <Copy size={12} /> Duplicate
          </button>
          <div className="border-t border-white/[0.06] my-1" />
          <button
            onClick={() => { onDelete(); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
