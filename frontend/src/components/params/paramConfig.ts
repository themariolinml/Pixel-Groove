export type ParamType = 'select' | 'slider';

export interface ParamOption {
  label: string;
  value: string;
}

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  tooltip: string;
  defaultValue: string | number;
  options?: ParamOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface NodeParamConfig {
  essential: ParamDef[];
  advanced: ParamDef[];
}

export const PARAM_CONFIGS: Record<string, NodeParamConfig> = {
  generate_text: {
    essential: [],
    advanced: [
      { key: 'temperature', label: 'Temperature', type: 'slider', tooltip: 'Controls randomness. Higher values produce more creative output.', defaultValue: 0.7, min: 0, max: 2, step: 0.1 },
      { key: 'max_tokens', label: 'Max Tokens', type: 'slider', tooltip: 'Maximum length of the generated response.', defaultValue: 2048, min: 128, max: 8192, step: 128 },
      { key: 'top_p', label: 'Top P', type: 'slider', tooltip: 'Nucleus sampling. Lower values make output more focused.', defaultValue: 0.95, min: 0, max: 1, step: 0.05 },
    ],
  },
  generate_image: {
    essential: [
      {
        key: 'aspect_ratio', label: 'Ratio', type: 'select', tooltip: 'Output image aspect ratio.',
        defaultValue: '1:1',
        options: [
          { label: '1:1', value: '1:1' },
          { label: '16:9', value: '16:9' },
          { label: '9:16', value: '9:16' },
          { label: '4:3', value: '4:3' },
          { label: '3:4', value: '3:4' },
        ],
      },
    ],
    advanced: [],
  },
  generate_video: {
    essential: [
      {
        key: 'aspect_ratio', label: 'Format', type: 'select', tooltip: 'Output video aspect ratio.',
        defaultValue: '16:9',
        options: [
          { label: '16:9', value: '16:9' },
          { label: '9:16', value: '9:16' },
        ],
      },
    ],
    advanced: [],
  },
  generate_speech: {
    essential: [
      {
        key: 'voice', label: 'Voice', type: 'select', tooltip: 'Voice character for speech synthesis.',
        defaultValue: 'Kore',
        options: [
          { label: 'Kore', value: 'Kore' },
          { label: 'Charon', value: 'Charon' },
          { label: 'Fenrir', value: 'Fenrir' },
          { label: 'Aoede', value: 'Aoede' },
          { label: 'Puck', value: 'Puck' },
          { label: 'Leda', value: 'Leda' },
        ],
      },
    ],
    advanced: [],
  },
  generate_music: {
    essential: [
      { key: 'duration', label: 'Duration', type: 'slider', tooltip: 'Length of generated music in seconds.', defaultValue: 10, min: 5, max: 30, step: 5, unit: 's' },
    ],
    advanced: [],
  },
  analyze_image: {
    essential: [],
    advanced: [
      { key: 'temperature', label: 'Temperature', type: 'slider', tooltip: 'Controls randomness. Higher values produce more creative output.', defaultValue: 0.4, min: 0, max: 2, step: 0.1 },
      { key: 'max_tokens', label: 'Max Tokens', type: 'slider', tooltip: 'Maximum length of the analysis.', defaultValue: 1024, min: 128, max: 4096, step: 128 },
    ],
  },
  transform_image: {
    essential: [
      {
        key: 'aspect_ratio', label: 'Ratio', type: 'select', tooltip: 'Output image aspect ratio.',
        defaultValue: '1:1',
        options: [
          { label: '1:1', value: '1:1' },
          { label: '16:9', value: '16:9' },
          { label: '9:16', value: '9:16' },
          { label: '4:3', value: '4:3' },
          { label: '3:4', value: '3:4' },
        ],
      },
    ],
    advanced: [],
  },
};
