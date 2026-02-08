import type { LucideIcon } from 'lucide-react';
import { NODE_REGISTRY } from './nodeRegistry';

export interface NodeConfig {
  type: string;
  label: string;
  icon: LucideIcon;
  accent: 'violet' | 'cyan';
  category: 'generation' | 'transformation';
}

export const NODE_CONFIGS: Record<string, NodeConfig> = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([k, v]) => [
    k,
    { type: v.type, label: v.label, icon: v.icon, accent: v.accent, category: v.category },
  ]),
);
