import { ChevronRight, ChevronDown, Hash, Thermometer, Percent, Maximize, AudioLines, Timer, ImagePlus, Layers } from 'lucide-react';
import { PARAM_CONFIGS, type ParamDef } from '../params/paramConfig';

interface ParameterControlsProps {
  nodeType: string;
  nodeParams: Record<string, unknown>;
  onParamChange: (key: string, value: string | number | boolean) => void;
  isRunning: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

const PARAM_ICONS: Record<string, typeof Hash> = {
  aspect_ratio: Maximize,
  voice: AudioLines,
  duration: Timer,
  temperature: Thermometer,
  max_tokens: Hash,
  top_p: Percent,
  reference_mode: ImagePlus,
  model: Layers,
};

export function ParameterControls({
  nodeType,
  nodeParams,
  onParamChange,
  isRunning,
  showAdvanced,
  onToggleAdvanced,
}: ParameterControlsProps) {
  const paramConfig = PARAM_CONFIGS[nodeType];

  if (!paramConfig) return null;

  const renderParam = (def: ParamDef) => {
    const ParamIcon = PARAM_ICONS[def.key];
    const value = nodeParams[def.key] ?? def.defaultValue;

    return (
      <div key={def.key} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 shrink-0" title={def.tooltip}>
          {ParamIcon && <ParamIcon size={12} className="text-zinc-500" />}
          <span className="text-[11px] text-zinc-400">{def.label}</span>
        </div>
        {def.type === 'toggle' ? (
          <button
            onClick={() => onParamChange(def.key, !value)}
            disabled={isRunning}
            title={def.tooltip}
            className={`relative w-8 h-[18px] rounded-full transition-all duration-200 disabled:opacity-40 ${
              value ? 'bg-violet-500/60' : 'bg-white/10'
            }`}
          >
            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 ${
              value ? 'translate-x-[14px]' : 'translate-x-0.5'
            }`} />
          </button>
        ) : def.type === 'select' && def.options ? (
          <select
            value={value as string}
            onChange={e => onParamChange(def.key, e.target.value)}
            disabled={isRunning}
            title={def.tooltip}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-zinc-300 outline-none cursor-pointer hover:bg-white/10 disabled:opacity-40"
          >
            {def.options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">{opt.label}</option>
            ))}
          </select>
        ) : def.type === 'slider' ? (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={def.min} max={def.max} step={def.step}
              value={value as number}
              onChange={e => onParamChange(def.key, Number(e.target.value))}
              disabled={isRunning}
              title={def.tooltip}
              className="w-20 h-1"
            />
            <span className="text-[11px] text-zinc-400 tabular-nums w-10 text-right">
              {String(value)}{def.unit || ''}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {/* Essential params */}
      {paramConfig.essential.length > 0 && (
        <div className="space-y-2">
          {paramConfig.essential.map(renderParam)}
        </div>
      )}

      {/* Advanced params toggle */}
      {paramConfig.advanced.length > 0 && (
        <div>
          <button
            onClick={onToggleAdvanced}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider font-medium"
          >
            {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Advanced
          </button>
          {showAdvanced && (
            <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-2">
              {paramConfig.advanced.map(renderParam)}
            </div>
          )}
        </div>
      )}
    </>
  );
}
