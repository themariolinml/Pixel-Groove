// Matches the actual SSE event shape from the backend

export interface ExecutionEvent {
  execution_id: string;
  event_type: string; // "started" | "node_started" | "node_completed" | "node_failed" | "completed" | "failed" | "cancelled"
  timestamp: number;
  node_id?: string;
  data?: {
    media_type?: string;
    urls?: {
      original: string;
      thumbnail: string;
    };
    error?: string;
  };
}
