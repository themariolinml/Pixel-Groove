import { create } from 'zustand';
import { graphsApi, nodesApi, edgesApi } from '../api';
import type { Graph, GraphNode, Edge } from '../types/graph';

// Helper for immutable array updates
function updateItemInArray<T extends { id: string }>(
  items: T[],
  id: string,
  update: Partial<T> | T
): T[] {
  return items.map(item => item.id === id ? { ...item, ...update } : item);
}

function updateGraph(graphs: Graph[], graphId: string, update: Partial<Graph> | Graph): Graph[] {
  return updateItemInArray(graphs, graphId, update);
}

interface GraphState {
  // Data
  graphs: Graph[];
  activeGraphId: string | null;
  selectedNodeId: string | null;

  // Computed-like getters
  activeGraph: () => Graph | null;
  selectedNode: () => GraphNode | null;

  // Graph actions
  loadGraphs: () => Promise<void>;
  createGraph: (name: string) => Promise<Graph>;
  loadGraph: (graphId: string) => Promise<void>;
  deleteGraph: (graphId: string) => Promise<void>;
  setActiveGraph: (graphId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;

  // Node actions
  addNode: (type: string, label: string, position: { x: number; y: number }, params?: Record<string, unknown>) => Promise<GraphNode>;
  updateNode: (nodeId: string, updates: { params?: Record<string, unknown>; position?: { x: number; y: number }; label?: string }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;

  // Canvas memory
  updateCanvasMemory: (memory: string) => Promise<void>;

  // Edge actions
  addEdge: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => Promise<Edge>;
  deleteEdge: (edgeId: string) => Promise<void>;

  // Local state updates (for SSE execution feedback)
  setNodeStatus: (nodeId: string, status: string, errorMessage?: string) => void;
  refreshActiveGraph: () => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphs: [],
  activeGraphId: null,
  selectedNodeId: null,

  activeGraph: () => {
    const { graphs, activeGraphId } = get();
    return graphs.find(g => g.id === activeGraphId) ?? null;
  },

  selectedNode: () => {
    const graph = get().activeGraph();
    if (!graph) return null;
    return graph.nodes.find(n => n.id === get().selectedNodeId) ?? null;
  },

  loadGraphs: async () => {
    const graphs = await graphsApi.list();
    set({ graphs });
  },

  createGraph: async (name) => {
    const graph = await graphsApi.create(name);
    set(s => ({ graphs: [...s.graphs, graph], activeGraphId: graph.id }));
    return graph;
  },

  loadGraph: async (graphId) => {
    const graph = await graphsApi.get(graphId);
    set(s => ({
      graphs: updateGraph(s.graphs, graphId, graph),
      activeGraphId: graphId,
    }));
  },

  deleteGraph: async (graphId) => {
    await graphsApi.delete(graphId);
    set(s => ({
      graphs: s.graphs.filter(g => g.id !== graphId),
      activeGraphId: s.activeGraphId === graphId ? null : s.activeGraphId,
    }));
  },

  setActiveGraph: (graphId) => set({ activeGraphId: graphId, selectedNodeId: null }),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  addNode: async (type, label, position, params = {}) => {
    const graphId = get().activeGraphId;
    if (!graphId) throw new Error('No active graph');
    const node = await nodesApi.create(graphId, type, label, position, params);
    set(s => ({
      graphs: updateGraph(s.graphs, graphId, {
        ...s.graphs.find(g => g.id === graphId)!,
        nodes: [...s.graphs.find(g => g.id === graphId)!.nodes, node],
      }),
    }));
    return node;
  },

  updateNode: async (nodeId, updates) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    const updated = await nodesApi.update(graphId, nodeId, updates);
    set(s => {
      const graph = s.graphs.find(g => g.id === graphId)!;
      return {
        graphs: updateGraph(s.graphs, graphId, {
          ...graph,
          nodes: updateItemInArray(graph.nodes, nodeId, updated),
        }),
      };
    });
    // Refresh full graph if content changed to pick up downstream stale flags
    if (updates.params || updates.label) {
      get().refreshActiveGraph();
    }
  },

  deleteNode: async (nodeId) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await nodesApi.delete(graphId, nodeId);
    set(s => {
      const graph = s.graphs.find(g => g.id === graphId)!;
      return {
        graphs: updateGraph(s.graphs, graphId, {
          ...graph,
          nodes: graph.nodes.filter(n => n.id !== nodeId),
          edges: graph.edges.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId),
        }),
        selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      };
    });
  },

  updateCanvasMemory: async (memory) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await graphsApi.update(graphId, { canvas_memory: memory });
    set(s => ({
      graphs: updateGraph(s.graphs, graphId, {
        ...s.graphs.find(g => g.id === graphId)!,
        canvas_memory: memory,
      }),
    }));
  },

  addEdge: async (fromNodeId, fromPortId, toNodeId, toPortId) => {
    const graphId = get().activeGraphId;
    if (!graphId) throw new Error('No active graph');
    const edge = await edgesApi.create(graphId, fromNodeId, fromPortId, toNodeId, toPortId);
    set(s => ({
      graphs: updateGraph(s.graphs, graphId, {
        ...s.graphs.find(g => g.id === graphId)!,
        edges: [...s.graphs.find(g => g.id === graphId)!.edges, edge],
      }),
    }));
    // Refresh to pick up stale flags on target + downstream nodes
    get().refreshActiveGraph();
    return edge;
  },

  deleteEdge: async (edgeId) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await edgesApi.delete(graphId, edgeId);
    set(s => {
      const graph = s.graphs.find(g => g.id === graphId)!;
      return {
        graphs: updateGraph(s.graphs, graphId, {
          ...graph,
          edges: graph.edges.filter(e => e.id !== edgeId),
        }),
      };
    });
    // Refresh to pick up stale flags on affected nodes
    get().refreshActiveGraph();
  },

  setNodeStatus: (nodeId, status, errorMessage) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    set(s => {
      const graph = s.graphs.find(g => g.id === graphId)!;
      return {
        graphs: updateGraph(s.graphs, graphId, {
          ...graph,
          nodes: updateItemInArray(graph.nodes, nodeId, { status, error_message: errorMessage }),
        }),
      };
    });
  },

  refreshActiveGraph: async () => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    const graph = await graphsApi.get(graphId);
    set(s => ({
      graphs: updateGraph(s.graphs, graphId, graph),
    }));
  },
}));
