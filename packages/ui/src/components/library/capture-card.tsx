"use client";

import { Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CaptureCardData {
  id: string;
  imageUrl: string;
  createdAt: Date | string;
  tags: unknown;
}

interface CaptureCardProps {
  capture: CaptureCardData;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function CaptureCard({ capture, onDelete, isDeleting }: CaptureCardProps) {
  const date = new Date(capture.createdAt);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-opacity",
        isDeleting && "pointer-events-none opacity-40",
      )}
    >
      <div className="aspect-video overflow-hidden bg-muted">
        <img
          src={capture.imageUrl}
          alt="UI capture"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(capture.id)}
          className="absolute right-2 top-2 rounded-md bg-background/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Delete capture"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
