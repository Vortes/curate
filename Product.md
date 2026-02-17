# SnapStack — Product Strategy

> Your design library should build itself.

---

## The Insight

Every designer has the same dirty secret: a graveyard of inspiration. A Screenshots folder with 2,000 unsorted images. A dozen Pinterest boards they never revisit. Bookmarks from three browsers across two machines. Half-remembered references from apps they used once six months ago.

The problem isn't finding inspiration — it's that the moment between seeing something great and needing it later is where everything falls apart. You see a brilliant onboarding flow on a competitor's app. You think "I should save this." You screenshot it, maybe two or three screens. It lands in your camera roll or Downloads folder. You never see it again.

When it's time to actually design something, you start from scratch. You Google "best onboarding flows 2025." You open Mobbin and scroll. You ask a colleague, "have you seen any good examples of..." You rebuild context you already had, from an experience you already lived through.

**SnapStack exists because the best design references are the ones you personally encountered, in context, while using real products** — not curated galleries of someone else's screenshots.

---

## What SnapStack Is

SnapStack is a desktop tool for designers that captures UI components and user flows from any application — web or native — and organizes them into a personal, AI-sorted reference library.

It works like this:

1. You're browsing a website or using any Mac app
2. You hit a keyboard shortcut
3. An overlay appears — as you hover, it detects and highlights individual UI components (a button group, a card, a navigation bar, a modal)
4. You click to capture that component, or drag to select a custom region
5. It's instantly saved to your library
6. AI analyzes the screenshot and tags it: component type, color palette, typography, platform, visual style
7. When you need a reference later, you search your own collection — by component, by color, by flow, by project

There's also a "Record Flow" mode: you tell SnapStack you're about to walk through something (an onboarding sequence, a checkout, an account setup), and it automatically screenshots each distinct screen as you navigate. When you stop, it stitches them into an ordered flow you can step through later.

The key difference from everything else: **this is your library, built from your experience, organized by AI, available when you need it.**

---

## Who It's For

### Primary: Product Designers (IC level)

Designers at startups and mid-size companies who are responsible for end-to-end product design. They do their own competitive research, build their own reference collections, and are constantly encountering UI patterns they want to remember. They use Figma daily, probably have a Mobbin subscription, and have tried at least two different screenshot/bookmarking tools without sticking with any of them.

**Their current workflow:**

- See something → screenshot (⌘+Shift+4) → Desktop/Downloads folder → forget
- Need a reference → open Mobbin/Dribbble → scroll → settle for "close enough"
- Start new project → rebuild research from scratch every time

**What they actually want:**

- A library that grows passively as they browse
- To capture a specific component, not a whole page
- To find "that modal I saw on Stripe's dashboard three weeks ago" in seconds
- To show a developer or stakeholder "I want it to work like this" with a real example

### Secondary: Design Leads & Managers

People who oversee design teams and want to maintain shared reference libraries. They care about design consistency and want their team to start from established patterns rather than reinventing solutions. For them, SnapStack becomes a shared team brain — everyone captures references, everyone benefits.

### Tertiary: Founders & Product Managers

Non-designers who frequently encounter apps and interfaces they admire, and want a way to communicate "make it feel like this" to their design and engineering teams without needing to learn Figma.

---

## The Competitive Landscape

The design reference space has several players, but they all solve a piece of the problem, not the whole thing. This creates the gap SnapStack fills.

### Mobbin — The Curated Library

Mobbin is the market leader in design reference, with 300,000+ screens from 1,000+ apps. It's excellent for browsing what exists. Pricing runs ~$130/year for individuals, up to ~$4,000 for enterprise teams.

**What Mobbin does well:** Comprehensive curated database, excellent filtering (by component, flow type, industry), Figma integration, team collections.

