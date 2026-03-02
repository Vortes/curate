"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Minus, Plus } from "lucide-react"
import { cn } from "../../lib/utils"
import { NewCollectionModal } from "./new-collection-modal"

export interface CollectionForOrganize {
	id: string
	name: string
	color: string
	captureCount: number
	/** Which of the selectedCaptureIds are already in this collection */
	containedCaptureIds: string[]
}

interface OrganizeModalProps {
	open: boolean
	onClose: () => void
	selectedCaptureIds: string[]
	collections: CollectionForOrganize[]
	onAddToCollection: (collectionId: string, captureIds: string[]) => void
	onRemoveFromCollection: (collectionId: string, captureIds: string[]) => void
	onCreateCollection: (name: string) => Promise<void>
	isCreating?: boolean
}

type ToggleState = "none" | "some" | "all"

function getToggleState(
	selectedCaptureIds: string[],
	containedCaptureIds: string[],
): ToggleState {
	if (selectedCaptureIds.length === 0) return "none"
	const containedSet = new Set(containedCaptureIds)
	const matchCount = selectedCaptureIds.filter((id) =>
		containedSet.has(id),
	).length
	if (matchCount === 0) return "none"
	if (matchCount === selectedCaptureIds.length) return "all"
	return "some"
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
	const [search, setSearch] = useState("")
	const searchRef = useRef<HTMLInputElement>(null)
	const [isNewModalOpen, setIsNewModalOpen] = useState(false)

	// Reset state when modal opens/closes
	useEffect(() => {
		if (open) {
			setSearch("")
			setTimeout(() => searchRef.current?.focus(), 0)
		}
	}, [open])

	// Close on Escape
	useEffect(() => {
		if (!open) return
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape" && !isNewModalOpen) {
				onClose()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [open, onClose, isNewModalOpen])

	if (!open) return null

	const filteredCollections = search.trim()
		? collections.filter((c) =>
				c.name.toLowerCase().includes(search.trim().toLowerCase()),
			)
		: collections

	async function handleCreateCollection(name: string) {
		if (!name.trim()) return
		await onCreateCollection(name)
		setIsNewModalOpen(false)
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose()
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
					<div className="flex items-center justify-between px-2 py-1">
						<p className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-whisper">
							Collections
						</p>
						<button
							onClick={() => setIsNewModalOpen(true)}
							className="text-ink-quiet text-[10px] hover:text-ink flex items-center gap-1 font-medium transition-colors cursor-pointer border-0 bg-transparent"
						>
							<Plus className="w-3 h-3" />
							New
						</button>
					</div>

					{/* Collection rows */}
					{filteredCollections.map((collection) => {
						const state = getToggleState(
							selectedCaptureIds,
							collection.containedCaptureIds,
						)
						const missingCaptureIds = selectedCaptureIds.filter(
							(id) => !collection.containedCaptureIds.includes(id),
						)

						function handleToggle() {
							if (state === "none") {
								onAddToCollection(collection.id, selectedCaptureIds)
							} else if (state === "some") {
								onAddToCollection(collection.id, missingCaptureIds)
							} else {
								onRemoveFromCollection(collection.id, selectedCaptureIds)
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
									<p className="text-[14px] text-ink truncate">
										{collection.name}
									</p>
									<p className="text-[11px] text-ink-quiet">
										{collection.captureCount} capture
										{collection.captureCount === 1 ? "" : "s"}
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
									{state === "none" && (
										<Plus className="w-4 h-4 text-ink-quiet" />
									)}
									{state === "some" && (
										<Minus className="w-4 h-4 text-ink-mid" />
									)}
									{state === "all" && (
										<Check className="w-4 h-4 text-blue-500" />
									)}
								</div>
							</div>
						)
					})}

					{filteredCollections.length === 0 && search.trim() !== "" && (
						<div
							onClick={() => setIsNewModalOpen(true)}
							className="bg-white text-black rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/90 transition-colors mx-2 my-2"
						>
							<div className="w-10 h-10 border border-black/10 rounded flex items-center justify-center bg-white shrink-0">
								<Plus className="w-5 h-5 text-black" />
							</div>
							<p className="text-[15px] font-medium">New Collection</p>
						</div>
					)}

					{/* New Collection row */}
					{filteredCollections.length > 0 && (
						<div
							onClick={() => setIsNewModalOpen(true)}
							className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.03] cursor-pointer"
						>
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

			<NewCollectionModal
				open={isNewModalOpen}
				onClose={() => setIsNewModalOpen(false)}
				onCreate={handleCreateCollection}
				isCreating={isCreating}
			/>
		</div>
	)
}
