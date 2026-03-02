"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CollectionForOrganize {
  id: string;
  name: string;
  color: string;
  captureCount: number;
  /** Which of the selectedCaptureIds are already in this collection */
  containedCaptureIds: string[];
}

interface OrganizeModalProps {
  open: boolean;
  onClose: () => void;
  selectedCaptureIds: string[];
  collections: CollectionForOrganize[];
  onAddToCollection: (collectionId: string, captureIds: string[]) => void;
  onRemoveFromCollection: (collectionId: string, captureIds: string[]) => void;
  onCreateCollection: (name: string) => Promise<void>;
  isCreating?: boolean;
}

type ToggleState = "none" | "some" | "all";

function getToggleState(
  selectedCaptureIds: string[],
  containedCaptureIds: string[],
): ToggleState {
  if (selectedCaptureIds.length === 0) return "none";
  const containedSet = new Set(containedCaptureIds);
  const matchCount = selectedCaptureIds.filter((id) => containedSet.has(id)).length;
  if (matchCount === 0) return "none";
  if (matchCount === selectedCaptureIds.length) return "all";
  return "some";
}

export function OrganizeModal({
  open,
  onClose,
  selectedCaptureIds,
  collections,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  isCreating = false,
}: OrganizeModalProps) {
  const [search, setSearch] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearch("");
      setShowNewInput(false);
      setNewName("");
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  // Focus new-collection input when it appears
  useEffect(() => {
    if (showNewInput) {
      setTimeout(() => newInputRef.current?.focus(), 0);
    }
  }, [showNewInput]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showNewInput) {
          setShowNewInput(false);
          setNewName("");
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showNewInput]);

  if (!open) return null;

  const filteredCollections = search.trim()
    ? collections.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : collections;

  async function handleCreateCollection() {
    const name = newName.trim();
    if (!name) return;
    await onCreateCollection(name);
    setShowNewInput(false);
    setNewName("");
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface rounded-xl w-[380px] max-w-[90vw] max-h-[500px] flex flex-col"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
      >
        {/* Search input */}
        <div className="px-4 pt-4 pb-2">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border border-edge rounded-lg px-3 py-2 text-[14px] bg-surface text-ink placeholder:text-ink-whisper outline-none focus:border-ink-quiet transition-colors duration-150"
          />
        </div>

        {/* Collections list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
          {/* Section header */}
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-whisper px-2 py-1">
            Collections
          </p>

          {/* Collection rows */}
          {filteredCollections.map((collection) => {
            const state = getToggleState(selectedCaptureIds, collection.containedCaptureIds);
            const missingCaptureIds = selectedCaptureIds.filter(
              (id) => !collection.containedCaptureIds.includes(id),
            );

            function handleToggle() {
              if (state === "none") {
                onAddToCollection(collection.id, selectedCaptureIds);
              } else if (state === "some") {
                onAddToCollection(collection.id, missingCaptureIds);
              } else {
                onRemoveFromCollection(collection.id, selectedCaptureIds);
              }
            }

            return (
              <div
                key={collection.id}
                onClick={handleToggle}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.03] cursor-pointer"
              >
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: collection.color }}
                />

                {/* Name + count */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-ink truncate">{collection.name}</p>
                  <p className="text-[11px] text-ink-quiet">
                    {collection.captureCount} capture{collection.captureCount === 1 ? "" : "s"}
                  </p>
                </div>

                {/* Three-state toggle */}
                <div
                  className={cn(
                    "w-6 h-6 flex items-center justify-center shrink-0",
                    state === "none" && "border border-edge rounded-full",
                    state === "some" && "border border-ink-quiet rounded-full",
                    state === "all" && "bg-blue-500/10 rounded-full",
                  )}
                >
                  {state === "none" && <Plus className="w-4 h-4 text-ink-quiet" />}
                  {state === "some" && <Minus className="w-4 h-4 text-ink-mid" />}
                  {state === "all" && <Check className="w-4 h-4 text-blue-500" />}
                </div>
              </div>
            );
          })}

          {/* New Collection row */}
          {showNewInput ? (
            <div className="flex items-center gap-3 px-2 py-2">
              {/* Dashed circle placeholder to align with rows above */}
              <span className="w-2.5 h-2.5 shrink-0" />
              <input
                ref={newInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateCollection();
                  if (e.key === "Escape") {
                    setShowNewInput(false);
                    setNewName("");
                  }
                }}
                className="flex-1 border border-edge rounded-lg px-3 py-1.5 text-[14px] bg-surface text-ink placeholder:text-ink-whisper outline-none focus:border-ink-quiet transition-colors duration-150"
              />
              {isCreating && (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-ink-whisper border-t-ink-quiet shrink-0" />
              )}
            </div>
          ) : (
            <div
              onClick={() => setShowNewInput(true)}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.03] cursor-pointer"
            >
              {/* Dashed circle */}
              <div className="w-2.5 h-2.5 rounded-full border border-dashed border-ink-quiet shrink-0" />
              <p className="text-[14px] text-ink-mid">New Collection</p>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={onClose}
            className="w-full bg-ink text-surface rounded-lg py-2.5 text-[14px] font-medium hover:bg-ink/90 transition-colors cursor-pointer border-0"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
