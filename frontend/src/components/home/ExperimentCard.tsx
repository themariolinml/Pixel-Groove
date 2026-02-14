import { MoreHorizontal, Trash2, FlaskConical, Beaker } from 'lucide-react';
import { useContextMenu } from '../../hooks/useContextMenu';
import { ContextMenu, ContextMenuItem } from '../common/ContextMenu';
import { timeAgo } from '../../utils/format';
import type { Experiment } from '../../types/experiment';

interface ExperimentCardProps {
  experiment: Experiment;
  onOpen: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<Experiment['status'], { label: string; color: string; bgColor: string }> = {
  brief: { label: 'Brief', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
  genome: { label: 'Genome', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  built: { label: 'Built', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  reviewed: { label: 'Reviewed', color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
  executed: { label: 'Executed', color: 'text-green-400', bgColor: 'bg-green-500/10' },
};

export function ExperimentCard({ experiment, onOpen, onDelete }: ExperimentCardProps) {
  const { isOpen: menuOpen, setIsOpen: setMenuOpen } = useContextMenu();

  const statusConfig = STATUS_CONFIG[experiment.status];

  return (
    <div
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer
        bg-white/[0.03] border border-white/[0.08]
        hover:border-white/[0.15] hover:bg-white/[0.05]
        shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-200"
      onClick={onOpen}
    >
      {/* Preview area */}
      <div className="h-[140px] bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-cyan-950/40 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          {experiment.hooks.length > 0 ? (
            <Beaker size={24} className="text-emerald-400/70" />
          ) : (
            <FlaskConical size={24} className="text-emerald-400/70" />
          )}
        </div>
        <div className={`px-2.5 py-1 rounded-full ${statusConfig.bgColor} border border-white/[0.06]`}>
          <span className={`text-[10px] font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>
      </div>

      {/* Info */}
      <div className="px-3.5 py-3 space-y-1">
        <h3 className="text-[13px] font-medium text-zinc-200 truncate">{experiment.name}</h3>
        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{experiment.brief}</p>
        <p className="text-[10px] text-zinc-600">
          {experiment.hooks.length} hook{experiment.hooks.length !== 1 ? 's' : ''}
          {' · '}
          {timeAgo(experiment.updated_at)}
        </p>
      </div>

      {/* Context menu trigger */}
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm
          flex items-center justify-center
          text-zinc-500 hover:text-zinc-200
          opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>

      <ContextMenu isOpen={menuOpen}>
        <ContextMenuItem
          icon={<Trash2 size={12} />}
          label="Delete"
          onClick={() => { onDelete(); setMenuOpen(false); }}
          variant="danger"
        />
      </ContextMenu>
    </div>
  );
}
