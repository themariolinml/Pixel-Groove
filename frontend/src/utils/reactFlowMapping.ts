import type { Node as RFNode, Edge as RFEdge } from 'reactflow';
import type { GraphNode, Edge } from '../types/graph';

export function toRFNodes(
  nodes: GraphNode[],
  offset: { x: number; y: number } = { x: 0, y: 0 }
): RFNode[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
    data: n,
    selected: false,
  }));
}

export function toRFEdges(edges: Edge[]): RFEdge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.from_node_id,
    sourceHandle: e.from_port_id,
    target: e.to_node_id,
    targetHandle: e.to_port_id,
  }));
}
