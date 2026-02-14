import { create } from 'zustand';
import { executionApi } from '../api';
import { useGraphStore } from './graphStore';
import type { ExecutionEvent } from '../types/execution';

interface ExecutionState {
  executionId: string | null;
  isRunning: boolean;
  events: ExecutionEvent[];
  eventSource: EventSource | null;
  error: string | null;

  execute: (outputNodeIds?: string[], force?: boolean) => Promise<void>;
  cancel: () => Promise<void>;
  clearEvents: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executionId: null,
  isRunning: false,
  events: [],
  eventSource: null,
  error: null,

  execute: async (outputNodeIds, force = false) => {
    const graphStore = useGraphStore.getState();
    const graph = graphStore.activeGraph();
    if (!graph) return;

    // Default: execute all output nodes (nodes with output ports that have results)
    const targetIds = outputNodeIds ?? graph.nodes.map(n => n.id);

    set({ isRunning: true, events: [], error: null });

    try {
      const { execution_id } = await executionApi.start(graph.id, targetIds, force);
      set({ executionId: execution_id });

      const es = executionApi.subscribe(
        execution_id,
        (event) => {
          set(s => ({ events: [...s.events, event] }));

          // Update node status locally for instant UI feedback
          if (event.node_id) {
            switch (event.event_type) {
              case 'node_started':
                graphStore.setNodeStatus(event.node_id, 'running');
                break;
              case 'node_completed':
                graphStore.setNodeStatus(event.node_id, 'completed');
                break;
              case 'node_failed':
                graphStore.setNodeStatus(event.node_id, 'failed', event.data?.error);
                break;
            }
          }

          // On completion, reload graph to get saved results
          if (event.event_type === 'completed' || event.event_type === 'failed' || event.event_type === 'cancelled') {
            set({ isRunning: false, eventSource: null });
            graphStore.refreshActiveGraph();
          }
        },
        () => set({ isRunning: false, eventSource: null }),
        () => {
          set({ isRunning: false, eventSource: null, error: 'Connection to execution stream failed' });
          graphStore.refreshActiveGraph();
        },
      );

      set({ eventSource: es });
    } catch (err) {
      set({ isRunning: false, error: String(err) });
    }
  },

  cancel: async () => {
    const { executionId, eventSource } = get();
    if (eventSource) eventSource.close();
    if (executionId) await executionApi.cancel(executionId);
    set({ isRunning: false, eventSource: null });
  },

  clearEvents: () => set({ events: [] }),
}));