**What Mobbin doesn't do:** Mobbin is a read-only catalog of someone else's curation. You can't capture your own finds. You can't clip a component from a random website you stumbled on. You can't record a live flow you're personally walking through. You're limited to what their team has cataloged. They do allow screenshot uploads to collections, but only iOS/Android screenshots — and there's no AI analysis, no component detection, no flow recording.

**SnapStack's relationship to Mobbin:** Not a direct competitor. Mobbin is a reference encyclopedia. SnapStack is your personal notebook. Many users will use both — Mobbin for broad research, SnapStack for personal capture and retrieval. Over time, SnapStack could become a replacement as personal libraries grow rich enough to be self-sufficient.

### Eagle — The Local Asset Manager

Eagle is a $29.95 one-time purchase desktop app for organizing all visual assets. Designers love it. It has a browser extension, tagging, color filtering, smart folders, and supports 90+ file formats.

**What Eagle does well:** Excellent organization, one-time purchase, works offline, handles any file type, powerful filtering, great for managing existing files.

**What Eagle doesn't do:** Eagle is a general-purpose file manager. It doesn't understand UI. It can't detect components. It can't auto-tag a screenshot as "navbar" or "onboarding step 3 of 5." It has no AI analysis. It can't record flows. It treats a UI screenshot the same as a photo of a sunset.

**SnapStack's relationship to Eagle:** SnapStack is Eagle rebuilt specifically for UI/UX, with AI intelligence about what it's looking at. Eagle is for people who organize everything. SnapStack is for designers who want their UI references to organize themselves.

### Visily — The Screenshot-to-Wireframe Tool

Visily captures screenshots and converts them into editable wireframes. It has a Chrome extension for capturing full pages, selected areas, or specific UI elements.

**What Visily does well:** Component-level capture, Chrome extension, converts screenshots to editable designs, free to use.

**What Visily doesn't do:** Visily is a wireframing tool, not a reference library. Every screenshot is a starting point for a new design, not a reference to revisit. There's no AI tagging, no searchable library, no flow recording, no organization by component type. It also only works in browsers — not native apps.

**SnapStack's relationship to Visily:** SnapStack takes Visily's component-level capture concept and combines it with Eagle's organizational power and Mobbin's design-aware categorization — then adds AI to glue it together.

### Bookmarkify / Cosmos / Kosmik — Visual Bookmark Managers

These tools save web pages visually with screenshots and let you tag and organize them. Kosmik has AI auto-tagging by color and theme.

**What they don't do:** They save entire pages, not components. They don't understand UI patterns. They're general-purpose inspiration tools, not designer-specific. They work in browsers only.

### The Actual Competitor: The Screenshots Folder

Honestly, this is what SnapStack is really competing against. The unspoken truth is that most designers' "reference system" is ⌘+Shift+4 into a folder they never open again. The bar to beat isn't Mobbin — it's the path of least resistance. SnapStack has to be faster and easier than taking a screenshot and doing nothing with it.

---

## Why Now

Three things make this moment right:

**1. AI Vision models are finally good enough.** Two years ago, you couldn't reliably send a UI screenshot to an AI and get back structured data about component types, color palettes, typography, and layout patterns. Now you can. Claude, GPT-4V, and Gemini all handle this well. This is the enabling technology that makes auto-tagging possible — the thing that turns a dumb screenshot folder into an intelligent design library.

**2. Designers are drowning in tools but starving for workflow integration.** The average designer's toolchain — Figma, Notion, Slack, Mobbin, Loom, Linear — involves constant context-switching. None of these tools are present at the moment of inspiration (casually browsing a competitor's app). SnapStack sits at the OS level, available everywhere, capturing the moment.

**3. The shift from "find inspiration" to "recall experience."** Mobbin proved there's a massive market for design reference ($130/yr/user). But the next evolution isn't a bigger library curated by someone else — it's a personal library curated by your own experience, made searchable by AI. The same shift that went from "use stock photos" to "generate your own images" is happening in reference: from "browse someone's catalog" to "search your own memory."

