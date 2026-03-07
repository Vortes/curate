# Product Engineer Memory

## Key Technical Notes
- [Window Context Capture](./window-context-capture.md) — How we detect which app/window a screenshot belongs to and grab the browser URL. Includes critical bugs found (coordinate systems, osascript vs Swift for accessibility), what approaches failed, and production reliability notes.

## Important Gotchas
- **osascript from Electron can't read Firefox accessibility values** — Use compiled Swift binaries instead for AX API calls
- **Screen coordinates vs pixel coordinates** — CGWindowListCopyWindowInfo uses points, Electron's crop uses physical pixels (scaled by display factor). Never mix them.
- **Zen Browser process name is "zen" (lowercase)**, app name is "Zen" (not "Zen Browser"), URL bar shows bare domains without https://

## Planned Features
- [Snap Overlay (Element Detection)](./snap-overlay-feature.md) — Auto-snap screenshots to UI elements using AX tree pre-computation. Approach decided, not yet implemented. Key: new N-API function to enumerate AX elements + frames, toggle mode (Option key), depth-limited tree walk.

## Product Decisions Made
- No user descriptions for now — pollutes keyword search results
- AI tags are the primary search mechanism
- Source URL capture is automatic, no user configuration needed
- For browsers: `sourceApp` = page title (from window title), `sourceUrl` = tab URL
- For non-browsers: `sourceApp` = app name, `sourceUrl` = null
- Detail view will be a modal (image left, metadata right) — not yet built

## Web App Architecture (apps/web)
- tRPC client: `apps/web/src/trpc/client.ts` exports `trpc` (createTRPCReact instance)
- tRPC server caller: `apps/web/src/trpc/server.ts` → `serverTrpc()` for RSC usage
- Auth: Clerk (`useClerk`, `UserButton` from `@clerk/nextjs`)
- App layout: `apps/web/src/app/(app)/layout.tsx` — already a client component, wraps AppShell

## UI Package Patterns (packages/ui)
- Components needing hooks must have `"use client"` directive
- AppShell intermediates between layout and Sidebar — new Sidebar props must be added to AppShellProps and threaded through
- Key file: `packages/ui/src/components/shell/sidebar.tsx`, `app-shell.tsx`
- Design tokens: `text-ink`, `text-ink-quiet`, `text-ink-mid`, `text-ink-whisper` / `bg-surface` / `border-edge` / `bg-orange` / `shadow-sculpted-v`/`-h`
- Sidebar width: `w-[220px]`

## Collections Feature (Phase 2 complete)
- `collection.list` returns `{ _count: { captures: number } }` — access as `c._count.captures`
- Use `trpc.useUtils()` + `utils.collection.list.invalidate()` for cache invalidation
- `mutateAsync` throws on error — sidebar relies on this to keep input open on failure
- Skeletons: 3x `h-9 rounded animate-pulse bg-black/[0.04]`
- Active item: orange bar indicator via `activePath === item.href`
- Collection detail: captures are join rows — map `row.capture.id`, `row.capture.imageUrl`, etc.
- `CollectionHeader` has `onOrganize` prop, already wired to dropdown "Organize" menu item
- `trpc.collection.removeCaptures` removes from collection without deleting from library

## Organize Mode (Phase 4 complete)
- Context provider: `OrganizeModeProvider` + `useOrganizeMode` in `packages/ui/src/components/library/organize-mode.tsx`
- Pattern: wrap `export default` page in `<OrganizeModeProvider>`, create inner component that calls `useOrganizeMode()`
- `CaptureCard` new props: `isOrganizing`, `isSelected`, `onSelect` — click in organize mode calls `onSelect` not `onClick`
- `CaptureGrid` new props: `isOrganizing`, `selectedIds: Set<string>`, `onSelect`
- `FloatingActionBar`: `fixed bottom-6 left-1/2 -translate-x-1/2 z-40`, dark pill, `bg-ink text-paper`
- Animation: `animate-fab-in` keyframe in `packages/styles/src/globals.css` — MUST include `translateX(-50%)` in both keyframe states to preserve centering

## Toast System (Phase 7 — sonner)
- `sonner` installed in `packages/ui`; pages import `toast` directly from `"sonner"`
- `<Toaster>` mounted in `apps/web/src/app/(app)/layout.tsx` at `position="bottom-right"` (avoids FAB conflict at bottom-center)
- Toast for collection create fires in the layout's `createCollection.onSuccess`
- Toast for bulk delete fires AFTER all `mutateAsync` calls complete (not per-item)
- Organize modal add/remove toasts: resolve collection name from `collectionsForOrganize` via `variables.collectionId` in `onSuccess`

## Electron App Architecture (apps/desktop) — Phase 7 complete
- View state: `{ type: "library" } | { type: "collection"; id: string }` — simple conditional in `AppContent`, no router
- `Sidebar` + `AppShell` accept `onNavClick?: (href: string) => void` — intercepts anchor clicks for SPA-style navigation (no Next.js router in Electron)
- Collections fetched in `AppContent`, passed to `AppShell` — same tRPC query as web
- `activePath` derived from view state: `/library` or `/collections/{id}`
- `apps/desktop/src/renderer/CollectionView.tsx` — Electron collection detail view (mirrors web page)
- `LibraryView` restructured: `OrganizeModeProvider` wraps inner `LibraryContent` (matches web pattern)

## Design Token Quick Reference
- `bg-ink` = `#1c1b19` (dark text color, also works as dark bg for pill components)
- `text-paper` = `#FFFCF8` (light text on dark surfaces)
- No `animate-in` / `slide-in-from-bottom-*` in this Tailwind v4 setup — always define custom keyframes in globals.css
