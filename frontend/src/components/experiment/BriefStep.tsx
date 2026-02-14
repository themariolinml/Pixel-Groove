import { useState } from 'react';
import { Sparkles, Loader2, Image, Video } from 'lucide-react';
import { useExperimentStore } from '../../stores/experimentStore';
import { IMAGE_MODEL_OPTIONS, VIDEO_MODEL_OPTIONS, ARTIFACT_TYPES, DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL, DEFAULT_ARTIFACT_TYPE } from '../../constants/models';

export function BriefStep() {
  const activeExperiment = useExperimentStore(s => s.activeExperiment());
  const generateGenome = useExperimentStore(s => s.generateGenome);
  const updateExperimentConfig = useExperimentStore(s => s.updateExperimentConfig);
  const isLoading = useExperimentStore(s => s.isLoading);

  const [brief, setBrief] = useState(activeExperiment?.brief ?? '');

  const artifactType = activeExperiment?.artifact_type ?? DEFAULT_ARTIFACT_TYPE;
  const imageModel = activeExperiment?.image_model ?? DEFAULT_IMAGE_MODEL;
  const videoModel = activeExperiment?.video_model ?? DEFAULT_VIDEO_MODEL;

  const handleGenerate = async () => {
    if (!brief.trim()) return;
    await generateGenome(brief.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl space-y-4">
        {/* Output Medium */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-violet-400" />
            <h3 className="text-[13px] font-medium text-zinc-200">Output Medium</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <button
                onClick={() => updateExperimentConfig({ artifact_type: ARTIFACT_TYPES.IMAGE })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  artifactType === ARTIFACT_TYPES.IMAGE
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:border-violet-500/40'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                Image
              </button>
              <button
                onClick={() => updateExperimentConfig({ artifact_type: ARTIFACT_TYPES.VIDEO })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  artifactType === ARTIFACT_TYPES.VIDEO
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : 'bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:border-violet-500/40'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Video
              </button>
            </div>
            <select
              value={artifactType === ARTIFACT_TYPES.IMAGE ? imageModel : videoModel}
              onChange={e => updateExperimentConfig(
                artifactType === ARTIFACT_TYPES.IMAGE
                  ? { image_model: e.target.value }
                  : { video_model: e.target.value }
              )}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-zinc-300 outline-none cursor-pointer hover:border-violet-500/40 transition-colors"
            >
              {(artifactType === ARTIFACT_TYPES.IMAGE ? IMAGE_MODEL_OPTIONS : VIDEO_MODEL_OPTIONS).map(o => (
                <option key={o.value} value={o.value} className="bg-[#1a1a1a]">
                  {o.label}
                </option>
              ))}
            </select>
            {artifactType === ARTIFACT_TYPES.IMAGE && (
              <select
                value={activeExperiment?.images_per_hook ?? 0}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  updateExperimentConfig({ images_per_hook: val });
                }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-zinc-300 outline-none cursor-pointer hover:border-violet-500/40 transition-colors"
              >
                <option value={0} className="bg-[#1a1a1a]">Auto</option>
                <option value={1} className="bg-[#1a1a1a]">1 image</option>
                <option value={2} className="bg-[#1a1a1a]">2 images</option>
                <option value={3} className="bg-[#1a1a1a]">3 images</option>
                <option value={4} className="bg-[#1a1a1a]">4 images</option>
                <option value={5} className="bg-[#1a1a1a]">5 images</option>
              </select>
            )}
          </div>
        </div>

        {/* Brief */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Sparkles size={24} className="text-violet-400" />
              Describe Your Content Goal
            </h2>
            <p className="text-[13px] text-zinc-400">
              Tell us what you want to create. Be specific about your audience, platform, and desired outcome.
            </p>
          </div>

          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={isLoading}
            placeholder="e.g., 'YouTube pre-roll ads for a fitness app targeting 25-35 year olds. Goal: Drive app downloads with compelling before/after transformations.'"
            className="w-full min-h-[180px] bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleGenerate}
            disabled={!brief.trim() || isLoading}
            className="w-full px-6 py-3 text-[13px] font-medium rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating Content Genome...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Content Genome
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
