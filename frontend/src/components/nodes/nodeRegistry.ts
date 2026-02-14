import { Type, Image, Film, Mic, Music, ScanEye, Paintbrush2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NodeType } from '../../types/graph';

export interface NodeTypeDefinition {
  type: NodeType;
  label: string;
  fullTitle: string;
  description: string;
  provider: string;
  icon: LucideIcon;
  accent: 'violet' | 'cyan';
  category: 'generation' | 'transformation';
  mediaGroup: 'text' | 'image' | 'video' | 'audio';
  geometry: { width: number; idleHeight: number };
}

export const NODE_REGISTRY: Record<string, NodeTypeDefinition> = {
  generate_text: {
    type: 'generate_text', label: 'TEXT', fullTitle: 'Generate Text',
    description: 'Create written content, stories, scripts, or responses using AI language models.',
    provider: 'Gemini Flash', icon: Type, accent: 'violet',
    category: 'generation', mediaGroup: 'text',
    geometry: { width: 200, idleHeight: 80 },
  },
  generate_image: {
    type: 'generate_image', label: 'IMAGE', fullTitle: 'Generate Image',
    description: 'Generate images from text descriptions using AI image synthesis.',
    provider: 'Imagen 4', icon: Image, accent: 'violet',
    category: 'generation', mediaGroup: 'image',
    geometry: { width: 240, idleHeight: 160 },
  },
  generate_video: {
    type: 'generate_video', label: 'VIDEO', fullTitle: 'Generate Video',
    description: 'Create video clips from text prompts or images using AI video generation.',
    provider: 'Veo 3.1', icon: Film, accent: 'violet',
    category: 'generation', mediaGroup: 'video',
    geometry: { width: 320, idleHeight: 100 },
  },
  generate_speech: {
    type: 'generate_speech', label: 'SPEECH', fullTitle: 'Generate Speech',
    description: 'Convert text into natural-sounding speech with AI voice synthesis.',
    provider: 'Gemini TTS', icon: Mic, accent: 'violet',
    category: 'generation', mediaGroup: 'audio',
    geometry: { width: 280, idleHeight: 52 },
  },
  generate_music: {
    type: 'generate_music', label: 'MUSIC', fullTitle: 'Generate Music',
    description: 'Create music tracks from text descriptions using AI music synthesis.',
    provider: 'Lyria', icon: Music, accent: 'violet',
    category: 'generation', mediaGroup: 'audio',
    geometry: { width: 280, idleHeight: 52 },
  },
  analyze_image: {
    type: 'analyze_image', label: 'ANALYZE', fullTitle: 'Analyze Image',
    description: 'Describe, caption, or extract information from images using computer vision.',
    provider: 'Gemini Flash', icon: ScanEye, accent: 'cyan',
    category: 'transformation', mediaGroup: 'image',
    geometry: { width: 240, idleHeight: 160 },
  },
  transform_image: {
    type: 'transform_image', label: 'TRANSFORM', fullTitle: 'Transform Image',
    description: 'Edit and modify images using text-guided AI transformations.',
    provider: 'Gemini + Imagen', icon: Paintbrush2, accent: 'cyan',
    category: 'transformation', mediaGroup: 'image',
    geometry: { width: 240, idleHeight: 160 },
  },
};

/** Grouped by media type for toolbar display. */
export const NODE_GROUPS = {
  text: Object.values(NODE_REGISTRY).filter(n => n.mediaGroup === 'text'),
  image: Object.values(NODE_REGISTRY).filter(n => n.mediaGroup === 'image'),
  video: Object.values(NODE_REGISTRY).filter(n => n.mediaGroup === 'video'),
  audio: Object.values(NODE_REGISTRY).filter(n => n.mediaGroup === 'audio'),
} as const;

/** Port colors by media type. */
export const PORT_COLORS: Record<string, string> = {
  text: '#a1a1aa',
  image: '#f472b6',
  video: '#c084fc',
  audio: '#22d3ee',
  any: '#71717a',
};
