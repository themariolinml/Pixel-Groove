import { NODE_REGISTRY } from './nodeRegistry';

export interface NodeGeometry {
  width: number;
  idleHeight: number;
}

export const NODE_GEOMETRIES: Record<string, NodeGeometry> = Object.fromEntries(
  Object.entries(NODE_REGISTRY).map(([k, v]) => [k, v.geometry]),
);

export const PORT_COLORS: Record<string, string> = {
  text: '#a1a1aa',
  image: '#f472b6',
  video: '#c084fc',
  audio: '#22d3ee',
  any: '#71717a',
};
