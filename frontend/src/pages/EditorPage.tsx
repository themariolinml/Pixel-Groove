import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { Header } from '../components/layout/Header';
import { GraphCanvas } from '../components/canvas/GraphCanvas';
import { Toolbar } from '../components/canvas/Toolbar';
import { AddPanel } from '../components/canvas/AddPanel';
import { NodeEditPopover } from '../components/canvas/NodeEditPopover';
import { CanvasMemoryDrawer } from '../components/canvas/CanvasMemoryDrawer';
import { useGraphStore } from '../stores/graphStore';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loadGraph = useGraphStore(s => s.loadGraph);
  const [activeToolType, setActiveToolType] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadGraph(id).catch(() => navigate('/', { replace: true }));
    }
  }, [id]);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen bg-canvas text-white font-sans overflow-hidden relative">
        <GraphCanvas />
        <Header
          onMemoryToggle={() => setMemoryOpen(o => !o)}
          isMemoryOpen={memoryOpen}
          onNavigateHome={() => navigate('/')}
        />
        <Toolbar activeType={activeToolType} onSelect={setActiveToolType} />
        <AddPanel activeType={activeToolType} onClose={() => setActiveToolType(null)} />
        <NodeEditPopover />
        <CanvasMemoryDrawer isOpen={memoryOpen} onClose={() => setMemoryOpen(false)} />
      </div>
    </ReactFlowProvider>
  );
}
