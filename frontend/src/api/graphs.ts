import { api } from './client';
import type { Graph } from '../types/graph';

export const graphsApi = {
  create: (name: string) =>
    api.post<Graph>('/api/graphs/', { name }).then(r => r.data),

  list: () =>
    api.get<Graph[]>('/api/graphs/').then(r => r.data),

  get: (graphId: string) =>
    api.get<Graph>(`/api/graphs/${graphId}`).then(r => r.data),

  update: (graphId: string, data: { name?: string; canvas_memory?: string }) =>
    api.patch<Graph>(`/api/graphs/${graphId}`, data).then(r => r.data),

  delete: (graphId: string) =>
    api.delete(`/api/graphs/${graphId}`),

  duplicate: (graphId: string) =>
    api.post<Graph>(`/api/graphs/${graphId}/duplicate`).then(r => r.data),
};
