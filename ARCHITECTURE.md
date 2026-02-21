# Synthesis — Architecture & Technical Decisions

> Reference document for the Synthesis monorepo. Covers architecture, tech stack, data flow, deployment, and key decisions made during planning.

---

## Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Fast, proven monorepo tooling. pnpm over bun because of Electron native module compatibility. |
| Web App | Next.js (T3-style) | Serves the web UI, API (tRPC), and landing page. Familiar from T3 stack. |
| Desktop App | Electron Forge + Vite | Official Electron toolchain with Vite for fast dev/HMR. |
| Shared UI | React + Tailwind + shadcn/ui | shadcn works in both Next.js and Electron (renderer is just a browser window). |
| API Layer | tRPC | Type-safe API shared between web and desktop. Defined once, consumed by both apps. |
| Database | Prisma + Neon (PostgreSQL) | Serverless Postgres. Prisma runs server-side only (in Next.js), never in Electron. |
| Image Storage | Uploadthing | Screenshots stored via Uploadthing. Metadata (tags, colors, etc.) stored in Neon. |
| AI Analysis | OpenAI GPT-4o + text-embedding-3-small | Vision model describes captures; embeddings enable semantic search via pgvector. |
| Auth | Clerk | Managed auth for both web and Electron. |

---

## Monorepo Structure

```
synthesis/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace definitions
├── turbo.json                # Turborepo pipeline config
├── apps/
│   ├── web/                  # Next.js — web app + API + landing page
│   └── desktop/              # Electron Forge + Vite — desktop app
├── packages/
│   ├── ui/                   # Shared React + Tailwind + shadcn components
│   ├── api/                  # tRPC router definitions & types
│   └── db/                   # Prisma schema + client (Neon)
```

### Package Responsibilities

**`packages/ui`** — All shared React components live here. Uses shadcn/ui (React + Tailwind + Radix). Both `apps/web` and `apps/desktop` import from `@synthesis/ui`. This is the single source of truth for the design system.

**`packages/api`** — tRPC router definitions and Zod input schemas. Defines the shape of every API endpoint. Imported by `apps/web` to mount as a server, and by `apps/desktop` to get type-safe client calls.

**`packages/db`** — Prisma schema, client, and migrations. Only used server-side by `apps/web`. The Electron app never imports this package.

---

## Data Flow

### How Electron Talks to the Backend

```
Electron App  ──HTTP──▶  Next.js (apps/web)  ──Prisma──▶  Neon Postgres
(user's Mac)              /api/trpc route                   (cloud DB)
```

- The Electron app NEVER connects to the database directly.
- Database credentials live only on the server (Next.js environment variables).
- The Electron renderer calls tRPC endpoints over HTTP to the deployed web app.

### How the Web App Calls the API

```
apps/web server components  → call tRPC directly (no network hop, runs in-process)
apps/web client components  → call tRPC via React Query + Next.js API route
apps/desktop renderer       → call tRPC over HTTP to apps/web/api/trpc
```

### Screenshot Capture Flow

```
User captures screenshot (global hotkey → Electron overlay → select region)
  → Electron main process takes the capture
  → Uploads image via Uploadthing (through tRPC endpoint)
  → Saves metadata to Neon (tRPC mutation → Prisma)
  → AI analysis triggered (OpenAI GPT-4o Vision) → tags written back to Neon
```

---

## tRPC Setup

tRPC routers are defined in `packages/api` and consumed differently by each app:

| Consumer | How it consumes tRPC | Network hop? |
|---|---|---|
| `apps/web` — server components | Direct caller (`api.capture.search()`) | None — runs in-process |
| `apps/web` — client components | React Query via Next.js API route | Internal (stays on server infra) |
| `apps/desktop` — renderer | HTTP client pointed at `apps/web/api/trpc` | Yes — over the network |

One router definition, two consumers, full type safety end to end.

---

## Prisma & Neon

