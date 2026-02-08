interface NodeStatusBarProps {
  status: string;
  stale: boolean;
}

export function NodeStatusBar({ status, stale }: NodeStatusBarProps) {
  const isRunning = status === 'running' || status === 'queued';
  const isStale = stale && (status === 'completed' || status === 'idle');
  const isCompleted = !stale && status === 'completed';
  const isFailed = status === 'failed';
  const showBar = isRunning || isStale || isCompleted || isFailed;

  if (!showBar) return null;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-b-xl border-t border-white/[0.06] ${
      isRunning ? 'bg-yellow-500/5'
      : isStale ? 'bg-amber-500/5'
      : isCompleted ? 'bg-green-500/5'
      : 'bg-red-500/5'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isRunning ? 'bg-yellow-400 animate-pulse'
        : isStale ? 'bg-amber-400'
        : isCompleted ? 'bg-green-400'
        : 'bg-red-400'
      }`} />
      <span className={`text-[9px] font-medium uppercase truncate ${
        isRunning ? 'text-yellow-400'
        : isStale ? 'text-amber-400'
        : isCompleted ? 'text-green-400'
        : 'text-red-400'
      }`}>
        {isRunning ? status : isStale ? 'stale' : isCompleted ? 'completed' : 'failed'}
      </span>
    </div>
  );
}
