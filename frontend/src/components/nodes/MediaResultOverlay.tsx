import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download, Music } from 'lucide-react';
import type { MediaResult } from '../../types/graph';
import { formatBytes, formatDuration } from '../../utils/format';
import { API_URL } from '../../api/client';

const MEDIA_LABELS: Record<string, string> = {
  text: 'Text Output',
  image: 'Image Output',
  video: 'Video Output',
  audio: 'Audio Output',
};

interface MediaResultOverlayProps {
  result: MediaResult;
  outputType: string;
  structured: boolean;
  onClose: () => void;
}

export function MediaResultOverlay({ result, outputType, structured, onClose }: MediaResultOverlayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.urls.original);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (outputType === 'text') {
      const ext = structured ? 'json' : 'txt';
      const blob = new Blob([result.urls.original], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const mediaUrl = `${API_URL}${result.urls.original}`;
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = '';
    a.target = '_blank';
    a.click();
  };

  // Widths per type
  const widthClass = outputType === 'video' ? 'w-[720px]' :
    outputType === 'image' ? 'w-[720px]' :
    outputType === 'audio' ? 'w-[480px]' : 'w-[560px]';

  // Parse structured text
  let parsedStructured: Record<string, unknown> | null = null;
  if (outputType === 'text' && structured) {
    try { parsedStructured = JSON.parse(result.urls.original); } catch { /* ignore */ }
  }

  const meta = result.metadata;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative ${widthClass} max-w-[90vw] max-h-[85vh] flex flex-col
          bg-[rgb(18,18,18)] border border-white/[0.08] rounded-2xl
          shadow-[0_16px_64px_rgba(0,0,0,0.6)] overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <span className="text-[13px] font-medium text-zinc-200">
            {MEDIA_LABELS[outputType] ?? 'Output'}
          </span>
          <div className="flex items-center gap-1">
            {outputType === 'text' && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            >
              <Download size={12} />
              Download
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* TEXT */}
          {outputType === 'text' && (
            <div className="p-5">
              {parsedStructured ? (
                <div className="space-y-3">
                  {Object.entries(parsedStructured).map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <span className="text-[11px] font-medium text-zinc-500">{key}</span>
                      <p className="text-[13px] text-zinc-200 whitespace-pre-wrap">
                        {Array.isArray(val) ? val.join(', ') : String(val)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {result.urls.original}
                </p>
              )}
            </div>
          )}

          {/* IMAGE */}
          {outputType === 'image' && (
            <div className="flex items-center justify-center bg-black/40 p-4">
              <img
                src={`${API_URL}${result.urls.original}`}
                alt="Generated image"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* VIDEO */}
          {outputType === 'video' && (
            <div className="bg-black/40 p-4">
              <video
                src={`${API_URL}${result.urls.original}`}
                controls
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          )}

          {/* AUDIO */}
          {outputType === 'audio' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-center h-28 bg-black/20 rounded-lg">
                <Music size={40} className="text-zinc-700" />
              </div>
              <audio
                src={`${API_URL}${result.urls.original}`}
                controls
                autoPlay
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Metadata footer */}
        {(meta.width || meta.duration || meta.format || meta.size_bytes) && (
          <div className="px-5 py-2.5 border-t border-white/[0.06] flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
            {meta.width && meta.height && <span>{meta.width} x {meta.height}</span>}
            {meta.duration != null && <span>{formatDuration(meta.duration)}</span>}
            {meta.format && <span>{meta.format.toUpperCase()}</span>}
            {meta.size_bytes != null && <span>{formatBytes(meta.size_bytes)}</span>}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
