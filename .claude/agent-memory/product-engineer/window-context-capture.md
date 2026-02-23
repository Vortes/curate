# Window Context Capture — Technical Notes

## What We Built
When a user takes a screenshot via the Electron app, we automatically detect which app/window they captured and store `sourceApp` + `sourceUrl` alongside the capture.

## Architecture
Single Swift binary (`apps/desktop/swift-helpers/window-info.swift`) handles everything in one call:
1. Uses `CGWindowListCopyWindowInfo` to get all visible windows with bounds
2. Matches the user's selected region against window positions (front-to-back z-order)
3. Takes the **frontmost** window with ≥25% overlap (not the largest overlap — z-order matters)
4. For Firefox-based browsers, reads the URL bar directly via macOS Accessibility API
5. Returns JSON: `{ appName, bundleId, windowTitle, browserUrl? }`

## Coordinate Systems — Critical Bug We Hit
- The overlay returns selection coordinates in **screen points** (logical coordinates)
- `captureManager.ts` multiplies by `scaleFactor` to get `cropRect` in **physical pixels** for image cropping
- `CGWindowListCopyWindowInfo` returns window bounds in **screen points**
- **Must pass original `rect` (points) to the Swift binary, NOT `cropRect` (pixels)**
- Getting this wrong causes completely wrong window matching on Retina displays

## Browser URL Strategies

### Chromium / Safari / Arc — AppleScript (reliable)
These browsers have native AppleScript scripting dictionaries. Simple `tell application "Google Chrome" to get URL of active tab of front window`. Works from `osascript` spawned by Electron. Rock solid.

### Firefox / Zen / Waterfox / LibreWolf — Swift Accessibility API (reliable)
- Firefox removed AppleScript support years ago (open bug for 16+ years)
- We read the URL bar combo box via the macOS Accessibility framework
- UI path: `window → group 1 → toolbar (description: "Navigation") → group → combo box → value`
- **CRITICAL: This only works from a compiled Swift binary, NOT from osascript**

### What Doesn't Work (and why)
- **`osascript -e` from Electron**: Finds the combo box element but returns empty value. Suspected macOS TCC permission inheritance issue — osascript spawned by Electron doesn't fully inherit accessibility permissions, but compiled binaries do.
- **`osascript` via temp file**: Same result — element found, value empty.
- **App activation + delay before reading**: Tried `tell application "Zen" to activate` + delay 0.15-0.4s. Still empty.
- **Session file (`recovery.jsonlz4`)**: Works but updates every ~15s — too stale for tab-switching users. Rejected for production.

### Zen Browser Specifics
- Process name in System Events: `"zen"` (lowercase)
- App name for `tell application`: `"Zen"` (not "Zen Browser")
- Bundle ID: `app.zen-browser.zen`
- Window titles do NOT include browser suffix (just the page title, e.g., "Neon Console")
- URL bar shows bare domains without protocol (e.g., `console.neon.tech` not `https://...`)
- Need to prepend `https://` when URL lacks a protocol prefix

## Data Flow
```
Hotkey → overlay → screencapture → user selects region → overlay dismisses
  → 100ms delay (lets window manager settle)
  → Promise.all([resolveWindowContext(rect), requestAuthToken()])
    → Swift binary: window match + URL read (single call)
    → For Chromium/Safari: osascript URL fetch (parallel)
  → uploadCapture(pngBuffer, token, { sourceApp, sourceUrl })
  → API stores sourceApp + sourceUrl in Capture record
```

## Schema
- `sourceApp`: String? — Page title for browsers (e.g., "Neon Console"), app name otherwise (e.g., "Figma")
- `sourceUrl`: String? — Full URL for browsers, null for non-browser apps
- Migration: `20260223000000_add_source_app`

## Files
- `apps/desktop/swift-helpers/window-info.swift` — Compiled Swift CLI (window matching + Firefox URL reading)
- `apps/desktop/src/capture/browserUrl.ts` — Chromium/Safari URL via AppleScript, `isBrowser()` helper
- `apps/desktop/src/capture/windowContext.ts` — Orchestrator combining Swift binary + browser URL
- `apps/desktop/src/capture/captureManager.ts` — Wired into capture pipeline
- `apps/desktop/src/capture/uploader.ts` — Sends sourceApp/sourceUrl as multipart form fields
- `apps/web/src/app/api/captures/upload/route.ts` — Reads and persists both fields
- `packages/db/prisma/schema.prisma` — sourceApp field added

## Production Reliability
| Component | Reliability | Notes |
|-----------|------------|-------|
| Window matching | High | Stable macOS API, used by many apps |
| Chrome/Safari/Arc URL | High | Stable AppleScript interfaces maintained for years |
| Firefox/Zen URL | Medium | Depends on toolbar structure staying consistent |
| Graceful fallback | High | Any failure → sourceUrl is null, capture still works |

## Required Permissions
- **Screen Recording** — for `CGWindowListCopyWindowInfo` and `screencapture`
- **Accessibility** — for reading Firefox/Zen URL bar via AX API
- Prompt on first launch with `systemPreferences.isTrustedAccessibilityClient(true)`

## Rejected Approaches
- **Frontmost app heuristic**: Wrong when capturing background windows
- **Vector/embedding search for descriptions**: Over-engineered for MVP, garbage-in-garbage-out with keyword search
- **User-provided descriptions for search**: Pollutes search results with inconsistent wording
- **AI-inferred source URLs from screenshots**: Not accurate enough

## Detail View Brainstorm (Not Yet Built)
- Modal overlay: image left, metadata panel right
- Show AI tags as pills, source app/URL, capture date
- Jobs to be done: Inspect & Study, Organize & Curate, Export & Share
- Considered but deferred: user notes, collections, related captures, color palette extraction
- Navigation: arrow keys to cycle through captures in grid
