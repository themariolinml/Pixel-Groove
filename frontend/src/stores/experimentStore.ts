import { create } from 'zustand';
import { experimentsApi, graphsApi, batchExecutionApi } from '../api';
import type { Experiment, ContentGenome } from '../types/experiment';
import type { Graph } from '../types/graph';

type ExperimentStep = 'brief' | 'genome' | 'build' | 'review';

interface ExecutionProgress {
  currentIndex: number;
  total: number;
  currentHookLabel: string;
  currentNodeLabel: string;
  completedHooks: string[];
  failedHooks: string[];
}

interface ExperimentState {
  experiments: Experiment[];
  activeExperimentId: string | null;
  hookGraphs: Record<string, Graph>;
  currentStep: ExperimentStep;
  isLoading: boolean;
  isExecuting: boolean;
  executionProgress: ExecutionProgress | null;
  error: string | null;
  buildAbortController: AbortController | null;
  activeBatchId: string | null;

  activeExperiment: () => Experiment | null;
  loadExperiments: () => Promise<void>;
  createExperiment: (name: string, brief: string) => Promise<Experiment>;
  loadExperiment: (id: string) => Promise<void>;
  deleteExperiment: (id: string) => Promise<void>;
  generateGenome: (brief?: string) => Promise<void>;
  updateGenome: (genome: ContentGenome) => Promise<void>;
  updateExperimentConfig: (config: { artifact_type?: string; image_model?: string; video_model?: string; images_per_hook?: number }) => Promise<void>;
  buildHooks: (count?: number) => Promise<void>;
  cancelBuild: () => Promise<void>;
  toggleHookSelection: (hookId: string) => Promise<void>;
  selectAllHooks: () => Promise<void>;
  deselectAllHooks: () => Promise<void>;
  loadHookGraphs: () => Promise<void>;
  executeSelectedHooks: () => Promise<void>;
  cancelExecution: () => Promise<void>;
  setStep: (step: ExperimentStep) => void;
  uploadReferenceImage: (file: File) => Promise<void>;
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  activeExperimentId: null,
  hookGraphs: {},
  currentStep: 'brief',
  isLoading: false,
  isExecuting: false,
  executionProgress: null,
  error: null,
  buildAbortController: null,
  activeBatchId: null,

  activeExperiment: () => {
    const { experiments, activeExperimentId } = get();
    return experiments.find(e => e.id === activeExperimentId) ?? null;
  },

