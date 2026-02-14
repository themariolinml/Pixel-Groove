import { ArrowLeft, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExperimentStore } from '../../stores/experimentStore';

type StepName = 'brief' | 'genome' | 'build' | 'review';

const STEPS: { id: StepName; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'genome', label: 'Genome' },
  { id: 'build', label: 'Build' },
  { id: 'review', label: 'Review' },
];

export function ExperimentHeader() {
  const navigate = useNavigate();
  const currentStep = useExperimentStore(s => s.currentStep);
  const activeExperiment = useExperimentStore(s => s.activeExperiment());
  const selectAllHooks = useExperimentStore(s => s.selectAllHooks);
  const deselectAllHooks = useExperimentStore(s => s.deselectAllHooks);
  const executeSelectedHooks = useExperimentStore(s => s.executeSelectedHooks);
  const isExecuting = useExperimentStore(s => s.isExecuting);

  const selectedCount = activeExperiment?.hooks.filter(h => h.status === 'selected').length ?? 0;
  const hasSelected = selectedCount > 0;

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const handleExecute = () => {
    executeSelectedHooks();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-3 px-4 py-2 glass rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <button
          onClick={() => navigate('/')}
          className="text-zinc-500 hover:text-white transition-colors"
          title="Back to home"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="h-3 w-px bg-white/10" />

        <span className="text-[11px] font-medium text-zinc-300 max-w-[180px] truncate">
          {activeExperiment?.name ?? 'Loading...'}
        </span>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-1.5">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isFuture = idx > currentStepIndex;

            return (
              <div key={step.id} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  {isCompleted ? (
                    <CheckCircle2 size={12} className="text-green-500" />
                  ) : (
                    <Circle
                      size={12}
                      className={
                        isCurrent
                          ? 'text-violet-400'
                          : 'text-zinc-600'
                      }
                      fill={isCurrent ? 'currentColor' : 'none'}
                    />
                  )}
                  <span
                    className={`text-[10px] ${
                      isCompleted
                        ? 'text-green-500'
                        : isCurrent
                        ? 'text-violet-400 font-medium'
                        : 'text-zinc-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-4 h-px ${
                      isCompleted ? 'bg-green-500/40' : 'bg-zinc-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {currentStep === 'review' && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={selectAllHooks}
              className="text-[11px] text-zinc-400 hover:text-violet-400 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAllHooks}
              className="text-[11px] text-zinc-400 hover:text-violet-400 transition-colors"
            >
              Deselect All
            </button>
            <div className="h-3 w-px bg-white/10" />
            <button
              onClick={handleExecute}
              disabled={!hasSelected || isExecuting}
              className="px-3 py-1 text-[11px] font-medium rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all flex items-center gap-1.5"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Executing...
                </>
              ) : (
                <>Execute {selectedCount} Hooks</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
