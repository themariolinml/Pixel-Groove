import type { RefObject } from 'react';

interface PromptEditorProps {
  prompt: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isRunning: boolean;
  isViolet: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export function PromptEditor({
  prompt,
  onChange,
  onBlur,
  onKeyDown,
  isRunning,
  isViolet,
  textareaRef,
}: PromptEditorProps) {
  return (
    <div>
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder="Enter a prompt..."
        disabled={isRunning}
        rows={3}
        className={`w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-zinc-200 placeholder-zinc-600 outline-none resize-y min-h-[80px] max-h-[240px] disabled:opacity-40 ${
          isViolet ? 'focus:border-violet-500/40' : 'focus:border-cyan-500/40'
        }`}
      />
    </div>
  );
}
