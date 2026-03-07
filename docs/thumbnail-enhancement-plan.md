# Thumbnail Enhancement Plan

Transform the screenshot thumbnail from a passive notification into an interactive capture hub with sticky collection destinations and quick annotations.

## User Flow Context

1. Screenshot cool UI/flows
2. Forget about it (accumulate a huge collection)
3. Start a new project, need design inspo
4. Look through screenshots (overwhelming quantity)
5. Save ones they like into a working collection
6. Use it

**Core insight**: At capture time, the user has the freshest context about *why* they're capturing something. That context decays rapidly. These features capture intent at the moment of highest clarity, with the least friction.

## Thumbnail Layout

### Base state (~240x180)

```
+------------------------------+
|  Library v            [ msg] |
|                              |
|      [screenshot preview]    |
|                              |
+------------------------------+
```

- **Top-left**: Sticky destination label + chevron dropdown ("Library" default, or collection name)
- **Top-right**: Speech bubble icon for annotation

### Expanded state (~240x280)

```
+------------------------------+
|  Library v            [ msg] |
|                              |
|      [screenshot preview]    |
|                              |
+------------------------------+
|  What caught your eye?       |
|  [                         ] |
|                      [Save]  |
+------------------------------+
```

### Dropdown open

```
+------------------------------+
|  Library v            [ msg] |
+------------------------------+
|  Library              active |
|  Dashboard Redesign          |
|  Mobile Patterns             |
|  Dark Mode Refs              |
+------------------------------+
|                              |
|      [screenshot preview]    |
|                              |
+------------------------------+
```

---

## Implementation Guardrails

These constraints are non-negotiable across all phases. Every phase must account for them.

### State Management & Race Conditions

- **Annotation buffering**: If the user opens the annotation field, types, and clicks "Save" before the `captureId` arrives via IPC, do NOT fail or discard input. Buffer the description in local JS state. Show a "Saving..." spinner on the button. Automatically fire the PATCH API call the exact moment the ID drops via `thumbnailAPI.onCaptureId`.
- **No silent data loss**: Any user input (description text, collection selection) must be preserved through async delays. If a network call fails after the user has typed something, show an error state — never silently discard.

### Window Management & IPC

- **Memory leak prevention**: Explicitly call `.removeAllListeners()` or use `.once()` for all `win.webContents.ipc` events tied to the thumbnail window on destroy. Use scoped `win.webContents.ipc` handlers, not global `ipcMain`.
- **Dynamic stacking**: When a thumbnail expands or collapses (Phase 4), trigger a full Y-position recalculation for all active sibling thumbnails. Stacking must use each thumbnail's actual current height, not a constant.

### Focus Stealing Prevention (Critical)

Setting `focusable: true` on dropdown/annotation click pulls focus from the user's active application (Figma, IDE, browser). This is unacceptable for a passive capture tool.

- **Primary approach**: Keep the thumbnail window `focusable: false` at all times. Use `win.setIgnoreMouseEvents(false)` (already the case) so click events register without stealing focus. The dropdown and annotation field must work within this non-focusable window.
- **Text input problem**: A non-focusable window cannot receive keyboard input. For the annotation text field (Phase 4), the window MUST become temporarily focusable. When this happens:
  - Record the previously active window via Electron's `BrowserWindow.getFocusedWindow()` BEFORE setting `focusable: true`
  - On Escape, Save, click-outside, or auto-dismiss: set `focusable: false`, then immediately restore focus to the previously recorded window via `previousWindow.focus()`
  - The focusable period must be as short as possible — only while the annotation field is actively being typed in
- **Dropdown does NOT need focus**: The dropdown is click-only (no keyboard input unless search is shown). Handle it entirely via mouse events on the non-focusable window. Only if the search input is injected (>10 collections) does the window need temporary focus, following the same record-and-restore pattern.
- **Escape is always the exit**: Escape must ALWAYS close any open panel (dropdown or annotation), restore focus to the previous window, and resume auto-dismiss. This is the universal "I'm done interacting with the thumbnail" action.

### Keyboard Trap Prevention

- The thumbnail must NEVER trap keyboard focus. Escape always exits the thumbnail interaction entirely and returns focus to the previous application.
- Tab within the thumbnail cycles only between the annotation text field and Save button (2 elements max). The next Tab after Save wraps back to the text field — it does NOT enter the main thumbnail body.
- If focus is somehow on the thumbnail with no panel open (edge case), Escape dismisses the thumbnail immediately.

### UI/UX Constraints

- **Pending upload state**: Do NOT use a "grayed out" speech bubble icon while waiting for the `captureId`. Use a subtle pulse animation or a tiny loading spinner so the user knows the background upload is still processing. The icon should feel alive, not broken.
- **Dropdown legibility**: Apply `text-overflow: ellipsis` for long collection names. Set a `max-height` with internal `overflow-y: auto` scrolling on the dropdown menu to prevent clipping.
- **Search in dropdown**: If `collections.length > 10`, dynamically inject an `<input type="search">` at the top of the dropdown to filter the list. Below 10, no search field.

