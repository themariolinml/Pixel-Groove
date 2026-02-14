import type { ReactFlowProps } from 'reactflow';

/**
 * Shared ReactFlow configuration defaults.
 * Apply via spreading: <ReactFlow {...REACT_FLOW_DEFAULTS} ...overrides />
 */
export const REACT_FLOW_DEFAULTS: Partial<ReactFlowProps> = {
  fitView: true,
  proOptions: { hideAttribution: true },
  defaultEdgeOptions: {
    style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
    type: 'default',
  },
};

/**
 * Shared Background component props.
 */
export const BACKGROUND_DEFAULTS = {
  color: 'rgba(255,255,255,0.03)',
  gap: 24,
} as const;

/**
 * Shared Controls component props.
 */
export const CONTROLS_DEFAULTS = {
  className: '!bg-surface !border-border !rounded-lg',
} as const;

/**
 * Shared MiniMap component props.
 */
export const MINIMAP_DEFAULTS = {
  nodeColor: () => '#333',
  maskColor: 'rgba(0,0,0,0.7)',
  className: '!bg-surface !border-border !rounded-lg',
} as const;
