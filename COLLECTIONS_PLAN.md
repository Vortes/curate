# Collections Feature — Phased Implementation Plan

## Overview

Collections allow users to group captures together. A capture can belong to multiple collections (many-to-many). Collections appear in the sidebar, each with a name, capture count, and a color dot. Users organize captures into collections via an "Organize Mode" — a full-screen edit mode with multi-select, drag-to-reorder, and a floating action bar.

---

## Phase 1: Database Schema & Collection CRUD API

**Goal:** Collection and CollectionCapture tables exist, tRPC router supports full CRUD, and we can verify via Prisma Studio.

### Changes

**`packages/db/prisma/schema.prisma`**
- Add `libraryPosition` Int field to `Capture` model (for persisted library drag-reorder). Default: 0. New captures always get position 0 (top of library), existing captures shift down.
- Add `Collection` model: `id`, `name`, `description?`, `color` (random hex on create), `userId`, `createdAt`, `updatedAt`
- Add `CollectionCapture` join model: `id`, `collectionId`, `captureId`, `position` (Int, for drag-reorder persistence), `createdAt`
- Add relations: `User.collections`, `Collection.captures` (via join), `Capture.collections` (via join)
- Add unique constraint on `(collectionId, captureId)` to prevent duplicates
- Add index on `[collectionId, position]` for ordered queries
- Add index on `[userId, libraryPosition]` for ordered library queries

**`packages/api/src/routers/collection.ts`** (new file)
- `collection.list` — list all collections for the user (id, name, color, captureCount)
- `collection.byId` — get a single collection with its ordered captures
- `collection.create` — create collection (input: name). Auto-assign random muted color
- `collection.update` — update name and/or description
- `collection.delete` — delete collection (cascades join rows, captures untouched)
- `collection.addCaptures` — add capture(s) to collection (input: collectionId, captureIds[]). Auto-assign position at end
- `collection.removeCaptures` — remove capture(s) from collection
- `collection.reorder` — update positions for captures within a collection (input: collectionId, orderedCaptureIds[])

**`packages/api/src/routers/capture.ts`** (modified)
- `capture.list` — now returns captures ordered by `libraryPosition` ASC (instead of `createdAt` DESC)
- `capture.reorderLibrary` — new mutation: accepts `orderedCaptureIds[]`, updates `libraryPosition` for each capture
- `capture.create` — when creating a new capture, set `libraryPosition` to 0 and increment all other captures' `libraryPosition` by 1 (new captures appear at the top)

**`packages/api/src/root.ts`**
- Register `collection` router

### How to test
- Run `pnpm db:push` to apply schema
- Open Prisma Studio (`pnpm db:studio`) and verify new tables exist
- Call each tRPC endpoint via the `/api/trpc` playground or a quick script — create a collection, add captures, list, reorder, delete

---

## Phase 2: Sidebar — Live Collections List

**Goal:** Sidebar shows real collections from the database (not hardcoded). Each collection links to `/collections/[id]`. "New Collection" button at the bottom of the list opens an inline create flow.

### Changes

**`packages/ui/src/components/shell/sidebar.tsx`**
- Replace `defaultCollections` with a `collections` prop that now expects data from tRPC (id, name, color, captureCount)
- Add a `+ New` button below the collections list
- When clicked, show an inline text input in the sidebar (replaces the button) with Enter to submit, Escape to cancel
- On submit, call `collection.create` mutation, invalidate `collection.list`
- **Error handling:** If `collection.create` fails (duplicate name, timeout, etc.), show inline red border + red error text below the input. Input stays open so the user can retry or press Escape to cancel.
- **Loading state:** Show shadcn `Skeleton` loaders (3 rows, matching collection item height) while `collection.list` is fetching. Prevents layout shift on initial load.
- **Text truncation:** Collection names use Tailwind `truncate` with the sidebar width as max-width constraint. Tooltip on hover shows full name if truncated.
- Each collection item links to `/collections/[id]`
- Show "No collections" placeholder text when empty, with the `+ New` button still visible
- Active state: highlight when `activePath` matches `/collections/[id]`

**`apps/web/src/app/(app)/library/page.tsx`** (and desktop `LibraryView.tsx`)
- Pass real collections data to `Sidebar` from `trpc.collection.list.useQuery()`

**`apps/web/src/app/(app)/layout.tsx`** (app shell)
- Fetch `collection.list` and pass to Sidebar