### Network & Auth Edge Cases

- **Auth failure (401)**: If `GET /api/collections/list` fails due to an expired token, silently fall back to the base "Library" label. Hide the chevron and disable dropdown interaction entirely — do not show a broken dropdown.
- **Offline mode**: If the app detects no network connection (upload fails immediately), hide or disable both the annotation bubble and the destination dropdown. The thumbnail degrades to a simple preview-only notification.
- **Deleted collection**: If `addCaptureToCollection` returns 404, silently reset `captureDestination` to `null` in settings. Next thumbnail shows "Library".

---

## Phase 1: Extract Thumbnail to HTML File + IPC Bridge

**Scope**: Pure refactoring — no new features.

Replace the inline HTML data URL in `thumbnailManager.ts` with a standalone `thumbnail.html` file and a `thumbnailPreload.ts` IPC bridge. Increase size from 200x140 to 240x180. This is required because Electron blocks preload scripts on data URLs, and every subsequent phase needs IPC.

### Files to create

- `apps/desktop/src/capture/thumbnail.html` — standalone HTML file (same visual as today, just extracted)
- `apps/desktop/src/capture/thumbnailPreload.ts` — minimal preload exposing a `thumbnailAPI` bridge (initially just a `dismiss` channel)

### Files to modify

- `apps/desktop/src/capture/thumbnailManager.ts` — replace `data:text/html` URL with `file://` path to `thumbnail.html`; pass image data URL via IPC (`webContents.send("thumbnail:init", { imageDataUrl })`); update dimensions to 240x180; keep `focusable: false`
- Vite/Forge build config — ensure thumbnail HTML and preload are included in build output

### Testable outcome

- [ ] Screenshot taken -> thumbnail appears at 240x180 with same visual as before
- [ ] No user-facing changes except slightly larger size
- [ ] Thumbnail still auto-dismisses after 5 seconds
- [ ] Up to 3 thumbnails stack correctly at new size

---

## Phase 2: Sticky Destination (Persistence + Capture Flow)

**Scope**: Backend wiring — no dropdown UI yet.

Add `captureDestination` to the settings system. Wire it into the capture flow so captures are automatically added to the selected collection after upload. Update thumbnail badge to show destination name.

### Files to modify

- `apps/desktop/src/capture/preferences.ts` — extend `Settings` interface with `captureDestination: { collectionId: string; collectionName: string } | null` (default `null`)
- `apps/desktop/src/capture/captureManager.ts` — after `uploadCapture` returns `{ id }`, read `captureDestination` from settings; if set, call `addCaptureToCollection`
- `apps/desktop/src/capture/uploader.ts` — add `addCaptureToCollection(captureId, collectionId, authToken)` function
- `apps/desktop/src/capture/thumbnailManager.ts` — update `showThumbnail` to accept a destination label; badge shows "Library" or collection name instead of "Captured"

### Files to create

- `apps/web/src/app/api/captures/add-to-collection/route.ts` — POST endpoint accepting `{ captureId, collectionId }` with Bearer auth

### Design decision

New REST endpoint rather than tRPC from Electron. The main process uses `net.fetch` for upload already — this stays consistent and avoids pulling tRPC client into the Electron build.

### Testable outcome

- [ ] Manually edit `settings.json` to set `captureDestination: { collectionId: "<valid-id>", collectionName: "Test" }`
- [ ] Screenshot taken -> capture appears in both Library and "Test" collection in web app
- [ ] Thumbnail badge shows "Test" instead of "Captured"
- [ ] Setting `captureDestination: null` -> badge shows "Library", captures go to Library only

---

## Phase 3: Destination Dropdown UI

**Scope**: The collection picker in the thumbnail header.

Add the interactive dropdown to the thumbnail. Clicking the destination label + chevron opens an inline list of collections. Selecting one saves it as the sticky destination.

### Files to modify

- `apps/desktop/src/capture/thumbnailPreload.ts` — expose new IPC channels:
  - `thumbnailAPI.getCollections()` -> `Promise<Array<{ id: string; name: string }>>`
  - `thumbnailAPI.setDestination(dest)` -> saves to settings
  - `thumbnailAPI.getDestination()` -> returns current destination
  - `thumbnailAPI.requestFocus()` / `thumbnailAPI.releaseFocus()` -> record previous window, toggle focusable, restore focus on release (only needed when search input is shown for >10 collections)
  - `thumbnailAPI.pauseDismiss()` / `thumbnailAPI.resumeDismiss()` -> control auto-dismiss timer
