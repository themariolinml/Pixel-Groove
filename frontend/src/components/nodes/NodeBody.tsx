import type { GraphNode, MediaResult } from '../../types/graph';
import { NODE_REGISTRY } from './nodeRegistry';
import { ExpandButton } from './ExpandButton';
import { API_URL } from '../../api/client';

interface NodeBodyProps {
  node: GraphNode;
  idleHeight: number;
  onExpand?: (result: MediaResult, outputType: string, structured: boolean) => void;
}

export function NodeBody({ node, idleHeight, onExpand }: NodeBodyProps) {
  const config = NODE_REGISTRY[node.type];
  const Icon = config?.icon;
  const prompt = (node.params.prompt as string) || '';
  const result = node.result;
  const outputType = node.output_ports[0]?.port_type;

  if (result) {
    if (outputType === 'text') {
      const isStructured = node.params.output_mode === 'structured';
      if (isStructured) {
        try {
          const parsed = JSON.parse(result.urls.original);
          return (
            <div className="p-2 bg-black/20 rounded-lg space-y-1 group/result relative">
              {Object.entries(parsed).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-[11px]">
                  <span className="text-zinc-500 shrink-0">{key}</span>
                  <span className="text-zinc-300 truncate">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </span>
                </div>
              ))}
              <ExpandButton onClick={e => { e.stopPropagation(); onExpand?.(result, 'text', true); }} />
            </div>
          );
        } catch {
          // Fall through to plain text display
        }
      }
      return (
        <div className="p-2 bg-black/20 rounded-lg group/result relative">
          <p className="text-xs text-zinc-300 line-clamp-4">{result.urls.original}</p>
          <ExpandButton onClick={e => { e.stopPropagation(); onExpand?.(result, 'text', false); }} />
        </div>
      );
    }
    if (outputType === 'image') {
      return (
        <div className="group/result relative rounded-lg overflow-hidden">
          <img
            src={`${API_URL}${result.urls.thumbnail}`}
            alt="Output"
            className="w-full rounded-lg object-cover max-h-[180px]"
          />
          <ExpandButton onClick={e => { e.stopPropagation(); onExpand?.(result, 'image', false); }} />
        </div>
      );
    }
    if (outputType === 'video') {
      return (
        <div className="group/result relative rounded-lg overflow-hidden">
          <video
            src={`${API_URL}${result.urls.original}`}
            controls
            className="w-full rounded-lg"
          />
          <ExpandButton onClick={e => { e.stopPropagation(); onExpand?.(result, 'video', false); }} />
        </div>
      );
    }
    if (outputType === 'audio') {
      return (
        <div className="group/result relative">
          <audio src={`${API_URL}${result.urls.original}`} controls className="w-full" />
          <ExpandButton onClick={e => { e.stopPropagation(); onExpand?.(result, 'audio', false); }} />
        </div>
      );
    }
  }

  if (prompt) {
    return (
      <div className="flex items-center" style={{ minHeight: idleHeight }}>
        <p className="text-[11px] text-zinc-400 line-clamp-3">{prompt}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ minHeight: idleHeight }}>
      {Icon && <Icon size={28} className="text-zinc-700" />}
    </div>
  );
}
