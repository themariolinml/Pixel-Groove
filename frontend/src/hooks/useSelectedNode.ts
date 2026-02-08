import { useMemo } from 'react';
import { useActiveGraph } from './useActiveGraph';
import { useGraphStore } from '../stores/graphStore';
import type { GraphNode } from '../types/graph';

export function useSelectedNode(): GraphNode | null {
  const graph = useActiveGraph();
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  return useMemo(
    () => graph?.nodes.find(n => n.id === selectedNodeId) ?? null,
    [graph?.nodes, selectedNodeId],
  );
}
