import { Sidebar } from "./sidebar"
import { cn } from "../../lib/utils"

interface CollectionItem {
	id: string
	name: string
	color: string
	captureCount: number
	href: string
}

interface AppShellProps {
	activePath?: string
	pageTitle?: string
	children: React.ReactNode
	className?: string
	userButton?: React.ReactNode
	platform?: "web" | "desktop"
	onSignOut?: () => void | Promise<void>
	isSigningOut?: boolean
	collections?: CollectionItem[]
	isLoadingCollections?: boolean
	onCreateCollection?: (name: string) => Promise<void>
	createError?: string | null
	/** When provided, nav/collection clicks call this instead of native anchor navigation (used by Electron) */
	onNavClick?: (href: string) => void
}

export function AppShell({
	activePath,
	children,
	className,
	userButton,
	platform = "web",
	onSignOut,
	isSigningOut,
	collections,
	isLoadingCollections,
	onCreateCollection,
	createError,
	onNavClick,
}: AppShellProps) {
	const isDesktop = platform === "desktop"

	return (
		<div className="flex h-screen bg-edge text-foreground">
			<Sidebar
				activePath={activePath}
				platform={platform}
				onSignOut={onSignOut}
				isSigningOut={isSigningOut}
				collections={collections}
				isLoadingCollections={isLoadingCollections}
				onCreateCollection={onCreateCollection}
				createError={createError}
				onNavClick={onNavClick}
			/>
			<main
				className={cn(
					"flex-1 flex flex-col bg-surface overflow-hidden",
					className,
				)}
			>
				{/* Drag region for frameless window (desktop only) */}
				{isDesktop && <div className="h-[52px] shrink-0 drag-region" />}
				{children}
			</main>
		</div>
	)
}
