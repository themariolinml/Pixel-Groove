import { create } from 'zustand';
import { graphsApi, nodesApi, edgesApi } from '../api';
import type { Graph, GraphNode, Edge } from '../types/graph';

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
      graphs: s.graphs.map(g => g.id === graphId ? graph : g),
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
      graphs: s.graphs.map(g =>
        g.id === graphId ? { ...g, nodes: [...g.nodes, node] } : g
      ),
    }));
    return node;
  },

  updateNode: async (nodeId, updates) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    const updated = await nodesApi.update(graphId, nodeId, updates);
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId
          ? { ...g, nodes: g.nodes.map(n => n.id === nodeId ? updated : n) }
          : g
      ),
    }));
    // Refresh full graph if content changed to pick up downstream stale flags
    if (updates.params || updates.label) {
      get().refreshActiveGraph();
    }
  },

  deleteNode: async (nodeId) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await nodesApi.delete(graphId, nodeId);
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId
          ? {
              ...g,
              nodes: g.nodes.filter(n => n.id !== nodeId),
              edges: g.edges.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId),
            }
          : g
      ),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
    }));
  },

  updateCanvasMemory: async (memory) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await graphsApi.update(graphId, { canvas_memory: memory });
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId ? { ...g, canvas_memory: memory } : g
      ),
    }));
  },

  addEdge: async (fromNodeId, fromPortId, toNodeId, toPortId) => {
    const graphId = get().activeGraphId;
    if (!graphId) throw new Error('No active graph');
    const edge = await edgesApi.create(graphId, fromNodeId, fromPortId, toNodeId, toPortId);
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId ? { ...g, edges: [...g.edges, edge] } : g
      ),
    }));
    // Refresh to pick up stale flags on target + downstream nodes
    get().refreshActiveGraph();
    return edge;
  },

  deleteEdge: async (edgeId) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    await edgesApi.delete(graphId, edgeId);
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId
          ? { ...g, edges: g.edges.filter(e => e.id !== edgeId) }
          : g
      ),
    }));
    // Refresh to pick up stale flags on affected nodes
    get().refreshActiveGraph();
  },

  setNodeStatus: (nodeId, status, errorMessage) => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    set(s => ({
      graphs: s.graphs.map(g =>
        g.id === graphId
          ? {
              ...g,
              nodes: g.nodes.map(n =>
                n.id === nodeId ? { ...n, status, error_message: errorMessage } : n
              ),
            }
          : g
      ),
    }));
  },

  refreshActiveGraph: async () => {
    const graphId = get().activeGraphId;
    if (!graphId) return;
    const graph = await graphsApi.get(graphId);
    set(s => ({
      graphs: s.graphs.map(g => g.id === graphId ? graph : g),
    }));
  },
}));
