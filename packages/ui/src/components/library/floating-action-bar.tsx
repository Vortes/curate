"use client"

import { ArrowUpRight, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"

interface FloatingActionBarProps {
  selectedCount: number
  onOrganize: () => void
  onRemove: () => void
  onDone: () => void
  removeLabel?: string
  isDestructiveRemove?: boolean
}

export function FloatingActionBar({
  selectedCount,
  onOrganize,
  onRemove,
  onDone,
  removeLabel = "Remove",
  isDestructiveRemove = false,
}: FloatingActionBarProps) {
  const hasSelection = selectedCount > 0

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fab-in"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="bg-ink text-paper rounded-full px-5 py-2.5 flex items-center gap-4 shadow-lg">
        {/* Selection count */}
        <span className="text-[13px] font-medium min-w-[80px] whitespace-nowrap">
          {selectedCount} Selected
        </span>

        {/* Divider */}
        <span className="w-px h-4 bg-paper/20 shrink-0" />

        {/* Organize button */}
        <button
          onClick={onOrganize}
          disabled={!hasSelection}
          className={cn(
            "flex items-center gap-1.5 text-[13px] cursor-pointer transition-opacity duration-150 border-0 bg-transparent text-paper",
            hasSelection ? "opacity-70 hover:opacity-100" : "opacity-30 pointer-events-none",
          )}
          aria-label="Add to collection"
        >
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          Organize
        </button>

        {/* Remove / Delete button */}
        <button
          onClick={onRemove}
          disabled={!hasSelection}
          className={cn(
            "flex items-center gap-1.5 text-[13px] cursor-pointer transition-opacity duration-150 border-0 bg-transparent",
            hasSelection ? "opacity-70 hover:opacity-100" : "opacity-30 pointer-events-none",
            isDestructiveRemove ? "text-red-400" : "text-paper",
          )}
          aria-label={removeLabel}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          {removeLabel}
        </button>

        {/* Divider */}
        <span className="w-px h-4 bg-paper/20 shrink-0" />

        {/* Done button */}
        <button
          onClick={onDone}
          className="bg-paper text-ink rounded-full px-4 py-1.5 text-[13px] font-medium cursor-pointer hover:bg-white/90 transition-colors duration-150 border-0"
          aria-label="Exit organize mode"
        >
          Done
        </button>
      </div>
    </div>
  )
}
