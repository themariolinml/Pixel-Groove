import { api } from './client';
import type { Edge } from '../types/graph';

export const edgesApi = {
  create: (
    graphId: string,
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string,
  ) =>
    api.post<Edge>(`/api/graphs/${graphId}/edges/`, {
      from_node_id: fromNodeId,
      from_port_id: fromPortId,
      to_node_id: toNodeId,
      to_port_id: toPortId,
    }).then(r => r.data),

  delete: (graphId: string, edgeId: string) =>
    api.delete(`/api/graphs/${graphId}/edges/${edgeId}`),
};
