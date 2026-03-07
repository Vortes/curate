"use client";

import { useEffect, useRef, useState } from "react";

interface EditCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  description: string;
  onSave: (data: { name: string; description: string }) => void;
}

export function EditCollectionDialog({
  open,
  onClose,
  name,
  description,
  onSave,
}: EditCollectionDialogProps) {
  const [localName, setLocalName] = useState(name);
  const [localDescription, setLocalDescription] = useState(description);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when the dialog opens with fresh values
  useEffect(() => {
    if (open) {
      setLocalName(name);
      setLocalDescription(description);
      // Focus the name input after mount
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [open, name, description]);

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

  function handleSave() {
    if (!localName.trim()) return;
    onSave({ name: localName.trim(), description: localDescription.trim() });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        // Close when clicking the overlay (not the dialog)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-xl p-6 w-[400px] max-w-[90vw]">
        <h2 className="text-lg font-semibold text-ink mb-4">Edit Collection</h2>

        {/* Name field */}
        <div>
          <label className="block text-[12px] text-ink-quiet mb-1">Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="w-full border border-edge rounded-lg px-3 py-2 text-[14px] bg-surface text-ink outline-none focus:border-ink-quiet transition-colors duration-150"
          />
        </div>

        {/* Description field */}
        <div className="mt-3">
          <label className="block text-[12px] text-ink-quiet mb-1">Description</label>
          <textarea
            rows={3}
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            className="w-full border border-edge rounded-lg px-3 py-2 text-[14px] bg-surface text-ink outline-none focus:border-ink-quiet transition-colors duration-150 resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-ink-quiet hover:text-ink rounded-lg transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!localName.trim()}
            className="px-3 py-1.5 text-[13px] bg-ink text-surface rounded-lg hover:bg-ink/90 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
