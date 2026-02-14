// Matches backend DTOs exactly

export type PortType = 'image' | 'text' | 'audio' | 'video' | 'any';
export type PortDirection = 'input' | 'output';

export interface Port {
  id: string;
  name: string;
  port_type: PortType;
  direction: PortDirection;
  required: boolean;
  description: string;
}

export interface MediaUrls {
  original: string;
  thumbnail: string;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  size_bytes?: number;
}

export type MediaType = 'image' | 'text' | 'audio' | 'video';

export interface MediaResult {
  id: string;
  timestamp: number;
  media_type: MediaType;
  urls: MediaUrls;
  prompt: string;
  metadata: MediaMetadata;
  generation_params: Record<string, unknown>;
}

export type NodeType = 'generate_text' | 'generate_image' | 'generate_video' | 'generate_speech' | 'generate_music' | 'analyze_image' | 'transform_image';
export type NodeStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  params: Record<string, unknown>;
  position: { x: number; y: number };
  provider: string;
  status: NodeStatus;
  input_ports: Port[];
  output_ports: Port[];
  result?: MediaResult;
  error_message?: string;
  stale: boolean;
}

export interface Edge {
  id: string;
  from_node_id: string;
  from_port_id: string;
  to_node_id: string;
  to_port_id: string;
}

export interface Graph {
  id: string;
  name: string;
  canvas_memory: string;
  created_at: number;
  updated_at: number;
  nodes: GraphNode[];
  edges: Edge[];
}