- `apps/desktop/src/capture/thumbnail.html` — add destination header bar with dropdown markup and vanilla JS for toggle/select behavior
- `apps/desktop/src/capture/thumbnailManager.ts` — add IPC handlers:
  - `thumbnail:get-collections` — fetch via web API using auth token
  - `thumbnail:set-destination` — save to settings
  - `thumbnail:get-destination` — read from settings
  - `thumbnail:request-focus` / `thumbnail:release-focus` — record previous window before focus, restore on release (see Focus Stealing Prevention guardrail)
  - `thumbnail:pause-dismiss` / `thumbnail:resume-dismiss` — control timer

### Files to create

- `apps/web/src/app/api/collections/list/route.ts` — lightweight GET endpoint returning `[{ id, name }]` for authenticated user

### Key interaction details

- Clicking chevron: dropdown appears — window stays non-focusable (click-only, no keyboard input needed)
- If >10 collections and search input is shown: window becomes temporarily focusable (record previous window first), returns focus to previous window on close
- Selecting an item: saves to settings, updates header, closes dropdown
- Clicking outside: closes dropdown
- Escape: closes dropdown, restores focus to previous window (if focus was taken)
- Auto-dismiss pauses while dropdown is open

### Testable outcome

- [ ] Screenshot -> thumbnail shows "Library v" in header
- [ ] Click chevron -> dropdown appears with "Library" + all user collections
- [ ] Select a collection -> header updates, dropdown closes
- [ ] Next screenshot lands in that collection (sticky)
- [ ] Select "Library" -> reverts to Library-only behavior
- [ ] Auto-dismiss does not fire while dropdown is open
- [ ] Auth token expired -> dropdown chevron hidden, header shows "Library" (no interaction)
- [ ] Offline -> dropdown chevron hidden, header shows "Library" (no interaction)
- [ ] Collection with a very long name -> truncated with ellipsis in header and dropdown
- [ ] 15+ collections -> search input appears at top of dropdown
- [ ] Open dropdown while in Figma -> Figma stays focused (no focus steal for click-only dropdown)
- [ ] 15+ collections, search input shown -> focus taken, Escape returns focus to Figma immediately

---

## Phase 4: Annotation (Expand/Collapse)

**Scope**: The speech bubble icon and description text field.

Add the annotation icon to the thumbnail header. Clicking it expands the thumbnail to reveal a text input. Saving writes to the capture's `description` field via API.

### Capture ID delivery

The thumbnail appears immediately after crop (before upload completes). The annotation needs the capture ID to save. Solution: show thumbnail immediately, send capture ID via async IPC when upload completes. The speech bubble icon shows a subtle pulse animation until the ID arrives (~1-2s) — NOT grayed out (see guardrails).

**Annotation buffering**: If the user clicks the pulsing icon before the ID arrives, the annotation panel still opens. The user can type their description. If they hit Save before the ID arrives, show "Saving..." on the button and buffer the text. The PATCH fires automatically when the ID drops via IPC.

### Files to modify

- `apps/desktop/src/capture/thumbnailManager.ts`:
  - `showThumbnail` returns a handle so `captureManager` can later send the capture ID
  - New `setCaptureId(entry, captureId)` function sends `thumbnail:capture-id` IPC
  - IPC handler for `thumbnail:save-annotation` -> calls PATCH API
  - Height resize handlers: `thumbnail:expand` -> `win.setContentSize(240, 280)`; `thumbnail:collapse` -> restore to 240x180
- `apps/desktop/src/capture/captureManager.ts` — after upload returns `{ id }`, call `setCaptureId` on the most recent thumbnail
- `apps/desktop/src/capture/thumbnail.html` — add speech bubble icon, expandable annotation section (textarea + Save button), expand/collapse JS
- `apps/desktop/src/capture/thumbnailPreload.ts`:
  - `thumbnailAPI.saveAnnotation(captureId, description)` -> IPC to main
  - `thumbnailAPI.onCaptureId(callback)` -> listen for ID from main
  - `thumbnailAPI.expand()` / `thumbnailAPI.collapse()` -> request resize

### Files to create

- `apps/web/src/app/api/captures/[id]/description/route.ts` — PATCH endpoint accepting `{ description: string }`, validates capture belongs to user

### Key interaction details

- Speech bubble click -> record the previously focused window, set `focusable: true`, expand thumbnail to 240x280, focus the text field
- Enter or Save -> PATCH description (or buffer if no ID yet), brief "Saved" flash, collapse, set `focusable: false`, restore focus to previously recorded window, resume auto-dismiss
- Escape -> collapse without saving, set `focusable: false`, restore focus to previous window, resume auto-dismiss
- Auto-dismiss pauses while expanded
- Icon shows pulse animation until capture ID arrives, then becomes static
- User CAN click the icon and type before ID arrives — input is buffered and saved when ID drops
- Tab cycles only between text field and Save button (2 elements). Never traps focus in the thumbnail body.

