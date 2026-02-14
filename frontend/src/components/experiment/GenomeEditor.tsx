import { useState, useRef } from 'react';
import { Plus, X, Loader2, Dna, Target, Upload, Package } from 'lucide-react';
import { useExperimentStore } from '../../stores/experimentStore';
import type { GenomeDimension, ContentGenome, ReferenceImageUsage } from '../../types/experiment';

export function GenomeEditor() {
  const activeExperiment = useExperimentStore(s => s.activeExperiment());
  const updateGenome = useExperimentStore(s => s.updateGenome);
  const buildHooks = useExperimentStore(s => s.buildHooks);
  const isLoading = useExperimentStore(s => s.isLoading);
  const uploadReferenceImage = useExperimentStore(s => s.uploadReferenceImage);

  const [genome, setGenome] = useState<ContentGenome>(
    activeExperiment?.genome ?? {
      dimensions: [],
      brief: '',
      goal: '',
      target_audience: '',
      platform: '',
      desired_outcome: '',
      reference_image_url: '',
      reference_image_usage: '',
      required_assets: [],
    }
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [buildCount, setBuildCount] = useState(4);
  const [addingValue, setAddingValue] = useState<number | null>(null);
  const [newValue, setNewValue] = useState('');

  const handleDimensionChange = (idx: number, field: keyof GenomeDimension, value: string | string[]) => {
    const updated = {
      ...genome,
      dimensions: genome.dimensions.map((d, i) =>
        i === idx ? { ...d, [field]: value } : d
      ),
    };
    setGenome(updated);
    updateGenome(updated);
  };

  const handleRemoveValue = (dimIdx: number, valIdx: number) => {
    const updated = {
      ...genome,
      dimensions: genome.dimensions.map((d, i) =>
        i === dimIdx
          ? { ...d, values: d.values.filter((_, vi) => vi !== valIdx) }
          : d
      ),
    };
    setGenome(updated);
    updateGenome(updated);
  };

  const handleAddValue = (dimIdx: number) => {
    if (!newValue.trim()) return;
    const updated = {
      ...genome,
      dimensions: genome.dimensions.map((d, i) =>
        i === dimIdx ? { ...d, values: [...d.values, newValue.trim()] } : d
      ),
    };
    setGenome(updated);
    updateGenome(updated);
    setNewValue('');
    setAddingValue(null);
  };

  const handleAddDimension = () => {
    const updated = {
      ...genome,
      dimensions: [
        ...genome.dimensions,
        { name: 'New Dimension', values: [], description: '' },
      ],
    };
    setGenome(updated);
    updateGenome(updated);
  };

  const handleRemoveDimension = (idx: number) => {
    const updated = {
      ...genome,
      dimensions: genome.dimensions.filter((_, i) => i !== idx),
    };
    setGenome(updated);
    updateGenome(updated);
  };

  const handleBuild = async () => {
    await buildHooks(buildCount);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadReferenceImage(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadReferenceImage(file);
    }
  };

  const handleRemoveImage = async () => {
    const updated = { ...genome, reference_image_url: '' };
    setGenome(updated);
    await updateGenome(updated);
  };

  const handleUsageChange = async (usage: ReferenceImageUsage) => {
    const updated = { ...genome, reference_image_usage: usage };
    setGenome(updated);
    await updateGenome(updated);
  };

  const handleAssetChange = (idx: number, field: 'name' | 'description', value: string) => {
    const updated = {
      ...genome,
      required_assets: genome.required_assets.map((a, i) =>
        i === idx ? { ...a, [field]: value } : a
      ),
    };
    setGenome(updated);
  };

  const handleAssetBlur = () => {
    updateGenome(genome);
  };

  const handleAddAsset = () => {
    const updated = {
      ...genome,
      required_assets: [...genome.required_assets, { name: '', description: '' }],
    };
    setGenome(updated);
    updateGenome(updated);
  };

  const handleRemoveAsset = (idx: number) => {
    const updated = {
      ...genome,
      required_assets: genome.required_assets.filter((_, i) => i !== idx),
    };
    setGenome(updated);
    updateGenome(updated);
  };

  return (
    <div className="flex items-start justify-center p-8 pt-24 pb-16">
      <div className="w-full max-w-3xl space-y-4">
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Dna size={20} className="text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Content Genome</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Goal</label>
              <input
                type="text"
                value={genome.goal}
                onChange={(e) => setGenome({ ...genome, goal: e.target.value })}
                onBlur={() => updateGenome(genome)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Audience</label>
              <input
                type="text"
                value={genome.target_audience}
                onChange={(e) => setGenome({ ...genome, target_audience: e.target.value })}
                onBlur={() => updateGenome(genome)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">Platform</label>
              <input
                type="text"
                value={genome.platform}
                onChange={(e) => setGenome({ ...genome, platform: e.target.value })}
                onBlur={() => updateGenome(genome)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-violet-500/40"
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Creative Direction</h2>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Desired Outcome</label>
            <textarea
              value={genome.desired_outcome}
              onChange={(e) => setGenome({ ...genome, desired_outcome: e.target.value })}
              onBlur={() => updateGenome(genome)}
              placeholder="Describe what the final creative should look and feel like..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 resize-none"
            />
            <p className="text-[10px] text-zinc-500 mt-1">AI-generated — edit to refine your vision</p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[11px] text-zinc-500 mb-2 block">Reference Image</label>
              {genome.reference_image_url ? (
                <div className="relative group">
                  <img
                    src={genome.reference_image_url}
                    alt="Reference"
                    className="w-full max-h-32 object-cover rounded-lg border border-white/[0.08]"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/[0.12] rounded-lg cursor-pointer hover:border-violet-500/40 transition-colors bg-white/[0.02]"
                >
                  <Upload size={20} className="text-zinc-500 mb-2" />
                  <p className="text-[11px] text-zinc-500">Drop or click to upload reference image</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="w-48">
              <label className="text-[11px] text-zinc-500 mb-2 block">Usage</label>
              <div className="space-y-2">
                {([
                  { value: 'style' as const, label: 'Style', desc: 'Match visual style' },
                  { value: 'composition' as const, label: 'Composition', desc: 'Follow framing' },
                  { value: 'mood' as const, label: 'Mood', desc: 'Capture feeling' },
                  { value: 'recreate' as const, label: 'Recreate', desc: 'Reproduce the look' },
                ]).map(({ value, desc }) => (
                  <button
                    key={value}
                    onClick={() => handleUsageChange(value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[11px] border transition-colors ${
                      (genome.reference_image_usage || 'style') === value
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                        : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:border-violet-500/40'
                    }`}
                  >
                    {desc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Required Assets */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-amber-400" />
            <h3 className="text-[13px] font-medium text-zinc-200">Required Assets</h3>
            <span className="text-[11px] text-zinc-500">(AI-extracted — edit to ensure accuracy)</span>
          </div>
          <div className="space-y-3">
            {genome.required_assets.map((asset, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input
                    value={asset.name}
                    onChange={e => handleAssetChange(idx, 'name', e.target.value)}
                    onBlur={handleAssetBlur}
                    placeholder="Asset name (e.g., luxury wristwatch)"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-amber-500/40 transition-colors"
                  />
                  <textarea
                    value={asset.description}
                    onChange={e => handleAssetChange(idx, 'description', e.target.value)}
                    onBlur={handleAssetBlur}
                    placeholder="Visual description for reference image generation..."
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-amber-500/40 transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={() => handleRemoveAsset(idx)}
                  className="mt-1.5 p-1 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddAsset}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Asset
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {genome.dimensions.map((dim, dimIdx) => (
            <div key={dimIdx} className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  value={dim.name}
                  onChange={(e) => handleDimensionChange(dimIdx, 'name', e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[13px] font-medium text-white focus:outline-none focus:border-violet-500/40"
                />
                <button
                  onClick={() => handleRemoveDimension(dimIdx)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {dim.values.map((val, valIdx) => (
                  <div
                    key={valIdx}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg"
                  >
                    <span className="text-[11px] text-violet-300">{val}</span>
                    <button
                      onClick={() => handleRemoveValue(dimIdx, valIdx)}
                      className="text-violet-400/60 hover:text-violet-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {addingValue === dimIdx ? (
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddValue(dimIdx);
                      if (e.key === 'Escape') {
                        setAddingValue(null);
                        setNewValue('');
                      }
                    }}
                    onBlur={() => {
                      if (newValue.trim()) handleAddValue(dimIdx);
                      else {
                        setAddingValue(null);
                        setNewValue('');
                      }
                    }}
                    autoFocus
                    className="w-32 px-2 py-1 bg-white/[0.03] border border-violet-500/40 rounded-lg text-[11px] text-white focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setAddingValue(dimIdx)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/[0.03] border border-white/[0.08] rounded-lg text-[11px] text-zinc-400 hover:text-violet-400 hover:border-violet-500/40 transition-colors"
                  >
                    <Plus size={12} />
                    Add Value
                  </button>
                )}
              </div>

              <input
                type="text"
                value={dim.description}
                onChange={(e) => handleDimensionChange(dimIdx, 'description', e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleAddDimension}
          className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[12px] text-zinc-400 hover:text-violet-400 hover:border-violet-500/40 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Add Dimension
        </button>

        {/* Build Controls */}
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block">Hooks</label>
            <div className="flex gap-2">
              {[2, 4, 6, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => setBuildCount(count)}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    buildCount === count
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                      : 'bg-white/[0.03] text-zinc-400 border border-white/[0.08] hover:border-violet-500/40'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleBuild}
              disabled={isLoading || genome.dimensions.length === 0}
              className="px-6 py-2.5 text-[13px] font-medium rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  Build {buildCount} Hooks
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
