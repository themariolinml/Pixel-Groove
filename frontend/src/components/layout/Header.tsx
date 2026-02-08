import { Play, Loader2, RefreshCw, Trash2, Brain, ArrowLeft } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useActiveGraph } from '../../hooks/useActiveGraph';
import { useLeafNodeIds } from '../../hooks/useLeafNodeIds';

interface HeaderProps {
  onMemoryToggle?: () => void;
  isMemoryOpen?: boolean;
  onNavigateHome?: () => void;
}

export function Header({ onMemoryToggle, isMemoryOpen, onNavigateHome }: HeaderProps) {
  const activeGraphId = useGraphStore(s => s.activeGraphId);
  const deleteGraph = useGraphStore(s => s.deleteGraph);
  const isRunning = useExecutionStore(s => s.isRunning);
  const execute = useExecutionStore(s => s.execute);

  const activeGraph = useActiveGraph();
  const leafNodeIds = useLeafNodeIds();

  const handleGenerateAll = () => {
    if (!activeGraph || isRunning) return;
    if (leafNodeIds.length > 0) execute(leafNodeIds);
  };

  const handleRegenerateAll = () => {
    if (!activeGraph || isRunning) return;
    if (leafNodeIds.length > 0) execute(leafNodeIds, true);
  };

  const handleDelete = async () => {
    if (!activeGraphId || !confirm('Delete this graph?')) return;
    try {
      await deleteGraph(activeGraphId);
      onNavigateHome?.();
    } catch {
      // Silently fail
    }
  };

  const hasNodes = (activeGraph?.nodes.length ?? 0) > 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        {/* Back to home */}
        <button
          onClick={onNavigateHome}
          className="text-zinc-500 hover:text-white transition-colors"
          title="Back to canvases"
        >
          <ArrowLeft size={13} />
        </button>

        <div className="h-3 w-px bg-white/10" />

        {/* Graph name */}
        <span className="text-[11px] font-medium text-zinc-300 px-1 max-w-[180px] truncate">
          {activeGraph?.name ?? 'Loading...'}
        </span>

        {/* Generate All */}
        {activeGraphId && hasNodes && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={handleGenerateAll}
              disabled={isRunning}
              className="flex items-center gap-1 text-zinc-400 hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Generate all (skip completed)"
            >
              {isRunning ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} fill="currentColor" />
              )}
            </button>
            <button
              onClick={handleRegenerateAll}
              disabled={isRunning}
              className="flex items-center gap-1 text-zinc-400 hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Regenerate all (force re-run)"
            >
              <RefreshCw size={12} />
            </button>
          </>
        )}

        {/* Canvas Memory */}
        {activeGraphId && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={onMemoryToggle}
              className={`relative transition-colors ${
                isMemoryOpen ? 'text-violet-400' : 'text-zinc-500 hover:text-violet-400'
              }`}
              title="Canvas Memory"
            >
              <Brain size={13} />
              {activeGraph && activeGraph.canvas_memory && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-violet-400 rounded-full" />
              )}
            </button>
          </>
        )}

        {/* Delete */}
        {activeGraphId && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={handleDelete}
              className="text-zinc-600 hover:text-red-400 transition-colors"
              title="Delete graph"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
