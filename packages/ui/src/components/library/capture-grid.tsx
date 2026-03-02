"use client";

import { ImageIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CaptureCard, type CaptureCardData } from "./capture-card";
import { SortableCaptureCard } from "./sortable-capture-card";

export interface CaptureGroup {
  label: string;
  captures: CaptureCardData[];
}

interface CaptureGridProps {
  groups: CaptureGroup[];
  onDelete?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onCardClick?: (capture: CaptureCardData) => void;
  deletingId?: string | null;
  // Organize mode props
  isOrganizing?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}

export function CaptureGrid({
  groups,
  onDelete,
  onBookmark,
  onCardClick,
  deletingId,
  isOrganizing,
  selectedIds,
  onSelect,
  onReorder,
}: CaptureGridProps) {
  const totalCaptures = groups.reduce((sum, g) => sum + g.captures.length, 0);

  // Flatten all captures for DnD — in organize mode there's typically one group,
  // but we handle multiple gracefully by concatenating.
  const flatCaptures = groups.flatMap((g) => g.captures);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px of movement before activating drag, so click-to-select still works.
        distance: 8,
      },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = flatCaptures.findIndex((c) => c.id === active.id);
    const newIndex = flatCaptures.findIndex((c) => c.id === over.id);

    const reordered = arrayMove(flatCaptures, oldIndex, newIndex);
    onReorder?.(reordered.map((c) => c.id));
  }

  if (totalCaptures === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-quiet">
        <ImageIcon className="h-10 w-10" />
        <p className="text-sm">No captures yet</p>
      </div>
    );
  }

  // Organize mode: flat DnD-enabled grid (no group labels, single sortable context)
  if (isOrganizing) {
    const captureIds = flatCaptures.map((c) => c.id);
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={captureIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {flatCaptures.map((capture, cardIndex) => (
              <SortableCaptureCard
                key={capture.id}
                capture={capture}
                isOrganizing={true}
                isSelected={selectedIds?.has(capture.id)}
                onSelect={onSelect}
                onDelete={onDelete}
                onBookmark={onBookmark}
                onClick={onCardClick}
                isDeleting={deletingId === capture.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${cardIndex * 40}ms` }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // Normal mode: grouped grid, no DnD
  return (
    <div>
      {groups.map((group, groupIndex) => (
        <div key={group.label} className="mb-8">
          <div className="font-mono text-[11px] font-light tracking-[0.06em] text-ink-whisper mb-3.5">
            {group.label}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {group.captures.map((capture, cardIndex) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                onDelete={onDelete}
                onBookmark={onBookmark}
                onClick={onCardClick}
                isDeleting={deletingId === capture.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${cardIndex * 40 + groupIndex * 200}ms` }}
                isOrganizing={false}
                isSelected={selectedIds?.has(capture.id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
