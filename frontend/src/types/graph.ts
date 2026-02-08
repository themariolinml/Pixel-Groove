// Matches backend DTOs exactly

export interface Port {
  id: string;
  name: string;
  port_type: string; // "image" | "text" | "audio" | "video" | "any"
  direction: string; // "input" | "output"
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

export interface MediaResult {
  id: string;
  timestamp: number;
  media_type: string;
  urls: MediaUrls;
  prompt: string;
  metadata: MediaMetadata;
  generation_params: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  params: Record<string, unknown>;
  position: { x: number; y: number };
  provider: string;
  status: string; // "idle" | "queued" | "running" | "completed" | "failed"
  input_ports: Port[];
  output_ports: Port[];
  result?: MediaResult;
  generation_history: MediaResult[];
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
