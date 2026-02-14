import { api } from './client';
import type { Experiment, ContentGenome } from '../types/experiment';

export const experimentsApi = {
  create: (name: string, brief: string) =>
    api.post<Experiment>('/api/experiments/', { name, brief }).then(r => r.data),

  list: () =>
    api.get<Experiment[]>('/api/experiments/').then(r => r.data),

  get: (id: string) =>
    api.get<Experiment>(`/api/experiments/${id}`).then(r => r.data),

  generateGenome: (id: string, brief?: string) =>
    api.post<Experiment>(`/api/experiments/${id}/genome`, brief ? { brief } : {}).then(r => r.data),

  updateGenome: (id: string, genome: ContentGenome) =>
    api.put<Experiment>(`/api/experiments/${id}/genome`, genome).then(r => r.data),

  updateConfig: (id: string, config: { artifact_type?: string; image_model?: string; video_model?: string; images_per_hook?: number }) =>
    api.patch<Experiment>(`/api/experiments/${id}/config`, config).then(r => r.data),

  buildHooks: (id: string, count = 4, signal?: AbortSignal) =>
    api.post<Experiment>(`/api/experiments/${id}/build`, { count }, { signal }).then(r => r.data),

  cancelBuild: (id: string) =>
    api.delete(`/api/experiments/${id}/build`),

  updateHookStatus: (id: string, hookId: string, status: string) =>
    api.patch<Experiment>(`/api/experiments/${id}/hooks/${hookId}`, { status }).then(r => r.data),

  selectAll: (id: string) =>
    api.post<Experiment>(`/api/experiments/${id}/select-all`).then(r => r.data),

  deselectAll: (id: string) =>
    api.post<Experiment>(`/api/experiments/${id}/deselect-all`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/experiments/${id}`),

  uploadReferenceImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ url: string }>(
      `/api/experiments/${id}/reference-image`, fd,
    ).then(r => r.data);
  },
};