- Prisma schema lives in `packages/db`.
- Prisma client is generated and exported from `packages/db`.
- Only `apps/web` imports from `packages/db`. The desktop app never uses Prisma.
- Neon connection string is set as `DATABASE_URL` in `apps/web/.env` only.
- Prisma connects to Neon via standard PostgreSQL adapter with `?sslmode=require`.

---

## Electron Architecture

### Electron vs Electron Builder vs Electron Forge

| | What it is | Role |
|---|---|---|
| **Electron** | The framework/runtime (Chromium + Node.js) | Provides `BrowserWindow`, `ipcMain`, `globalShortcut`, etc. |
| **Electron Builder** | Standalone packaging tool | Alternative to Forge — config-heavy, very flexible |
| **Electron Forge** | Official all-in-one toolchain (dev + build + package + distribute) | What we use. Handles the full lifecycle. |

**We use Electron Forge with the Vite plugin.**

### Electron App Structure

```
apps/desktop/
├── forge.config.ts              # Forge config (makers, publishers, plugins)
├── vite.main.config.ts          # Vite config for main process
├── vite.renderer.config.ts      # Vite config for renderer (React app)
├── vite.preload.config.ts       # Vite config for preload script
├── src/
│   ├── main.ts                  # Main process — Node.js: shortcuts, IPC, window mgmt
│   ├── preload.ts               # Bridge: exposes safe APIs from main to renderer via contextBridge
│   └── renderer/                # React app — imports from @synthesis/ui
│       ├── index.html
│       ├── App.tsx
│       └── ...
```

### Key Electron Concepts

- **Main process** — Node.js. Has full OS access. Handles global shortcuts, screen capture, file system, IPC.
- **Renderer process** — Chromium browser window. Runs the React app. No direct Node.js access for security.
- **Preload script** — Runs before the renderer loads. Uses `contextBridge` to safely expose specific main-process APIs to the renderer.
- **IPC** — Communication between main and renderer. Analogous to tRPC between client and server.

### Electron Features Used (from Product.md)

- `globalShortcut` — capture hotkey
- `desktopCapturer` — screen/window capture
- `BrowserWindow` with transparency — capture overlay
- macOS Accessibility APIs — smart element detection (Phase 2)

---

## Shared UI — shadcn/ui

shadcn/ui works in both Next.js and Electron because:
- It's just React components + Tailwind CSS + Radix primitives
- Electron's renderer is a Chromium browser window — all web components work identically
- Components are set up once in `packages/ui` and imported by both apps as `@synthesis/ui`

---

## Web App Route Structure

The Next.js app serves three concerns from one deployment:

```
apps/web/src/app/
├── (marketing)/                # Landing page — public, no auth
│   ├── page.tsx                # Hero, features, download CTA
│   ├── pricing/page.tsx        # Pricing page
│   └── layout.tsx              # Marketing layout (no app chrome)
├── (app)/                      # Web app — authenticated
│   ├── library/page.tsx        # Capture library
│   ├── collections/page.tsx    # Collections
│   └── layout.tsx              # App layout (sidebar, nav)
└── api/trpc/[trpc]/route.ts    # tRPC API endpoint (consumed by both web client and Electron)
```

Next.js route groups `(marketing)` and `(app)` provide different layouts on the same domain. No need for a separate landing page app.

---

## Deployment

### Web App + API + Landing Page → Vercel

- Deploy `apps/web` to Vercel.
- Vercel natively resolves monorepo dependencies from `packages/*`.
- Vercel project settings: Root directory = `apps/web`, Framework = Next.js.
- Serves: `synthesis.app` (landing), `synthesis.app/library` (web app), `synthesis.app/api/trpc` (API).

### Electron App → GitHub Releases

The Electron app builds into platform-specific installers and uploads to GitHub Releases.

**Build pipeline (GitHub Actions CI):**

```
Push to main (or tag a release)
  → CI runs: electron-forge make
  → Produces: Synthesis-x.x.x-arm64.dmg (Apple Silicon)
  → Produces: Synthesis-x.x.x-x64.dmg (Intel Mac)
  → Uploads to GitHub Releases
  → Landing page "Download" button points to latest release
```

**Forge publisher config:**

