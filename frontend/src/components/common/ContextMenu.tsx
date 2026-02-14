import type { ReactNode } from 'react';

interface ContextMenuProps {
  isOpen: boolean;
  children: ReactNode;
}

export function ContextMenu({ isOpen, children }: ContextMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-10 right-2 w-[140px] z-50
        bg-zinc-900/95 backdrop-blur-md border border-white/[0.08]
        rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        py-1 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

interface ContextMenuItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export function ContextMenuItem({ icon, label, onClick, variant = 'default' }: ContextMenuItemProps) {
  const colorClasses = variant === 'danger'
    ? 'text-red-400 hover:bg-red-500/10'
    : 'text-zinc-300 hover:bg-white/[0.06]';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] transition-colors ${colorClasses}`}
    >
      {icon} {label}
    </button>
  );
}

export function ContextMenuDivider() {
  return <div className="border-t border-white/[0.06] my-1" />;
}
