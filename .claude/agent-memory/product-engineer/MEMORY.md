# Product Engineer Memory

## Key Technical Notes
- [Window Context Capture](./window-context-capture.md) — How we detect which app/window a screenshot belongs to and grab the browser URL. Includes critical bugs found (coordinate systems, osascript vs Swift for accessibility), what approaches failed, and production reliability notes.

## Important Gotchas
- **osascript from Electron can't read Firefox accessibility values** — Use compiled Swift binaries instead for AX API calls
- **Screen coordinates vs pixel coordinates** — CGWindowListCopyWindowInfo uses points, Electron's crop uses physical pixels (scaled by display factor). Never mix them.
- **Zen Browser process name is "zen" (lowercase)**, app name is "Zen" (not "Zen Browser"), URL bar shows bare domains without https://

## Product Decisions Made
- No user descriptions for now — pollutes keyword search results
- AI tags are the primary search mechanism
- Source URL capture is automatic, no user configuration needed
- For browsers: `sourceApp` = page title (from window title), `sourceUrl` = tab URL
- For non-browsers: `sourceApp` = app name, `sourceUrl` = null
- Detail view will be a modal (image left, metadata right) — not yet built
