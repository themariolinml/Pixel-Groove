import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useGraphStore } from '../../stores/graphStore';
import { useExecutionStore } from '../../stores/executionStore';
import { useSelectedNode } from '../../hooks/useSelectedNode';
import { NODE_REGISTRY } from '../nodes/nodeRegistry';
import { PromptEditor } from './PromptEditor';
import { EnhancePromptToggle } from './EnhancePromptToggle';
import { StructuredOutputEditor } from './StructuredOutputEditor';
import { ParameterControls } from './ParameterControls';
import { ActionButtons } from './ActionButtons';

interface OutputField {
  name: string;
  type: string;
}

const ENRICHABLE_TYPES = new Set(['generate_text', 'generate_image', 'generate_video', 'generate_speech', 'generate_music']);

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

  const config = NODE_REGISTRY[selectedNode.type];
  const Icon = config?.icon;
  const isViolet = config?.accent === 'violet';

  const isTextNode = selectedNode.type === 'generate_text';
  const structuredValid = outputMode === 'freetext' || (outputFields.length > 0 && outputFields.every(f => f.name.trim()));
  const isEnrichable = ENRICHABLE_TYPES.has(selectedNode.type);
  const enrichEnabled = selectedNode.params.enrich !== false;

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

  const handleParamChange = (key: string, value: string | number | boolean) => {
    updateNode(selectedNode.id, { params: { ...selectedNode.params, [key]: value } });
  };

  const handleClose = () => {
    saveParams();
    setSelectedNode(null);
  };

  const handleEnrichToggle = () => {
    handleParamChange('enrich', !enrichEnabled);
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
          <PromptEditor
            prompt={prompt}
            onChange={setPrompt}
            onBlur={saveParams}
            onKeyDown={handleKeyDown}
            isRunning={isRunning}
            isViolet={isViolet}
            textareaRef={textareaRef}
          />

          {isEnrichable && (
            <EnhancePromptToggle
              enabled={enrichEnabled}
              onToggle={handleEnrichToggle}
              isRunning={isRunning}
            />
          )}

          {isTextNode && (
            <StructuredOutputEditor
              outputMode={outputMode}
              onModeChange={setOutputMode}
              outputFields={outputFields}
              onFieldsChange={setOutputFields}
              onBlur={saveParams}
            />
          )}

          <ParameterControls
            nodeType={selectedNode.type}
            nodeParams={selectedNode.params}
            onParamChange={handleParamChange}
            isRunning={isRunning}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          />

          <ActionButtons
            isRunning={isRunning}
            isViolet={isViolet}
            actionLabel={ACTION_LABELS[selectedNode.type] || 'Execute'}
            onRun={handleRun}
            onCancel={cancel}
            disabled={!prompt.trim() || !structuredValid}
          />
        </div>
      </div>
    </div>
  );
}
