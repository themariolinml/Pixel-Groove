import { NODE_REGISTRY } from '../components/nodes/nodeRegistry';
import type { Graph } from '../types/graph';

export function getWorkflowLabel(graph: Graph): string {
  if (graph.nodes.length === 0) return 'Empty canvas';
  const types = [...new Set(graph.nodes.map(n => n.type))];
  return types.map(t => NODE_REGISTRY[t]?.label ?? t).join(' \u2192 ');
}

export function getGradient(graph: Graph): string {
  const hasViolet = graph.nodes.some(n => NODE_REGISTRY[n.type]?.accent === 'violet');
  const hasCyan = graph.nodes.some(n => NODE_REGISTRY[n.type]?.accent === 'cyan');
  if (hasViolet && hasCyan) return 'from-violet-500/8 via-transparent to-cyan-500/8';
  if (hasCyan) return 'from-cyan-500/10 to-transparent';
  if (hasViolet) return 'from-violet-500/10 to-transparent';
  return 'from-white/[0.03] to-transparent';
}
