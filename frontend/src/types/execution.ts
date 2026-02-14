// Matches the actual SSE event shape from the backend

export type ExecutionEventType =
  | 'started'
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type BatchExecutionEventType =
  | 'batch_started'
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'graph_completed'
  | 'graph_failed'
  | 'batch_completed'
  | 'batch_failed'
  | 'batch_cancelled';

export interface ExecutionEvent {
  execution_id: string;
  event_type: ExecutionEventType;
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

export interface BatchExecutionEvent {
  batch_id: string;
  event_type: BatchExecutionEventType;
  timestamp: number;
  graph_id?: string;
  node_id?: string;
  data?: {
    media_type?: string;
    urls?: { original: string; thumbnail: string };
    error?: string;
    graph_ids?: string[];
    total_nodes?: number;
    graph_outcomes?: Record<string, string>;
    reason?: string;
  };
}
