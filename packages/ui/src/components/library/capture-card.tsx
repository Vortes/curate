"use client"

import { Bookmark, MoreHorizontal, Activity } from "lucide-react"
import { cn } from "../../lib/utils"

export interface CaptureCardData {
	id: string
	imageUrl: string
	createdAt: Date | string
	analyzedAt?: Date | string | null
	tags?: string[]
	sourceApp?: string | null
	sourceUrl?: string | null
	description?: string | null
}

interface CaptureCardProps {
	capture: CaptureCardData
	variant?: "default" | "dark" | "flow"
	flowSteps?: number
	onDelete?: (id: string) => void
	onBookmark?: (id: string) => void
	onClick?: (capture: CaptureCardData) => void
	isDeleting?: boolean
	className?: string
	style?: React.CSSProperties
}

export function CaptureCard({
	capture,
	variant = "default",
	flowSteps,
	onDelete,
	onBookmark,
	onClick,
	isDeleting,
	className,
	style,
}: CaptureCardProps) {
	return (
		<div
			onClick={() => onClick?.(capture)}
			className={cn(
				"group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-250",
				"bg-surface-cool shadow-card-flow hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.07),inset_0_0_0_1px_rgba(0,0,0,0.04),0_1px_0_rgba(255,255,255,0.5)]",
				isDeleting && "pointer-events-none opacity-40",
				className,
			)}
			style={style}
		>
			{/* Image area inset within card padding */}
			<div className="p-2.5">
				<div className="relative w-full aspect-4/3 overflow-hidden rounded-lg transition-transform duration-250 group-hover:scale-[0.98]">
					<img
						src={capture.imageUrl}
						alt="UI capture"
						className="h-full w-full object-contain"
					/>

					{/* Flow badge */}
					{variant === "flow" && flowSteps && (
						<div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-ink/75 backdrop-blur-sm rounded-[5px] font-mono text-[10px] font-normal text-dark-text tracking-[0.04em]">
							<Activity className="w-2.5 h-2.5" />
							{flowSteps} steps
						</div>
					)}

					{/* sourceApp badge — shown on hover, hidden when flow badge is present */}
					{capture.sourceApp && !(variant === "flow" && flowSteps) && (
						<div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-ink/75 backdrop-blur-sm rounded-[5px] font-mono text-[10px] font-normal text-dark-text tracking-[0.04em] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							{capture.sourceApp}
						</div>
					)}

					{/* Hover action buttons */}
					<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
						{onBookmark && (
							<button
								onClick={(e) => {
									e.stopPropagation()
									onBookmark(capture.id)
								}}
								className="w-7 h-7 rounded-md border-0 bg-white/90 backdrop-blur-sm flex items-center justify-center cursor-pointer text-ink-mid transition-all duration-200 hover:bg-white hover:text-ink"
								aria-label="Bookmark capture"
							>
								<Bookmark className="w-[13px] h-[13px]" />
							</button>
						)}
						<button
							onClick={(e) => {
								e.stopPropagation()
								onDelete?.(capture.id)
							}}
							className="w-7 h-7 rounded-md border-0 bg-white/90 backdrop-blur-sm flex items-center justify-center cursor-pointer text-ink-mid transition-all duration-200 hover:bg-white hover:text-ink"
							aria-label="More actions"
						>
							<MoreHorizontal className="w-[13px] h-[13px]" />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