```ts
// apps/desktop/forge.config.ts
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: { owner: 'yourname', name: 'synthesis' },
      prerelease: false,
    },
  },
]
```

**Auto-updates:** Electron's built-in `autoUpdater` checks GitHub Releases on app launch and updates in the background.

**Code signing:** Required for public macOS distribution. Apple Developer account ($99/yr). Electron Forge handles signing config — you provide the certificates. Not needed during development.

### Deployment Summary

```
synthesis.app (Vercel)
├── /                    → Landing page with "Download for Mac" button → GitHub Release .dmg
├── /library             → Web app (authenticated, same UI as desktop)
├── /api/trpc/*          → API consumed by both web app and Electron

GitHub Releases
└── Synthesis-x.x.x.dmg → Downloaded and installed by users
    └── App calls synthesis.app/api/trpc for all data
    └── Auto-updates check GitHub Releases on launch
```

---

## Key Decisions Log

| Decision | Choice | Reasoning |
|---|---|---|
| Package manager | pnpm | Bun has compatibility issues with Electron native modules. pnpm is fast and proven. |
| Monorepo tool | Turborepo | Works natively with pnpm workspaces. Simple config. |
| Electron toolchain | Electron Forge + Vite | Official, handles full lifecycle (dev → distribute), Vite gives fast HMR. |
| UI framework | shadcn/ui (React + Tailwind + Radix) | Works identically in browser and Electron. One component library for both apps. |
| API layer | tRPC | Type-safe, defined once in `packages/api`, consumed by both apps. Familiar from T3. |
| Database | Prisma + Neon (Postgres) | Server-side only. Neon is serverless Postgres. Prisma for type-safe queries. |
| DB in Electron | None — calls API over HTTP | Can't embed DB credentials in a desktop app. All data access goes through the API. |
| Landing page | Routes in `apps/web` | No separate app. Next.js route groups separate marketing layout from app layout. |
| Desktop distribution | GitHub Releases via Electron Forge publisher | Simple, supports auto-updates, free. |
| Platform | Mac-first | Per Product.md. Windows in Phase 3. |
| AI analysis | OpenAI GPT-4o | Strong vision capabilities for screenshot analysis (component detection, colors, tags). |
| Image storage | Uploadthing | Built for Next.js/T3. Simple API, handles presigned URLs. Good for MVP. |
| Auth | Clerk | Managed auth, fast setup, good free tier. Works in both web and Electron. |
| Capture method | Global (Electron overlay) | Full screen capture via Electron overlay window. Requires screen capture permissions. |
| Data model | Lean — 2 tables (User, Capture) | AI description + pgvector embedding per capture. No collections/flows for MVP. Expand when patterns emerge. |

---

## Build Phases

Each phase produces a testable, verifiable result. Complete them in order.

### Phase 1 — Monorepo Skeleton

Scaffold root config, all packages, and both apps with placeholder content.

**Verify:** `pnpm dev:web` opens Next.js on localhost. `pnpm dev:desktop` opens an Electron window. Both show a "Hello Synthesis" page using a shared component from `@synthesis/ui`.

### Phase 2 — shadcn/ui + Shared Components

Set up Tailwind + shadcn in `packages/ui`. Build a basic app shell layout (sidebar, topbar) used by both apps.

**Verify:** Both web and desktop render the same app shell with shadcn components (buttons, card, etc.). Changing a component in `packages/ui` updates both apps.

### Phase 3 — Auth (Clerk)

Add Clerk to the web app and Electron app. Implement sign-up, sign-in, and protected routes.

**Verify:** Can sign up on web, see the authenticated app shell. Can sign in from Electron, same flow. Unauthenticated users get redirected to login.

### Phase 3.5 — Electron Production Auth (Browser-Redirect Flow)

Replace the embedded Clerk `<SignIn />` in Electron with a browser-redirect flow for production use. The embedded component works in dev (localhost) but breaks in production (`file://` protocol).

