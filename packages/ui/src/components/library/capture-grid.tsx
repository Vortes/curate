"use client";

import { ImageIcon } from "lucide-react";
import { CaptureCard, type CaptureCardData } from "./capture-card";

interface CaptureGridProps {
  captures: CaptureCardData[];
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}

export function CaptureGrid({ captures, onDelete, deletingId }: CaptureGridProps) {
  if (captures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <ImageIcon className="h-10 w-10" />
        <p className="text-sm">No captures yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {captures.map((capture) => (
        <CaptureCard
          key={capture.id}
          capture={capture}
          onDelete={onDelete}
          isDeleting={deletingId === capture.id}
        />
      ))}
    </div>
  );
}
