import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeDragHandler,
  type Edge as RFEdge,
  type Node as RFNode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '../../stores/graphStore';
import { useActiveGraph } from '../../hooks/useActiveGraph';
import { nodeTypes } from '../nodes';
import type { GraphNode, Edge } from '../../types/graph';

function toRFNodes(nodes: GraphNode[]): RFNode[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n,
    selected: false,
  }));
}

function toRFEdges(edges: Edge[]): RFEdge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.from_node_id,
    sourceHandle: e.from_port_id,
    target: e.to_node_id,
    targetHandle: e.to_port_id,
  }));
}

export function GraphCanvas() {
  const addEdge = useGraphStore(s => s.addEdge);
  const deleteEdge = useGraphStore(s => s.deleteEdge);
  const updateNode = useGraphStore(s => s.updateNode);
  const setSelectedNode = useGraphStore(s => s.setSelectedNode);

  const activeGraph = useActiveGraph();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync store data → React Flow state
  useEffect(() => {
    setNodes(toRFNodes(activeGraph?.nodes ?? []));
  }, [activeGraph?.nodes, setNodes]);

  useEffect(() => {
    setEdges(toRFEdges(activeGraph?.edges ?? []));
  }, [activeGraph?.edges, setEdges]);

  const onConnect = useCallback(async (conn: Connection) => {
    if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
    try {
      await addEdge(conn.source, conn.sourceHandle, conn.target, conn.targetHandle);
    } catch (err) {
      console.error('Edge creation failed:', err);
    }
  }, [addEdge]);

  const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    updateNode(node.id, { position: node.position });
  }, [updateNode]);

  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    deleted.forEach(e => deleteEdge(e.id));
  }, [deleteEdge]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  if (!activeGraph) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm z-0">
        Select or create a graph to begin
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
          type: 'default',
        }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={24} />
        <Controls className="!bg-surface !border-border !rounded-lg" />
        <MiniMap
          nodeColor={() => '#333'}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-surface !border-border !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
