import { api, API_URL } from './client';
import type { ExecutionEvent } from '../types/execution';

export const executionApi = {
  start: (graphId: string, outputNodeIds: string[], force = false) =>
    api.post<{ execution_id: string; stream_url: string }>('/api/executions/', {
      graph_id: graphId,
      output_node_ids: outputNodeIds,
      force,
    }).then(r => r.data),

  subscribe: (
    executionId: string,
    onEvent: (event: ExecutionEvent) => void,
    onComplete?: () => void,
    onError?: (error: Event) => void,
  ): EventSource => {
    const es = new EventSource(`${API_URL}/api/executions/${executionId}/stream`);

    es.onmessage = (msg) => {
      const event: ExecutionEvent = JSON.parse(msg.data);
      onEvent(event);
      if (event.event_type === 'completed' || event.event_type === 'failed' || event.event_type === 'cancelled') {
        es.close();
        onComplete?.();
      }
    };

    es.onerror = (err) => {
      onError?.(err);
      es.close();
    };

    return es;
  },

  cancel: (executionId: string) =>
    api.delete(`/api/executions/${executionId}`),
};
