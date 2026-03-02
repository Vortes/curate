"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

interface CollectionHeaderProps {
  name: string;
  description?: string | null;
  captureCount: number;
  onEdit: () => void;
  onOrganize: () => void;
  onDelete: () => void;
}

export function CollectionHeader({
  name,
  captureCount,
  onEdit,
  onOrganize,
  onDelete,
}: CollectionHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="mb-6">
      {/* Top row: name + ellipsis */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink truncate">{name}</h1>

        {/* Ellipsis button + dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-ink-quiet hover:text-ink hover:bg-black/[0.05] transition-colors duration-150 cursor-pointer"
            aria-label="Collection options"
            aria-expanded={dropdownOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-edge rounded-lg shadow-lg py-1 min-w-[160px]">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onEdit();
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-ink cursor-pointer hover:bg-black/[0.03] transition-colors duration-100"
              >
                Edit details
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOrganize();
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-ink cursor-pointer hover:bg-black/[0.03] transition-colors duration-100"
              >
                Organize
              </button>
              <div className="my-1 border-t border-edge" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onDelete();
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-red-500 cursor-pointer hover:bg-black/[0.03] transition-colors duration-100"
              >
                Delete collection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Capture count */}
      <p className="font-mono text-[11px] font-light tracking-[0.06em] text-ink-whisper mt-1">
        {captureCount} {captureCount === 1 ? "capture" : "captures"}
      </p>
    </div>
  );
}
