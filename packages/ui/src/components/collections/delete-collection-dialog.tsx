"use client";

import { useEffect } from "react";

interface DeleteCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  collectionName: string;
  onConfirm: () => void;
}

export function DeleteCollectionDialog({
  open,
  onClose,
  collectionName,
  onConfirm,
}: DeleteCollectionDialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-xl p-6 w-[360px] max-w-[90vw]">
        <h2 className="text-lg font-semibold text-ink mb-2">Delete collection</h2>
        <p className="text-[14px] text-ink-mid mb-4">
          Are you sure you want to delete &ldquo;{collectionName}&rdquo;? Captures in this
          collection will not be deleted.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-ink-quiet hover:text-ink rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-[13px] bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
