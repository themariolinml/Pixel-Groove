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
import { toRFNodes, toRFEdges } from '../../utils/reactFlowMapping';
import { REACT_FLOW_DEFAULTS, BACKGROUND_DEFAULTS, CONTROLS_DEFAULTS, MINIMAP_DEFAULTS } from '../../config/reactFlowDefaults';

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
        {...REACT_FLOW_DEFAULTS}
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
      >
        <Background {...BACKGROUND_DEFAULTS} />
        <Controls {...CONTROLS_DEFAULTS} />
        <MiniMap {...MINIMAP_DEFAULTS} />
      </ReactFlow>
    </div>
  );
}
