import { useMemo } from 'react';
import { useGraphStore } from '../stores/graphStore';
import type { Graph } from '../types/graph';

export function useActiveGraph(): Graph | null {
  const graphs = useGraphStore(s => s.graphs);
  const activeGraphId = useGraphStore(s => s.activeGraphId);
  return useMemo(
    () => graphs.find(g => g.id === activeGraphId) ?? null,
    [graphs, activeGraphId],
  );
}
