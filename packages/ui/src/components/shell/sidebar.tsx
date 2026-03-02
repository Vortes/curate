"use client"

import { useState } from "react"
import { LayoutGrid, Settings, LogOut, Loader2, Plus } from "lucide-react"
import { cn } from "../../lib/utils"
import { NewCollectionModal } from "../collections/new-collection-modal"

interface CollectionItem {
	id: string
	name: string
	color: string
	captureCount: number
	href: string
}

interface SidebarProps {
	activePath?: string
	className?: string
	collections?: CollectionItem[]
	isLoadingCollections?: boolean
	onCreateCollection?: (name: string) => Promise<void>
	createError?: string | null
	platform?: "web" | "desktop"
	onSignOut?: () => void | Promise<void>
	isSigningOut?: boolean
	/** When provided, nav/collection clicks call this instead of native anchor navigation (used by Electron) */
	onNavClick?: (href: string) => void
}

const navItems = [
	{ label: "Library", icon: LayoutGrid, href: "/library", count: 247 },
] as const

export function Sidebar({
	activePath = "/",
	className,
	collections = [],
	isLoadingCollections = false,
	onCreateCollection,
	createError,
	platform = "web",
	onSignOut,
	isSigningOut = false,
	onNavClick,
}: SidebarProps) {
	const isDesktop = platform === "desktop"
	const [isNewModalOpen, setIsNewModalOpen] = useState(false)

	return (
		<aside
			className={cn(
				"w-[220px] min-w-[220px] bg-surface flex flex-col pb-6 relative",
				isDesktop ? "pt-0" : "py-6",
				className,
			)}
		>
			{/* Right edge sculpted border */}
			<div className="absolute right-0 top-0 bottom-0 w-px bg-transparent shadow-sculpted-v" />

			{/* macOS traffic light clearance + drag region (desktop only) */}
			{isDesktop && <div className="h-[52px] shrink-0 drag-region" />}

			{/* Brand area */}
			<div className="px-6 mb-8 flex items-center gap-2">
				<div className="w-1.5 h-1.5 rounded-full bg-orange shrink-0" />
				<span className="font-mono text-[13px] font-normal tracking-[0.06em] text-ink">
					curate
				</span>
			</div>

			{/* Nav section */}
			<nav>
				{navItems.map((item) => {
					const isActive = activePath === item.href
					return (
						<a
							key={item.href}
							href={onNavClick ? undefined : item.href}
							onClick={
								onNavClick
									? (e) => {
											e.preventDefault()
											onNavClick(item.href)
										}
									: undefined
							}
							className={cn(
								"flex items-center gap-2.5 px-6 py-2 text-[13.5px] font-normal cursor-pointer transition-all duration-200 relative",
								isActive
									? "text-ink"
									: "text-ink-quiet hover:text-ink-mid hover:bg-black/[0.02]",
							)}
						>
							{isActive && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange rounded-r" />
							)}
							<item.icon
								className={cn(
									"w-4 h-4 shrink-0",
									isActive ? "opacity-80" : "opacity-50",
								)}
							/>
							{item.label}
							<span className="ml-auto font-mono text-[11px] text-ink-whisper font-light">
								{item.count}
							</span>
						</a>
					)
				})}
			</nav>

			{/* Sculpted divider */}
			<div className="h-px mx-6 my-3 bg-transparent shadow-sculpted-h" />

			{/* Collections section */}
			<div className="flex-1 overflow-y-auto">
				<div className="flex items-center justify-between px-6 mb-2">
					<div className="font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-ink-whisper">
						Collections
					</div>
					{onCreateCollection && (
						<button
							onClick={() => setIsNewModalOpen(true)}
							className="text-ink-quiet text-[10px] hover:text-ink flex items-center gap-1 font-medium transition-colors cursor-pointer"
						>
							<Plus className="w-3 h-3" />
							New
						</button>
					)}
				</div>

				{isLoadingCollections ? (
					// Skeleton rows
					<div className="flex flex-col gap-1 px-6">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="h-9 rounded animate-pulse bg-black/[0.04]"
							/>
						))}
					</div>
				) : collections.length === 0 ? (
					<div className="px-6 py-1.5 text-ink-whisper text-[12px]">
						No collections
					</div>
				) : (
					collections.map((item) => {
						const isActive = activePath === item.href
						return (
							<a
								key={item.id}
								href={onNavClick ? undefined : item.href}
								onClick={
									onNavClick
										? (e) => {
												e.preventDefault()
												onNavClick(item.href)
											}
										: undefined
								}
								title={item.name}
								className={cn(
									"flex items-center gap-2.5 px-6 py-2 text-[13.5px] font-normal cursor-pointer transition-all duration-200 relative",
									isActive
										? "text-ink"
										: "text-ink-quiet hover:text-ink-mid hover:bg-black/[0.02]",
								)}
							>
								{isActive && (
									<span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange rounded-r" />
								)}
								<span
									className="w-2 h-2 rounded-full shrink-0"
									style={{ background: item.color }}
								/>
								<span className="truncate">{item.name}</span>
								<span className="ml-auto font-mono text-[11px] text-ink-whisper font-light shrink-0">
									{item.captureCount}
								</span>
							</a>
						)
					})
				)}

				{/* New Collection Modal */}
				{onCreateCollection && (
					<NewCollectionModal
						open={isNewModalOpen}
						onClose={() => setIsNewModalOpen(false)}
						onCreate={async (name) => {
							try {
								await onCreateCollection(name)
								setIsNewModalOpen(false)
							} catch {
								// Keep open on error
							}
						}}
					/>
				)}
			</div>

			{/* Footer */}
			<div className="px-6 py-4 mt-auto border-t border-edge">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2.5 py-1.5 text-ink-quiet text-[13px] cursor-pointer transition-all duration-200 hover:text-ink-mid">
						<Settings className="w-[15px] h-[15px] opacity-40" />
						Settings
					</div>
					{onSignOut && (
						<button
							onClick={onSignOut}
							disabled={isSigningOut}
							className={cn(
								"flex items-center gap-1.5 py-1.5 px-1 text-ink-quiet text-[13px] transition-all duration-200 hover:text-ink-mid",
								isSigningOut && "opacity-40 cursor-not-allowed",
							)}
						>
							{isSigningOut ? (
								<Loader2 className="w-[15px] h-[15px] animate-spin" />
							) : (
								<LogOut className="w-[15px] h-[15px] opacity-40" />
							)}
						</button>
					)}
				</div>
			</div>
		</aside>
	)
}