---

## Product Principles

### 1. Capture should be invisible

If saving a reference takes more than 2 seconds and one action, the feature fails. The keyboard shortcut → hover → click workflow must feel as natural as ⌘+C. The entire point is to not interrupt whatever you were doing.

### 2. Organization should be automatic

The moment you have to manually tag something is the moment your library starts to die. AI does the heavy lifting — component type, colors, typography, platform, style. Users can refine and add custom tags, but the default should be good enough to never require it.

### 3. Retrieval should feel like memory

When you think "that pricing table I saw on Linear's site," you should be able to type "pricing table" or "Linear" or even search by the blue color you vaguely remember and find it. The search should work the way your brain does — fuzzy, associative, visual.

### 4. The library gets more valuable over time

Unlike a bookmarking tool that gets cluttered, SnapStack should get more useful the more you use it. More captures = better AI understanding of your taste = better suggestions = a richer personal design system. Your library is an asset, not a junk drawer.

### 5. Desktop-native, not browser-bound

A Chrome extension is table stakes. But designers also use native apps — Slack, Discord, Figma, Sketch, native Mac apps, even competitors' Electron apps. The capture layer must work everywhere, which means it lives at the OS level.

---

## The Product in Three Phases

### Phase 1 — The Smart Clipboard (Months 1–3)

**Goal:** Prove that AI-tagged screenshot capture is valuable enough to change behavior.

Build a Mac desktop app (Electron) with:

- Global keyboard shortcut to activate capture mode
- Region selection (drag to capture any area of screen)
- Clipboard paste (⌘+V any screenshot directly into the library)
- AI auto-analysis on every capture (component type, colors, fonts, platform, tags)
- Library view with filtering by component type, platform, color, date
- Full-text search across AI-detected text and tags
- Basic collections for grouping captures by project

**What this validates:** Will designers actually use a capture tool if it's fast enough and auto-organizes? Is the AI tagging accurate and useful enough to replace manual organization?

**Success metrics:**

