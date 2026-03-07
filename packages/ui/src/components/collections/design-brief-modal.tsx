"use client";

import { useEffect, useState } from "react";
import { Copy, Check, X } from "lucide-react";

interface DesignBriefModalProps {
  open: boolean;
  onClose: () => void;
  brief: string | null;
  isLoading: boolean;
  collectionName: string;
}

export function DesignBriefModal({
  open,
  onClose,
  brief,
  isLoading,
  collectionName,
}: DesignBriefModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!open) return null;

  function handleCopy() {
    if (!brief) return;
    navigator.clipboard.writeText(brief);
    setCopied(true);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-xl w-[720px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-ink">Design Brief</h2>
            <p className="text-[12px] text-ink-whisper mt-0.5">{collectionName}</p>
          </div>
          <div className="flex items-center gap-1">
            {brief && (
              <button
                onClick={handleCopy}
                className="w-8 h-8 flex items-center justify-center rounded-md text-ink-quiet hover:text-ink hover:bg-black/[0.05] transition-colors duration-150 cursor-pointer"
                aria-label="Copy brief"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-ink-quiet hover:text-ink hover:bg-black/[0.05] transition-colors duration-150 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-ink-whisper border-t-ink rounded-full animate-spin" />
              <p className="text-sm text-ink-quiet">Analyzing screenshots...</p>
              <p className="text-[12px] text-ink-whisper">This may take a moment</p>
            </div>
          ) : brief ? (
            <pre className="text-[13px] leading-relaxed text-ink whitespace-pre-wrap font-sans">
              {brief}
            </pre>
          ) : (
            <p className="text-sm text-ink-quiet text-center py-16">
              No brief generated yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