  loadExperiments: async () => {
    set({ isLoading: true, error: null });
    try {
      const experiments = await experimentsApi.list();
      set({ experiments, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  createExperiment: async (name, brief) => {
    set({ isLoading: true, error: null });
    try {
      const experiment = await experimentsApi.create(name, brief);
      set(s => ({
        experiments: [...s.experiments, experiment],
        activeExperimentId: experiment.id,
        currentStep: 'brief',
        isLoading: false,
      }));
      return experiment;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  loadExperiment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const experiment = await experimentsApi.get(id);
      set(s => {
        const exists = s.experiments.some(e => e.id === id);
        return {
          experiments: exists
            ? s.experiments.map(e => e.id === id ? experiment : e)
            : [...s.experiments, experiment],
          activeExperimentId: id,
          currentStep: experiment.status === 'brief' ? 'brief' : experiment.status === 'genome' ? 'genome' : experiment.status === 'built' || experiment.status === 'reviewed' ? 'review' : 'brief',
          isLoading: false,
        };
      });

      if (experiment.status === 'built' || experiment.status === 'reviewed') {
        await get().loadHookGraphs();
      }
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  deleteExperiment: async (id) => {
    try {
      await experimentsApi.delete(id);
      set(s => ({
        experiments: s.experiments.filter(e => e.id !== id),
        activeExperimentId: s.activeExperimentId === id ? null : s.activeExperimentId,
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  generateGenome: async (brief?) => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    set({ isLoading: true, error: null });
    try {
      const experiment = await experimentsApi.generateGenome(experimentId, brief);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? experiment : e),
        currentStep: 'genome',
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  updateGenome: async (genome) => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    set({ isLoading: true, error: null });
    try {
      const experiment = await experimentsApi.updateGenome(experimentId, genome);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? experiment : e),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  updateExperimentConfig: async (config) => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    try {
      const experiment = await experimentsApi.updateConfig(experimentId, config);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? experiment : e),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  buildHooks: async (count = 4) => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    const controller = new AbortController();
    set({ isLoading: true, error: null, currentStep: 'build', buildAbortController: controller });
    try {
      const experiment = await experimentsApi.buildHooks(experimentId, count, controller.signal);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? experiment : e),
        currentStep: 'review',
        isLoading: false,
        buildAbortController: null,
      }));
      await get().loadHookGraphs();
    } catch (err) {
      if (controller.signal.aborted) return; // Cancelled — don't show error
      console.error('buildHooks failed:', err);
      set({ error: String(err), isLoading: false, currentStep: 'genome', buildAbortController: null });
    }
  },

  cancelBuild: async () => {
    const id = get().activeExperimentId;
    const controller = get().buildAbortController;
    if (controller) controller.abort();
    if (id) await experimentsApi.cancelBuild(id).catch(() => {});
    set({ isLoading: false, currentStep: 'genome', buildAbortController: null });
  },

  toggleHookSelection: async (hookId) => {
    const experimentId = get().activeExperimentId;
    const experiment = get().activeExperiment();
    if (!experimentId || !experiment) return;

    const hook = experiment.hooks.find(h => h.id === hookId);
    if (!hook) return;

    const newStatus = hook.status === 'selected' ? 'draft' : 'selected';

    try {
      const updated = await experimentsApi.updateHookStatus(experimentId, hookId, newStatus);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? updated : e),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  selectAllHooks: async () => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    try {
      const updated = await experimentsApi.selectAll(experimentId);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? updated : e),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  deselectAllHooks: async () => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;

    try {
      const updated = await experimentsApi.deselectAll(experimentId);
      set(s => ({
        experiments: s.experiments.map(e => e.id === experimentId ? updated : e),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadHookGraphs: async () => {
    const experiment = get().activeExperiment();
    if (!experiment) return;

    try {
      const entries = await Promise.all(
        experiment.hooks.map(async (hook) => {
          const graph = await graphsApi.get(hook.graph_id);
          return [hook.graph_id, graph] as const;
        }),
      );
      const graphs: Record<string, Graph> = Object.fromEntries(entries);
      set({ hookGraphs: graphs });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  executeSelectedHooks: async () => {
    const experimentId = get().activeExperimentId;
    const experiment = get().activeExperiment();
    if (!experimentId || !experiment) return;

    const selected = experiment.hooks.filter(h => h.status === 'selected');
    if (selected.length === 0) return;

    const graphIds = selected.map(h => h.graph_id);
    const hookGraphs = get().hookGraphs;

    // Build graph_id -> hook lookup
    const hookByGraphId: Record<string, typeof selected[0]> = {};
    for (const h of selected) hookByGraphId[h.graph_id] = h;

    set({
      isExecuting: true,
      activeBatchId: null,
      error: null,
      executionProgress: {
        currentIndex: 0,
        total: selected.length,
        currentHookLabel: '',
        currentNodeLabel: '',
        completedHooks: [],
        failedHooks: [],
      },
    });

    try {
      const { batch_id } = await batchExecutionApi.start(experimentId, graphIds);
      set({ activeBatchId: batch_id });

      await new Promise<void>((resolve, reject) => {
        batchExecutionApi.subscribe(
          batch_id,
          (event) => {
            const hook = event.graph_id ? hookByGraphId[event.graph_id] : null;
            const graph = event.graph_id ? hookGraphs[event.graph_id] : null;

            if (event.event_type === 'node_started' && event.node_id && graph) {
              const node = graph.nodes.find(n => n.id === event.node_id);
              set(s => ({
                executionProgress: s.executionProgress ? {
                  ...s.executionProgress,
                  currentHookLabel: hook?.label ?? '',
                  currentNodeLabel: `Running: ${node?.label ?? event.node_id}`,
                } : null,
              }));
            }

            if (event.event_type === 'graph_completed' && hook) {
              set(s => ({
                executionProgress: s.executionProgress ? {
                  ...s.executionProgress,
                  completedHooks: [...s.executionProgress.completedHooks, hook.id],
                  currentIndex: s.executionProgress.completedHooks.length + s.executionProgress.failedHooks.length + 1,
                } : null,
              }));
              experimentsApi.updateHookStatus(experimentId, hook.id, 'executed').catch(() => {});
            }

            if (event.event_type === 'graph_failed' && hook) {
              set(s => ({
                executionProgress: s.executionProgress ? {
                  ...s.executionProgress,
                  failedHooks: [...s.executionProgress.failedHooks, hook.id],
                  currentIndex: s.executionProgress.completedHooks.length + s.executionProgress.failedHooks.length + 1,
                } : null,
              }));
            }

            if (event.event_type === 'batch_completed' || event.event_type === 'batch_failed') {
              resolve();
            }
          },
          () => resolve(),
          () => reject(new Error('SSE connection failed')),
        );
      });

      await get().loadExperiment(experimentId);
      set({ isExecuting: false, executionProgress: null, activeBatchId: null });
    } catch (err) {
      set({ isExecuting: false, executionProgress: null, activeBatchId: null, error: String(err) });
      await get().loadExperiment(experimentId);
    }
  },

  cancelExecution: async () => {
    const batchId = get().activeBatchId;
    if (batchId) {
      await batchExecutionApi.cancel(batchId).catch(() => {});
    }
    set({ isExecuting: false, executionProgress: null, activeBatchId: null });
    const experimentId = get().activeExperimentId;
    if (experimentId) await get().loadExperiment(experimentId);
  },

  setStep: (step) => set({ currentStep: step }),

  uploadReferenceImage: async (file: File) => {
    const experimentId = get().activeExperimentId;
    if (!experimentId) return;
    const { url } = await experimentsApi.uploadReferenceImage(experimentId, file);
    const experiment = get().activeExperiment();
    if (experiment?.genome) {
      await get().updateGenome({ ...experiment.genome, reference_image_url: url });
    }
  },
}));
