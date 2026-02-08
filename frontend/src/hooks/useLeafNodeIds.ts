import { useMemo } from 'react';
import { useActiveGraph } from './useActiveGraph';

export function useLeafNodeIds(): string[] {
  const graph = useActiveGraph();
  return useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter(n => !graph.edges.some(e => e.from_node_id === n.id))
      .map(n => n.id);
  }, [graph]);
}
