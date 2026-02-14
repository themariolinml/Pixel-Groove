import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useExperimentStore } from '../../stores/experimentStore';
import { useGraphStore } from '../../stores/graphStore';
import { nodeTypes as baseNodeTypes } from '../nodes';
import { HookBoundary } from './HookBoundary';
import { toRFNodes, toRFEdges } from '../../utils/reactFlowMapping';
import type { GraphNode } from '../../types/graph';
import { REACT_FLOW_DEFAULTS, BACKGROUND_DEFAULTS, CONTROLS_DEFAULTS, MINIMAP_DEFAULTS } from '../../config/reactFlowDefaults';

const HOOK_WIDTH = 900;
const GAP_Y = 80;
const PADDING = 40;
const LABEL_HEIGHT = 44;

function getGraphBounds(nodes: GraphNode[]) {
  if (nodes.length === 0) return { width: 400, height: 300 };
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    const right = n.position.x + 280;
    const bottom = n.position.y + 120;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  return { width: maxX, height: maxY };
}

const experimentNodeTypes = {
  ...baseNodeTypes,
  hookBoundary: HookBoundary,
};

export function ExperimentCanvas() {
  const activeExperiment = useExperimentStore(s => s.activeExperiment());
  const hookGraphs = useExperimentStore(s => s.hookGraphs);
  const setSelectedNode = useGraphStore(s => s.setSelectedNode);
  const graphStoreGraphs = useGraphStore(s => s.graphs);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync edits from graphStore back to experimentStore's hookGraphs
  useEffect(() => {
    const hookGraphIds = new Set(Object.keys(hookGraphs));
    for (const g of graphStoreGraphs) {
      if (hookGraphIds.has(g.id) && g !== hookGraphs[g.id]) {
        useExperimentStore.setState(s => ({
          hookGraphs: { ...s.hookGraphs, [g.id]: g },
        }));
      }
    }
  }, [graphStoreGraphs, hookGraphs]);

  // Map node IDs to their hook's graph_id for click-to-edit
  const nodeToGraphIdRef = useRef<Record<string, string>>({});

  const { flattenedNodes, flattenedEdges } = useMemo(() => {
    if (!activeExperiment || activeExperiment.hooks.length === 0) {
      return { flattenedNodes: [], flattenedEdges: [] };
    }

    const allNodes: RFNode[] = [];
    const allEdges: RFEdge[] = [];
    const nodeGraphMap: Record<string, string> = {};
    let currentY = 0;

    activeExperiment.hooks.forEach((hook) => {
      const graph = hookGraphs[hook.graph_id];
      if (!graph) return;

      const bounds = getGraphBounds(graph.nodes);
      const offsetX = 0;
      const offsetY = currentY;

      const boundaryNode: RFNode = {
        id: `boundary-${hook.id}`,
        type: 'hookBoundary',
        position: { x: offsetX + PADDING / 2, y: offsetY + PADDING / 2 },
        data: {
          _hookType: 'boundary',
          hookId: hook.id,
          hookLabel: hook.label,
          genomeLabel: hook.genome_label,
          status: hook.status,
        },
        draggable: false,
        selectable: false,
      };
      allNodes.push(boundaryNode);

      const graphNodes = toRFNodes(graph.nodes, {
        x: offsetX + PADDING,
        y: offsetY + PADDING + LABEL_HEIGHT,
      });
      const graphEdges = toRFEdges(graph.edges);

      for (const n of graph.nodes) {
        nodeGraphMap[n.id] = hook.graph_id;
      }

      allNodes.push(...graphNodes);
      allEdges.push(...graphEdges);

      currentY += bounds.height + LABEL_HEIGHT + PADDING * 2 + GAP_Y;
    });

    nodeToGraphIdRef.current = nodeGraphMap;
    return { flattenedNodes: allNodes, flattenedEdges: allEdges };
  }, [activeExperiment, hookGraphs]);

  useEffect(() => {
    setNodes(flattenedNodes);
  }, [flattenedNodes, setNodes]);

  useEffect(() => {
    setEdges(flattenedEdges);
  }, [flattenedEdges, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    if (node.type === 'hookBoundary') return;

    const graphId = nodeToGraphIdRef.current[node.id];
    if (!graphId) return;

    // Load the hook graph into graphStore so NodeEditPopover can find the node
    const graph = useExperimentStore.getState().hookGraphs[graphId];
    if (graph) {
      const { graphs } = useGraphStore.getState();
      const exists = graphs.some(g => g.id === graphId);
      if (!exists) {
        useGraphStore.setState({ graphs: [...graphs, graph] });
      }
      useGraphStore.setState({ activeGraphId: graphId });
    }

    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  if (!activeExperiment || activeExperiment.hooks.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm z-0">
        No hooks to display
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <ReactFlow
        {...REACT_FLOW_DEFAULTS}
        nodes={nodes}
        edges={edges}
        nodeTypes={experimentNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background {...BACKGROUND_DEFAULTS} />
        <Controls {...CONTROLS_DEFAULTS} />
        <MiniMap {...MINIMAP_DEFAULTS} />
      </ReactFlow>
    </div>
  );
}
