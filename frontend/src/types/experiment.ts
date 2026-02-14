export interface GenomeDimension {
  name: string;
  values: string[];
  description: string;
}

export interface RequiredAsset {
  name: string;
  description: string;
}

export interface ContentGenome {
  dimensions: GenomeDimension[];
  brief: string;
  goal: string;
  target_audience: string;
  platform: string;
  desired_outcome: string;
  reference_image_url: string;
  reference_image_usage: string;
  required_assets: RequiredAsset[];
}

export type ReferenceImageUsage = 'style' | 'composition' | 'mood' | 'recreate';

export type HookStatus = 'draft' | 'selected' | 'executed' | 'rejected';
export type ExperimentStatus = 'brief' | 'genome' | 'built' | 'reviewed' | 'executed';

export interface Hook {
  id: string;
  graph_id: string;
  genome_label: Record<string, string>;
  status: HookStatus;
  label: string;
}

export interface Experiment {
  id: string;
  name: string;
  brief: string;
  status: ExperimentStatus;
  genome: ContentGenome | null;
  hooks: Hook[];
  artifact_type: string;
  image_model: string;
  video_model: string;
  images_per_hook: number | null;
  created_at: number;
  updated_at: number;
}