- 500 beta users capturing 10+ screenshots/week
- 70%+ of users never manually editing AI-generated tags (they're good enough)
- Users returning to search their library at least once per week
- NPS > 50

### Phase 2 — The Design Memory (Months 4–8)

**Goal:** Make the library intelligent enough to feel like a design partner.

Add:

- Smart element detection on hover (using macOS Accessibility APIs for native apps, DOM inspection for web via a companion browser extension)
- "Record Flow" mode — press record, navigate an app, each screen is auto-captured in sequence and stitched into a flow
- Flow viewer with step-by-step playback and per-step annotations
- Color-based visual search (click any color in the library → find screenshots with similar palettes)
- "Similar to this" — select any screenshot, find visually similar ones in your library
- Figma plugin — browse your SnapStack library inside Figma and drag references directly onto your canvas
- Shareable collections — generate a public link to share a curated set of references

**What this validates:** Does flow recording change research behavior? Does the Figma integration make SnapStack part of the active design workflow (not just passive collection)?

**Success metrics:**

- 50% of active users have created at least one flow
- Average library size > 200 captures
- 30%+ of sessions originate from the Figma plugin
- Paid conversion rate > 5% from free tier

### Phase 3 — The Team Brain (Months 9–14)

**Goal:** Expand from individual tool to team infrastructure.

Add:

- Team workspaces with shared libraries
- Merge personal captures into team collections
- AI-powered natural language search ("show me onboarding flows with dark backgrounds and gradient CTAs")
- Design system detection (identify if a screenshot uses Material Design, Ant Design, Tailwind, custom system)
- Component comparison — put two captured components side by side with metadata diff
- "Weekly digest" — AI surfaces interesting patterns across your recent captures
- API for integrating with internal tools
- Cross-platform capture (Windows support)

**What this validates:** Will teams pay meaningfully more for shared context? Can SnapStack become a line item in a design team's tooling budget?

**Success metrics:**

- 100+ paying team accounts
- Team plan ARPU > $50/seat/month
- Library used as reference in design reviews (observable in user interviews)
- Retention: 80%+ monthly active at 6 months

---

## Business Model

### Pricing Structure

**Free tier — The Hook**

- Unlimited captures (region select + clipboard paste only, no smart detection)
- AI auto-tagging on first 50 captures/month
- Basic library with search and filters
- 1 collection

This is generous enough to be genuinely useful. The free tier builds the habit of capturing. The limit on AI analysis creates a natural upgrade moment: your library is growing, but new captures aren't being auto-tagged, so finding things gets harder. The solution is obvious.

**Pro — $12/month (or $99/year) — The Individual**

- Everything in Free
- Unlimited AI analysis
- Smart element detection (hover-to-capture)
- Record Flow mode
- Unlimited collections
- Color search and "Similar to this"
- Figma plugin
- Shareable collection links

This price point is deliberate. Mobbin is ~$130/year. Eagle is $30 one-time. SnapStack at $99/year sits right between "impulse purchase" and "need to justify" — low enough that individual designers will pay out of pocket if their company won't, high enough to build a real business.

**Team — $20/seat/month (minimum 3 seats)**

- Everything in Pro
- Shared team library
- Team collections with permissions
- Admin dashboard
- SSO and team billing
- Priority AI processing
- API access

**Enterprise — Custom pricing**

- Everything in Team
- Custom AI model fine-tuning (learns your design system's component taxonomy)
- On-premise deployment option
- Dedicated support
- SLA guarantees

### Revenue Projections (Conservative)

| Metric          | Year 1      | Year 2       | Year 3         |
| --------------- | ----------- | ------------ | -------------- |
| Free users      | 10,000      | 40,000       | 100,000        |
| Pro subscribers | 500         | 3,000        | 12,000         |
| Team seats      | 100         | 1,500        | 8,000          |
| Pro ARR         | $49,500     | $297,000     | $1,188,000     |
| Team ARR        | $24,000     | $360,000     | $1,920,000     |
| **Total ARR**   | **$73,500** | **$657,000** | **$3,108,000** |

### Unit Economics

- AI analysis cost per screenshot: ~$0.01–0.03 (Claude Vision API)
- Storage cost per user: ~$0.50/month at 500 screenshots
- Free tier cost per user: negligible (50 AI analyses/month = ~$1/month)
- Pro gross margin: ~85%
- Team gross margin: ~80%

---

## Open Questions

1. **Mac-first or cross-platform from day one?** Mac-first reduces scope and is where most designers are. But excluding Windows loses a segment. Recommendation: Mac-first, Windows in Phase 3.

2. **Electron or native Swift?** Electron is faster to build and aligns with the Next.js/React stack. Native Swift would be more performant for the capture overlay and system integration. Recommendation: Electron for Phase 1 (speed to market), evaluate native rewrite for Phase 3 if performance is a bottleneck.

3. **Should the free tier require an account?** Frictionless onboarding (no account, local-only) maximizes adoption but eliminates cloud features. Account-required enables sync and analytics but adds friction. Recommendation: Local-first, account optional for sync/cloud backup, required for AI analysis.

4. **How to handle privacy of captured content?** Users may capture screenshots containing sensitive information (unreleased products, confidential dashboards). Recommendation: Local-first storage by default. AI analysis can be done with clear opt-in. Team shared libraries require explicit sharing actions. Never train on user data without consent.

5. **Public collections as a growth lever?** If users share collections publicly, SnapStack could become a bottom-up alternative to Mobbin. But this conflicts with the "personal reference" positioning. Recommendation: Enable sharing but don't make it the core identity. SnapStack is your library first, a community second.

---

_This document defines what SnapStack is, who it's for, and why it matters. It should be referenced when making product decisions, prioritizing features, and evaluating tradeoffs. Update it as we learn from users._
