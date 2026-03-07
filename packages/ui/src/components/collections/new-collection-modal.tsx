"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"

interface NewCollectionModalProps {
	open: boolean
	onClose: () => void
	onCreate: (name: string) => Promise<void>
	isCreating?: boolean
}

export function NewCollectionModal({
	open,
	onClose,
	onCreate,
	isCreating = false,
}: NewCollectionModalProps) {
	const [name, setName] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (open) {
			setName("")
			setTimeout(() => inputRef.current?.focus(), 0)
		}
	}, [open])

	useEffect(() => {
		if (!open) return
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [open, onClose])

	if (!open) return null

	async function handleCreate() {
		const trimmed = name.trim()
		if (!trimmed || isCreating) return
		await onCreate(trimmed)
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose()
			}}
		>
			<div
				className="bg-surface border border-edge rounded-3xl w-[420px] p-8 flex flex-col items-center shadow-2xl"
				style={{
					boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
				}}
			>
				<h2 className="text-[28px] font-serif text-ink mb-1">New Collection</h2>
				<p className="text-[15px] text-ink-quiet mb-8">A group of captures</p>

				<div className="w-full bg-surface border border-edge rounded-2xl flex items-center px-4 py-3 mb-8 focus-within:border-ink-quiet transition-colors">
					<input
						ref={inputRef}
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ex. 'Gathering Spirals'"
						disabled={isCreating}
						onKeyDown={(e) => {
							if (e.key === "Enter") void handleCreate()
						}}
						className="flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-whisper outline-none"
					/>
				</div>

				<button
					onClick={handleCreate}
					disabled={!name.trim() || isCreating}
					className="w-[280px] h-[52px] bg-ink text-surface rounded-full text-[16px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
				>
					{isCreating ? (
						<div className="w-5 h-5 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
					) : (
						"Create"
					)}
				</button>
			</div>
		</div>
	)
}
