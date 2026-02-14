import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import { ExperimentHeader } from '../components/experiment/ExperimentHeader';
import { BriefStep } from '../components/experiment/BriefStep';
import { GenomeEditor } from '../components/experiment/GenomeEditor';
import { GenomeHeaderBar } from '../components/experiment/GenomeHeaderBar';
import { ExperimentCanvas } from '../components/experiment/ExperimentCanvas';
import { NodeEditPopover } from '../components/canvas/NodeEditPopover';

export function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loadExperiment = useExperimentStore(s => s.loadExperiment);
  const currentStep = useExperimentStore(s => s.currentStep);
  const isLoading = useExperimentStore(s => s.isLoading);
  const error = useExperimentStore(s => s.error);
  const isExecuting = useExperimentStore(s => s.isExecuting);
  const executionProgress = useExperimentStore(s => s.executionProgress);

  useEffect(() => {
    if (id) {
      loadExperiment(id).catch(() => navigate('/', { replace: true }));
    }
  }, [id]);

  const renderStep = () => {
    if (isLoading && currentStep === 'build') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl px-8 py-6 flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <div className="text-center">
              <div className="text-[14px] font-medium text-white">Building Hooks</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Generating graph hooks from content genome...
              </div>
            </div>
            <button
              onClick={() => useExperimentStore.getState().cancelBuild()}
              className="mt-2 text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'brief':
        return <BriefStep />;
      case 'genome':
        return <GenomeEditor />;
      case 'review':
        return (
          <ReactFlowProvider>
            <GenomeHeaderBar />
            <ExperimentCanvas />
            <NodeEditPopover />
          </ReactFlowProvider>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-screen w-screen bg-canvas text-white font-sans relative ${
      currentStep === 'review' ? 'overflow-hidden' : 'overflow-y-auto'
    }`}>
      <ExperimentHeader />
      {renderStep()}

      {/* Error banner */}
      {error && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md">
          <div className="glass rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-red-500/30 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-red-300">Something went wrong</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 break-words">{error}</div>
            </div>
            <button
              onClick={() => useExperimentStore.setState({ error: null })}
              className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Execution progress overlay */}
      {isExecuting && executionProgress && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <div className="glass rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-400" />
              <span className="text-[13px] font-medium text-white">
                Executing Hooks
              </span>
              <span className="text-[11px] text-zinc-400 ml-auto">
                {executionProgress.currentIndex + 1} / {executionProgress.total}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                style={{
                  width: `${((executionProgress.completedHooks.length + executionProgress.failedHooks.length) / executionProgress.total) * 100}%`,
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-zinc-300 truncate">
                {executionProgress.currentHookLabel}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {executionProgress.currentNodeLabel}
              </div>
            </div>

            {executionProgress.completedHooks.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                <CheckCircle2 size={12} />
                {executionProgress.completedHooks.length} completed
              </div>
            )}
            {executionProgress.failedHooks.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                <XCircle size={12} />
                {executionProgress.failedHooks.length} failed
              </div>
            )}

            <button
              onClick={() => useExperimentStore.getState().cancelExecution()}
              className="w-full mt-1 py-1.5 text-[11px] text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.03]"
            >
              Cancel Execution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
