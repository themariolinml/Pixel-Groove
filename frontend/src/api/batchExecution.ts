import { api, API_URL } from './client';
import type { BatchExecutionEvent } from '../types/execution';

export const batchExecutionApi = {
  start: (experimentId: string, graphIds: string[], force = false) =>
    api.post<{ batch_id: string; stream_url: string }>('/api/batch-executions/', {
      experiment_id: experimentId,
      graph_ids: graphIds,
      force,
    }).then(r => r.data),

  subscribe: (
    batchId: string,
    onEvent: (event: BatchExecutionEvent) => void,
    onComplete?: () => void,
    onError?: (error: Event) => void,
  ): EventSource => {
    const es = new EventSource(`${API_URL}/api/batch-executions/${batchId}/stream`);

    es.onmessage = (msg) => {
      const event: BatchExecutionEvent = JSON.parse(msg.data);
      onEvent(event);
      if (
        event.event_type === 'batch_completed' ||
        event.event_type === 'batch_failed' ||
        event.event_type === 'batch_cancelled'
      ) {
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

  cancel: (batchId: string) =>
    api.delete(`/api/batch-executions/${batchId}`),
};
