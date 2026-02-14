import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraphStore } from '../stores/graphStore';
import { useExperimentStore } from '../stores/experimentStore';
import { CanvasCard } from '../components/home/CanvasCard';
import { NewCanvasCard } from '../components/home/NewCanvasCard';
import { ExperimentCard } from '../components/home/ExperimentCard';
import { NewExperimentCard } from '../components/home/NewExperimentCard';
import type { Graph } from '../types/graph';

export function HomePage() {
  const navigate = useNavigate();
  const graphs = useGraphStore(s => s.graphs);
  const loadGraphs = useGraphStore(s => s.loadGraphs);
  const createGraph = useGraphStore(s => s.createGraph);
  const deleteGraph = useGraphStore(s => s.deleteGraph);

  const experiments = useExperimentStore(s => s.experiments);
  const loadExperiments = useExperimentStore(s => s.loadExperiments);
  const createExperiment = useExperimentStore(s => s.createExperiment);
  const deleteExperiment = useExperimentStore(s => s.deleteExperiment);

  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadGraphs(), loadExperiments()])
      .catch(() => setError('Failed to connect to backend'))
      .finally(() => setLoaded(true));
  }, []);

  const handleCreate = async (name: string) => {
    try {
      const graph = await createGraph(name);
      navigate(`/canvas/${graph.id}`);
    } catch {
      setError('Failed to create canvas');
    }
  };

  const handleDuplicate = async (graph: Graph) => {
    try {
      const { graphsApi } = await import('../api');
      const copy = await graphsApi.duplicate(graph.id);
      await loadGraphs();
      navigate(`/canvas/${copy.id}`);
    } catch {
      setError('Failed to duplicate canvas');
    }
  };

  const handleDelete = async (graphId: string) => {
    if (!confirm('Delete this canvas?')) return;
    try {
      await deleteGraph(graphId);
    } catch {
      setError('Failed to delete canvas');
    }
  };

  const handleCreateExperiment = async (name: string, brief: string) => {
    try {
      const experiment = await createExperiment(name, brief);
      navigate(`/experiment/${experiment.id}`);
    } catch {
      setError('Failed to create experiment');
    }
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    if (!confirm('Delete this experiment?')) return;
    try {
      await deleteExperiment(experimentId);
    } catch {
      setError('Failed to delete experiment');
    }
  };

  // Sort by updated_at descending (most recent first)
  const sorted = [...graphs].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  const sortedExperiments = [...experiments].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));

  return (
    <div className="min-h-screen bg-canvas text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-white/80">PG</span>
            <span className="text-sm text-zinc-400">Pixel-Groove</span>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-3">
          <span className="text-[11px] text-red-400 bg-red-500/10 px-3 py-1 rounded-full">{error}</span>
        </div>
      )}

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!loaded ? (
          <div className="flex items-center justify-center py-32">
            <span className="text-[13px] text-zinc-500">Loading...</span>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Canvas section */}
            <section>
              <h2 className="text-[13px] font-medium text-zinc-400 mb-5 tracking-wide uppercase">Canvas</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                <NewCanvasCard onCreate={handleCreate} />

                {sorted.map(graph => (
                  <CanvasCard
                    key={graph.id}
                    graph={graph}
                    onOpen={() => navigate(`/canvas/${graph.id}`)}
                    onDelete={() => handleDelete(graph.id)}
                    onDuplicate={() => handleDuplicate(graph)}
                  />
                ))}
              </div>
            </section>

            {/* Experiments section */}
            <section>
              <h2 className="text-[13px] font-medium text-zinc-400 mb-5 tracking-wide uppercase">Experiments</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                <NewExperimentCard onCreate={handleCreateExperiment} />

                {sortedExperiments.map(experiment => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    onOpen={() => navigate(`/experiment/${experiment.id}`)}
                    onDelete={() => handleDeleteExperiment(experiment.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
