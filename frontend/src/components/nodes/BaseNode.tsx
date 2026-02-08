import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { X } from 'lucide-react';
import type { GraphNode, MediaResult } from '../../types/graph';
import { useGraphStore } from '../../stores/graphStore';
import { NODE_CONFIGS } from './nodeConfig';
import { NODE_GEOMETRIES, PORT_COLORS } from './nodeGeometry';
import { NodeBody } from './NodeBody';
import { NodeStatusBar } from './NodeStatusBar';
import { MediaResultOverlay } from './MediaResultOverlay';

interface BaseNodeProps {
  node: GraphNode;
  selected: boolean;
}

export function BaseNode({ node, selected }: BaseNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [expanded, setExpanded] = useState<{ result: MediaResult; outputType: string; structured: boolean } | null>(null);
  const deleteNode = useGraphStore(s => s.deleteNode);
  const config = NODE_CONFIGS[node.type];
  const Icon = config?.icon;
  const isViolet = config?.accent === 'violet';
  const geo = NODE_GEOMETRIES[node.type] ?? { width: 240, idleHeight: 80 };

  return (
    <div
      className={`
        relative flex flex-col rounded-xl transition-all duration-200
        bg-white/[0.03] backdrop-blur-md
        shadow-[0_4px_24px_rgba(0,0,0,0.3)]
        ${selected
          ? isViolet
            ? 'border border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.12)]'
            : 'border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
          : 'border border-white/[0.08] hover:border-white/[0.15]'}
      `}
      style={{ width: geo.width }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Identity Strip */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${
        isViolet ? 'bg-violet-500/10' : 'bg-cyan-500/10'
      }`}>
        {Icon && <Icon size={13} className={isViolet ? 'text-violet-400' : 'text-cyan-400'} />}
        <span className="text-[11px] font-medium text-zinc-200 truncate flex-1">
          {node.label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
          className={`text-zinc-500 hover:text-red-400 transition-all shrink-0 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <X size={13} />
        </button>
      </div>

      {/* Result Canvas */}
      <div className="p-3">
        <NodeBody
          node={node}
          idleHeight={geo.idleHeight}
          onExpand={(result, outputType, structured) => setExpanded({ result, outputType, structured })}
        />
      </div>

      {/* Media viewer overlay */}
      {expanded && (
        <MediaResultOverlay
          result={expanded.result}
          outputType={expanded.outputType}
          structured={expanded.structured}
          onClose={() => setExpanded(null)}
        />
      )}

      {/* State Bar */}
      <NodeStatusBar status={node.status} stale={node.stale} />

      {/* Input handles */}
      {node.input_ports.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="target"
          position={Position.Left}
          style={{
            top: `${18 + i * 20}px`,
            background: PORT_COLORS[port.port_type] ?? PORT_COLORS.any,
          }}
          title={`${port.name} (${port.port_type})`}
        />
      ))}

      {/* Output handles */}
      {node.output_ports.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{
            top: `${18 + i * 20}px`,
            background: PORT_COLORS[port.port_type] ?? PORT_COLORS.any,
          }}
          className="handle-diamond"
          title={`${port.name} (${port.port_type})`}
        />
      ))}
    </div>
  );
}