**Flow:**
1. Electron opens the system browser → `synthesis.app/sign-in`
2. User signs in via Clerk on the web normally
3. After sign-in, web app redirects to `synthesis://auth?token=...` (custom protocol)
4. Electron registers the `synthesis://` protocol, receives the token, hydrates the Clerk session

**Work involved:**
- Register `synthesis://` custom protocol in Electron main process (`app.setAsDefaultProtocolClient`)
- Add a web route that generates a handoff token and redirects to `synthesis://auth?token=...`
- In Electron, handle the deep link, exchange the token for a Clerk session
- Replace `<SignIn />` in desktop with an "Open browser to sign in" button
- Handle edge cases: already signed in, token expiry, auth errors

**Verify:** Click "Sign in" in Electron → system browser opens → sign in on web → Electron receives session → shows authenticated app shell. Works with both `file://` and packaged `.app`.

### Phase 4 — Database + tRPC

Set up Prisma schema (User, Capture), connect to Neon, wire up tRPC routers in `packages/api`, mount in the web app, connect from Electron.

**Verify:** After signing in, call a test tRPC endpoint from both web and Electron that reads/writes to Neon. Confirm data shows up in Prisma Studio.

### Phase 5 — Image Upload + Library View

Integrate Uploadthing for image uploads. Build a basic library page that displays uploaded captures in a grid.

**Verify:** Upload an image (manual file picker for now) from the web app. It appears in the library grid with a timestamp. Same library visible from Electron. Delete a capture, it disappears.

### Phase 6 — AI Analysis + Semantic Search (RAG)

Each uploaded screenshot is analyzed by GPT-4o Vision (generates a rich text description of the UI) and embedded with text-embedding-3-small (1536-dim vector stored via pgvector). The library search bar uses cosine similarity to find captures by natural language query (e.g. "dark login page with social buttons"). No tags or badges on capture cards — discovery is powered entirely by the search bar. Capture cards show clean image + date with a subtle loading indicator during analysis.

**Verify:** Upload a screenshot — it appears in the grid immediately, analysis runs in background. Type a natural language query in the search bar — matching captures surface ranked by relevance. Clear search to return to chronological grid.

### Phase 7 — Global Capture (Electron Overlay)

Implement the global hotkey, transparent overlay window, region selection, and automatic save-to-library flow in Electron.

#### Global Hotkey

- Default shortcut: `Cmd+Shift+S` (configurable via Preferences).
- Registered with Electron's `globalShortcut` module.
- When pressed, the capture overlay appears on the primary monitor.

#### Capture Overlay

- Transparent, full-screen `BrowserWindow` covering the **primary monitor only**.
- Simple crosshair cursor with a dashed rectangle drawn as the user drags to select a region.
- No screen dimming, no dimension labels — keep it minimal. (Boundary auto-detection will be added in a future phase.)
- Pressing `Escape` dismisses the overlay without capturing.

#### After Capture — Floating Thumbnail Previews (CleanShot X-style)

- On capture, the screenshot is **immediately saved to the library** (uploaded via Uploadthing, AI analysis triggered in background).
- A small floating thumbnail preview appears in the **bottom-left corner** of the screen.
- On hover, a **"Cancel upload"** button appears (removes the capture from the library and dismisses the thumbnail).
- Thumbnails **auto-dismiss after ~5 seconds** if not interacted with.
- Multiple captures **stack vertically upward** from the bottom-left.
- After **3 visible thumbnails**, older ones collapse (e.g., a "+N more" indicator or simply fade out).

#### Preferences Window

- Accessible from the Electron tray menu or app menu.
- MVP setting: **capture hotkey** (rebindable).
- Built as a standalone `BrowserWindow` with a simple form — designed to accommodate more settings in future phases.

**Verify:** Open any app on your Mac. Press the capture hotkey. Overlay appears. Drag to select a region. Screenshot is captured, uploaded, AI-tagged, and appears in your library — all without leaving the app you were in. A floating thumbnail appears bottom-left and auto-dismisses after 5 seconds. Open Preferences, change the hotkey, confirm the new hotkey works.

---

_This document should be updated as architecture evolves. See `Product.md` for product strategy and feature roadmap._
