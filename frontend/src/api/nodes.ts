import { api } from './client';
import type { GraphNode } from '../types/graph';

export const nodesApi = {
  create: (
    graphId: string,
    type: string,
    label: string,
    position: { x: number; y: number },
    params: Record<string, unknown> = {},
  ) =>
    api.post<GraphNode>(`/api/graphs/${graphId}/nodes/`, {
      type,
      label,
      params,
      position,
      provider: 'gemini',
    }).then(r => r.data),

  update: (
    graphId: string,
    nodeId: string,
    updates: { params?: Record<string, unknown>; position?: { x: number; y: number }; label?: string },
  ) =>
    api.patch<GraphNode>(`/api/graphs/${graphId}/nodes/${nodeId}`, updates).then(r => r.data),

  delete: (graphId: string, nodeId: string) =>
    api.delete(`/api/graphs/${graphId}/nodes/${nodeId}`),

  regenerate: (graphId: string, nodeId: string, createVariant = true) =>
    api.post<GraphNode>(
      `/api/graphs/${graphId}/nodes/${nodeId}/regenerate`,
      null,
      { params: { create_variant: createVariant } },
    ).then(r => r.data),
};
