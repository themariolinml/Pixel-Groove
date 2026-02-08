import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, X, ChevronRight, ChevronDown,
  Thermometer, Hash, Percent, Maximize, AudioLines, Timer,
  Plus, Trash2,
} from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useSelectedNode } from '../../hooks/useSelectedNode';
import { NODE_CONFIGS } from '../nodes/nodeConfig';
import { PARAM_CONFIGS, type ParamDef } from '../params/paramConfig';

interface OutputField {
  name: string;
  type: string;
}

const FIELD_TYPES = ['string', 'number', 'boolean', 'array'] as const;
const MAX_FIELDS = 10;

const PARAM_ICONS: Record<string, typeof Hash> = {
  aspect_ratio: Maximize,
  voice: AudioLines,
  duration: Timer,
  temperature: Thermometer,
  max_tokens: Hash,
  top_p: Percent,
};

const ACTION_LABELS: Record<string, string> = {
  generate_text: 'Generate',
  generate_image: 'Generate',
  generate_video: 'Generate',
  generate_speech: 'Generate',
  generate_music: 'Generate',
  analyze_image: 'Analyze',
  transform_image: 'Transform',
};

interface PopoverPosition {
  top: number;
  left: number;
  side: 'right' | 'left';
}

export function NodeEditPopover() {
  const selectedNodeId = useGraphStore(s => s.selectedNodeId);
  const setSelectedNode = useGraphStore(s => s.setSelectedNode);
  const updateNode = useGraphStore(s => s.updateNode);
  const isRunning = useExecutionStore(s => s.isRunning);
  const execute = useExecutionStore(s => s.execute);
  const cancel = useExecutionStore(s => s.cancel);
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [outputMode, setOutputMode] = useState<'freetext' | 'structured'>('freetext');
  const [outputFields, setOutputFields] = useState<OutputField[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedNode = useSelectedNode();

  useEffect(() => {
    if (selectedNode) {
      setPrompt((selectedNode.params.prompt as string) || '');
      setShowAdvanced(false);
      setOutputMode((selectedNode.params.output_mode as string) === 'structured' ? 'structured' : 'freetext');
      setOutputFields((selectedNode.params.output_fields as OutputField[]) || []);
    }
  }, [selectedNode?.id]);

  const updatePosition = useCallback(() => {
    if (!selectedNodeId) { setPosition(null); return; }
    const el = document.querySelector(`[data-id="${selectedNodeId}"]`);
    if (!el) { setPosition(null); return; }
    const rect = el.getBoundingClientRect();
    const gap = 12;
    const popoverW = 320;
    const fitsRight = rect.right + gap + popoverW < window.innerWidth - 24;
    setPosition({
      top: Math.max(24, rect.top),
      left: fitsRight ? rect.right + gap : rect.left - gap - popoverW,
      side: fitsRight ? 'right' : 'left',
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (!selectedNodeId) return;
    let raf: number;
    const loop = () => {
      updatePosition();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selectedNodeId, updatePosition]);

  useEffect(() => {
    if (selectedNode && position) {
      const t = setTimeout(() => textareaRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [selectedNode?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSelectedNode]);

  if (!selectedNode || !position) return null;

  const config = NODE_CONFIGS[selectedNode.type];
  const paramConfig = PARAM_CONFIGS[selectedNode.type];
  const Icon = config?.icon;
  const isViolet = config?.accent === 'violet';

  const isTextNode = selectedNode.type === 'generate_text';
  const structuredValid = outputMode === 'freetext' || (outputFields.length > 0 && outputFields.every(f => f.name.trim()));

  const saveParams = () => {
    const next: Record<string, unknown> = { ...selectedNode.params, prompt };
    if (isTextNode) {
      next.output_mode = outputMode;
      next.output_fields = outputMode === 'structured' ? outputFields : [];
    }
    updateNode(selectedNode.id, { params: next });
  };

  const handleRun = () => {
    saveParams();
    execute([selectedNode.id]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleParamChange = (key: string, value: string | number) => {
    updateNode(selectedNode.id, { params: { ...selectedNode.params, [key]: value } });
  };

  const handleClose = () => {
    saveParams();
    setSelectedNode(null);
  };

  const renderParam = (def: ParamDef) => {
    const ParamIcon = PARAM_ICONS[def.key];
    const value = (selectedNode.params[def.key] as string | number) ?? def.defaultValue;

    return (
      <div key={def.key} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 shrink-0" title={def.tooltip}>
          {ParamIcon && <ParamIcon size={12} className="text-zinc-500" />}
          <span className="text-[11px] text-zinc-400">{def.label}</span>
        </div>
        {def.type === 'select' && def.options ? (
          <select
            value={value}
            onChange={e => handleParamChange(def.key, e.target.value)}
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
              value={value}
              onChange={e => handleParamChange(def.key, Number(e.target.value))}
              disabled={isRunning}
              title={def.tooltip}
              className="w-20 h-1"
            />
            <span className="text-[11px] text-zinc-400 tabular-nums w-10 text-right">
              {value}{def.unit || ''}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="fixed z-50 w-80 transition-opacity duration-150"
      style={{ top: position.top, left: position.left }}
    >
      {/* Arrow connector */}
      <div className={`absolute top-5 w-3 h-3 rotate-45 bg-[rgb(18,18,18)] ${
        position.side === 'right'
          ? '-left-[6px] border-l border-b border-white/[0.08]'
          : '-right-[6px] border-r border-t border-white/[0.08]'
      }`} />

      <div className="glass rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col max-h-[calc(100vh-48px)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/[0.06]">
          {Icon && (
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isViolet ? 'bg-violet-500/10' : 'bg-cyan-500/10'
            }`}>
              <Icon size={13} className={isViolet ? 'text-violet-400' : 'text-cyan-400'} />
            </div>
          )}
          <span className="text-[13px] font-medium text-zinc-200 flex-1 truncate">{selectedNode.label}</span>
          <button onClick={handleClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          {/* Prompt textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onBlur={saveParams}
              onKeyDown={handleKeyDown}
              placeholder="Enter a prompt..."
              disabled={isRunning}
              rows={3}
              className={`w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-y min-h-[80px] max-h-[240px] disabled:opacity-40 ${
                isViolet ? 'focus:border-violet-500/40' : 'focus:border-cyan-500/40'
              }`}
            />
          </div>

          {/* Structured Output (text nodes only) */}
          {isTextNode && (
            <div className="space-y-2">
              {/* Mode toggle */}
              <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/[0.08]">
                <button
                  onClick={() => { setOutputMode('freetext'); }}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                    outputMode === 'freetext'
                      ? 'bg-white/10 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Free Text
                </button>
                <button
                  onClick={() => { setOutputMode('structured'); }}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
                    outputMode === 'structured'
                      ? 'bg-white/10 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  Structured
                </button>
              </div>

              {/* Field editor */}
              {outputMode === 'structured' && (
                <div className="space-y-1.5">
                  {outputFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={field.name}
                        onChange={e => {
                          const next = [...outputFields];
                          next[i] = { ...next[i], name: e.target.value };
                          setOutputFields(next);
                        }}
                        onBlur={saveParams}
                        placeholder="field name"
                        className="flex-1 bg-black/30 border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 min-w-0"
                      />
                      <select
                        value={field.type}
                        onChange={e => {
                          const next = [...outputFields];
                          next[i] = { ...next[i], type: e.target.value };
                          setOutputFields(next);
                        }}
                        className="bg-black/30 border border-white/[0.08] rounded-md px-1.5 py-1 text-[11px] text-zinc-300 outline-none cursor-pointer"
                      >
                        {FIELD_TYPES.map(t => (
                          <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setOutputFields(outputFields.filter((_, j) => j !== i))}
                        className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setOutputFields([...outputFields, { name: '', type: 'string' }])}
                      disabled={outputFields.length >= MAX_FIELDS}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={12} />
                      Add field
                    </button>
                    <span className="text-[10px] text-zinc-600">{outputFields.length}/{MAX_FIELDS}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Essential params */}
          {paramConfig?.essential.length > 0 && (
            <div className="space-y-2">
              {paramConfig.essential.map(renderParam)}
            </div>
          )}

          {/* Advanced params toggle */}
          {paramConfig?.advanced.length > 0 && (
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
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

          {/* Execute / Cancel */}
          <div className="pt-2 border-t border-white/[0.06]">
            {isRunning ? (
              <button
                onClick={() => cancel()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 transition-colors"
              >
                <X size={13} />
                Cancel
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={!prompt.trim() || !structuredValid}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                  isViolet
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                }`}
              >
                <Play size={11} fill="currentColor" />
                {ACTION_LABELS[selectedNode.type] || 'Execute'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