### How to test
- Create a collection via Prisma Studio or Phase 1 API
- Verify it appears in the sidebar with correct name, color dot, and count
- Click `+ New`, type a name, press Enter — collection appears in sidebar
- Click a collection — navigates to `/collections/[id]` (will be 404 until Phase 3, that's OK)

---

## Phase 3: Collection Detail Page

**Goal:** User can click a collection in the sidebar and see a dedicated page showing the collection's captures in their custom order. The page has a title, capture count, and an ellipsis menu for edit/delete.

### Changes

**`apps/web/src/app/(app)/collections/[id]/page.tsx`** (new file)
- Fetch collection via `trpc.collection.byId.useQuery({ id })`
- **Loading state:** Show `Skeleton` loaders for the header (title + count) and a grid of skeleton cards (matching `CaptureCard` dimensions) while query is fetching
- Display collection name as page title (with `truncate`), capture count below
- Render captures in a grid using `CaptureGrid` (single group, ordered by `position`)
- Ellipsis (three-dot) button in topbar area with dropdown menu:
  - **Edit details** — opens a dialog with name + description fields, save calls `collection.update`
  - **Organize** — enters organize mode (Phase 5 wires this up)
  - **Delete collection** — confirmation dialog, then `collection.delete`, redirect to `/library`
- Clicking a capture opens `CaptureDetailModal` (same as library)

**`packages/ui/src/components/collections/collection-header.tsx`** (new file)
- Reusable header: collection name, count, ellipsis menu
- Props: `name`, `count`, `onEdit`, `onOrganize`, `onDelete`

### How to test
- Add captures to a collection (via API/Prisma Studio)
- Navigate to `/collections/[id]` — captures display in correct order
- Edit details dialog: change name/description, verify saves
- Delete collection: verify redirect to `/library`, collection gone from sidebar

---

## Phase 4: Organize Mode — Selection & Floating Action Bar

**Goal:** User clicks "Organize" in the library topbar (or from collection page ellipsis) and enters a select-and-rearrange mode. Captures show a drag handle, clicking selects/deselects, and a floating action bar appears at the bottom with "X Selected", "Organize", "Remove", "Done".

### Changes

**`packages/ui/src/components/library/organize-mode.tsx`** (new file)
- Context provider: `OrganizeModeProvider`
  - State: `isOrganizing`, `selectedIds: Set<string>`, `toggle(id)`, `selectAll()`, `clearSelection()`, `exitOrganize()`
  - Context consumed by CaptureCard and action bar

**`packages/ui/src/components/library/capture-card.tsx`**
- When organize mode is active:
  - Show a drag handle icon (hamburger ≡) in top-right corner (like Cosmos screenshot)
  - On click: toggle selection instead of opening detail modal
  - When selected: show blue/accent border highlight (like Cosmos screenshot 3)
  - Disable hover actions (bookmark, more menu)

**`packages/ui/src/components/library/floating-action-bar.tsx`** (new file)
- Fixed position bottom-center, pill-shaped island (matches Cosmos aesthetic)
- Contents: `"{n} Selected"` (text, truncated with max-width so it doesn't overflow), `"Organize"` button (icon + label), `"Remove"` button (icon + label), `"Done"` button (filled)
- Organize button disabled when 0 selected
- Remove button disabled when 0 selected
- Done button exits organize mode and clears selection
- Animate in/out with slide-up transition

**`apps/web/src/app/(app)/library/page.tsx`**
- Add "Organize" button to the topbar area (next to count label)
- Wrap content in `OrganizeModeProvider`
- When `isOrganizing`, render `FloatingActionBar`
- **Context-aware remove button styling:**
  - **Library context:** Button labeled "Delete" with destructive/red styling (red text, red icon). Click shows a confirmation dialog ("Permanently delete X captures?") before calling `capture.delete`. Visually distinct from the collection variant to prevent accidental permanent deletion.
  - **Collection context:** Button labeled "Remove" with neutral/ghost styling. Click shows an info message ("Removing from {name}. Captures will still be in your library.") then calls `collection.removeCaptures`.

### How to test
- Click "Organize" in library topbar — mode activates
- Click captures — they highlight with accent border, count updates in action bar
- Click "Done" — exits mode, no changes made
- "Remove" from library — deletes captures after confirmation
- The Organize and Remove buttons are disabled when nothing is selected

---

## Phase 5: Organize Modal — Add Selected Captures to Collections

**Goal:** When user clicks "Organize" in the floating action bar (with captures selected), a modal appears showing all their collections with a search bar, plus icons to add, and a "New Collection" option at the bottom. This is the core UX for assigning captures to collections.

### Changes

**`packages/ui/src/components/collections/organize-modal.tsx`** (new file)
- Dialog/modal triggered by "Organize" button in FloatingActionBar
- Content:
  - Search input at top (filters collection list client-side)
  - List of all user collections, each row showing:
    - Color dot + collection name + "{n} captures" subtitle
    - **Three-state toggle icon** on the right based on how many of the selected captures are already in that collection:
      - **None in collection** → Plus icon. Click adds all selected captures.
      - **Some in collection (indeterminate)** → Minus/dash icon. Click adds the missing captures (completes the set). The icon becomes a checkmark.
      - **All in collection** → Checkmark icon. Click removes all selected captures from that collection. The icon reverts to plus.
    - This makes the icon a full toggle — users can add and remove from the modal without leaving it
  - "New Collection" row at end of list (plus icon + "New Collection" text)
  - Clicking "New Collection" opens a mini create dialog (name input + Create button), then auto-adds selected captures to it
  - "Save" button at bottom of modal — closes modal and shows success toast

**Wire up API calls:**
- On plus icon click: call `collection.addCaptures` mutation
- On "New Collection" create: call `collection.create` then `collection.addCaptures`
- On save: invalidate `collection.list` and `collection.byId` queries

### How to test
- Enter organize mode, select 2+ captures, click "Organize" in action bar
- Modal shows all collections with correct counts
- Click plus on a collection — captures are added (plus becomes checkmark)
- Search filters the list correctly
- "New Collection" flow creates collection and adds captures in one flow
- Close modal, navigate to collection page — captures are there

---

## Phase 6: Drag-and-Drop Reorder in Organize Mode

**Goal:** When in organize mode (library or collection page), captures can be dragged to rearrange. Order persists in both contexts — library via `Capture.libraryPosition`, collections via `CollectionCapture.position`.

### Changes

**Install `@dnd-kit/core` + `@dnd-kit/sortable`** in `packages/ui`

**`packages/ui/src/components/library/capture-grid.tsx`**
- When organize mode active, wrap grid items in `DndContext` + `SortableContext`
- Each `CaptureCard` becomes a `useSortable` item (drag handle = the ≡ icon)
- On drag end: reorder the local array + call persist mutation

**Collection page integration:**
- On drag end in a collection page: call `collection.reorder` mutation to persist positions
- Optimistic update for snappy feel

**Library page integration:**
- On drag end in library: call `capture.reorderLibrary` mutation to persist `libraryPosition`
- Optimistic update for snappy feel
- Library grid now renders by `libraryPosition` order (not date groups) — date grouping is removed when custom order is in use

### How to test
- Enter organize mode in a collection, drag a capture, exit — refresh page, order persists
- Enter organize mode in library, drag a capture, exit — refresh page, order persists
- Create a new capture (desktop hotkey or upload) — it appears at the top of the library
- Drag reorder in library, then create a new capture — new capture is at position 0, everything else shifted down

---

## Phase 7: Collection Context in Remove Action & Polish

**Goal:** "Remove" in the floating action bar is context-aware. In library = delete. In a collection page = remove from collection. Plus final polish: empty states, loading states, toasts, and Electron parity.

### Changes

**Context-aware remove:**
- `OrganizeModeProvider` accepts a `context` prop: `{ type: "library" }` or `{ type: "collection", collectionId: string, collectionName: string }`
- **Library context:** Button labeled "Delete" with **destructive/red styling** (red text, red icon, shadcn `destructive` variant). Confirmation dialog required → `capture.delete` mutation
- **Collection context:** Button labeled "Remove" with **neutral/ghost styling**. Info dialog ("Removing from {name}. Captures will still be in your library.") → `collection.removeCaptures` mutation
- The visual distinction (red vs neutral) prevents muscle-memory accidents when users switch between library and collection organize modes

**Sidebar active state:**
- Highlight active collection in sidebar based on current route

**Empty states:**
- Collection page with 0 captures: "No captures in this collection yet. Use Organize mode to add captures."
- Sidebar with 0 collections: "No collections yet" + `+ New` button

**Toasts:**
- "Added to {collection}" when adding captures
- "Removed from {collection}" when removing
- "Collection deleted" when deleting a collection
- "Collection created" when creating

**Electron parity:**
- `apps/desktop/src/renderer/LibraryView.tsx` — integrate organize mode, floating bar, organize modal
- Add collection routes/views to Electron renderer
- Ensure `collection.*` tRPC calls work from Electron (same auth pattern as captures)

### How to test
- Full end-to-end: create collection from sidebar → organize mode in library → select captures → add to collection → navigate to collection → organize within collection → drag reorder → remove capture from collection → verify it's still in library
- Test in Electron: same flow works from desktop app
- Verify all toasts fire correctly
- Verify empty states render when appropriate

---

## File Map (new & modified)

| File | Status |
|------|--------|
| `packages/db/prisma/schema.prisma` | Modified |
| `packages/api/src/routers/collection.ts` | **New** |
| `packages/api/src/routers/capture.ts` | Modified |
| `packages/api/src/root.ts` | Modified |
| `packages/ui/src/components/shell/sidebar.tsx` | Modified |
| `packages/ui/src/components/library/capture-card.tsx` | Modified |
| `packages/ui/src/components/library/capture-grid.tsx` | Modified |
| `packages/ui/src/components/library/organize-mode.tsx` | **New** |
| `packages/ui/src/components/library/floating-action-bar.tsx` | **New** |
| `packages/ui/src/components/collections/organize-modal.tsx` | **New** |
| `packages/ui/src/components/collections/collection-header.tsx` | **New** |
| `apps/web/src/app/(app)/collections/[id]/page.tsx` | **New** |
| `apps/web/src/app/(app)/library/page.tsx` | Modified |
| `apps/web/src/app/(app)/layout.tsx` | Modified |
| `apps/desktop/src/renderer/LibraryView.tsx` | Modified |