### Testable outcome

- [ ] Screenshot -> speech bubble icon appears with subtle pulse animation
- [ ] After ~1-2s (upload completes), icon becomes static (pulse stops)
- [ ] Click icon -> thumbnail expands, text field with "What caught your eye?" placeholder
- [ ] Type "Love this color palette" -> Enter -> "Saved" flash -> collapses
- [ ] Web app shows "Love this color palette" as the capture's description
- [ ] Escape while expanded -> collapses without saving
- [ ] Auto-dismiss does not fire while expanded
- [ ] Click icon BEFORE upload completes -> type description -> Save shows "Saving..." -> upload completes -> description is saved
- [ ] Offline/upload failure -> annotation icon and dropdown are hidden, thumbnail is preview-only
- [ ] Open annotation while in VS Code -> type -> Save -> VS Code regains focus immediately
- [ ] Open annotation -> Escape -> VS Code regains focus immediately
- [ ] Tab in annotation -> cycles between text field and Save only, never escapes into thumbnail body

---

## Phase 5: Polish + Edge Cases

**Scope**: Production hardening.

### Variable-height stacking

Thumbnails stack based on actual current height (not a constant). When one thumbnail is expanded to 280px while others are 180px, positions recalculate correctly.

### Deleted collection recovery

If the sticky destination collection gets deleted, the next `addCaptureToCollection` call will fail. Handle gracefully: on 404/error, silently reset `captureDestination` to `null` in settings. Thumbnail falls back to "Library".

### Collection list caching

Cache the collection list in main process memory with a 30-second TTL. Invalidate on destination change (user may have just created a new collection in the web app).

### Scoped IPC handlers

Use `win.webContents.ipc` (scoped to the window) rather than global `ipcMain` to prevent handler accumulation across multiple thumbnail windows.

### Keyboard accessibility

- Arrow keys navigate dropdown items
- Enter selects
- Escape closes dropdown or collapses annotation
- Tab moves between interactive elements

### Settings migration

Existing `settings.json` files lack `captureDestination`. Ensure `loadSettings` spreads with `captureDestination: null` default.

### Files to modify

- `apps/desktop/src/capture/thumbnailManager.ts` — variable-height stacking, scoped IPC, collection cache
- `apps/desktop/src/capture/captureManager.ts` — graceful fallback on collection-add failure
- `apps/desktop/src/capture/thumbnail.html` — keyboard navigation

### Testable outcome

- [ ] Take 3 screenshots rapidly, expand annotation on the middle one -> all three stack without overlap
- [ ] Set destination to a collection, delete it in web app, take screenshot -> goes to Library, no errors, badge resets
- [ ] Open dropdown -> navigate with arrow keys, select with Enter, close with Escape
- [ ] Take 10 screenshots rapidly -> no IPC handler leak warnings in console

---

## Architecture Decisions Summary

| Decision | Rationale |
|----------|-----------|
| Standalone HTML file over data URL | Required for preload scripts; maintainable as complexity grows |
| Vanilla JS in thumbnail (no React) | Transient mini-window needs instant appearance; no framework overhead |
| New REST endpoints over tRPC from Electron | Main process uses `net.fetch`; avoids pulling tRPC client into Electron build |
| Async capture ID delivery (Option B) | Show thumbnail immediately for snappy feel; icon disabled briefly until ID arrives |
| Scoped IPC via `win.webContents.ipc` | Prevents handler leaks across multiple thumbnail windows |

## New Files

| File | Phase | Purpose |
|------|-------|---------|
| `apps/desktop/src/capture/thumbnail.html` | 1 | Standalone thumbnail UI |
| `apps/desktop/src/capture/thumbnailPreload.ts` | 1 | IPC bridge for thumbnail window |
| `apps/web/src/app/api/captures/add-to-collection/route.ts` | 2 | Add capture to collection endpoint |
| `apps/web/src/app/api/collections/list/route.ts` | 3 | Lightweight collection list endpoint |
| `apps/web/src/app/api/captures/[id]/description/route.ts` | 4 | PATCH capture description endpoint |

## Modified Files

| File | Phases |
|------|--------|
| `apps/desktop/src/capture/thumbnailManager.ts` | 1, 2, 3, 4, 5 |
| `apps/desktop/src/capture/captureManager.ts` | 2, 4, 5 |
| `apps/desktop/src/capture/preferences.ts` | 2 |
| `apps/desktop/src/capture/uploader.ts` | 2 |
| `apps/desktop/src/capture/thumbnail.html` | 3, 4, 5 |
| `apps/desktop/src/capture/thumbnailPreload.ts` | 3, 4 |
| Vite/Forge build config | 1 |
