import { createNodeComponent } from './createNodeComponent';

// Maps backend node type strings to React Flow components
export const nodeTypes = {
  generate_text: createNodeComponent('GenerateTextNode'),
  generate_image: createNodeComponent('GenerateImageNode'),
  generate_video: createNodeComponent('GenerateVideoNode'),
  generate_speech: createNodeComponent('GenerateSpeechNode'),
  generate_music: createNodeComponent('GenerateMusicNode'),
  analyze_image: createNodeComponent('AnalyzeImageNode'),
  transform_image: createNodeComponent('TransformImageNode'),
};
