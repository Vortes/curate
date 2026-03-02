"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CaptureCard, type CaptureCardData } from "./capture-card"

interface SortableCaptureCardProps {
  capture: CaptureCardData
  isOrganizing?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onDelete?: (id: string) => void
  onBookmark?: (id: string) => void
  onClick?: (capture: CaptureCardData) => void
  isDeleting?: boolean
  className?: string
  style?: React.CSSProperties
}

export function SortableCaptureCard({ capture, style, ...props }: SortableCaptureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: capture.id })

  const dragStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={dragStyle} {...attributes}>
      <CaptureCard
        capture={capture}
        {...props}
        dragListeners={listeners}
      />
    </div>
  )
}
