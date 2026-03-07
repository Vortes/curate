import { z } from "zod"
import { TRPCError } from "@trpc/server"
import OpenAI from "openai"
import { createTRPCRouter, protectedProcedure } from "../trpc"

const MUTED_COLORS = [
	"#8B9DC3", // muted blue
	"#9DB8A4", // muted green
	"#C3A98B", // muted orange
	"#B8A9C9", // muted purple
	"#C9A9A9", // muted red
	"#A9C3C9", // muted teal
	"#C9C3A9", // muted yellow
	"#B8B8A9", // muted gray-green
	"#C9B8A9", // muted peach
	"#A9B8C9", // muted slate
]

function randomMutedColor(): string {
	return MUTED_COLORS[Math.floor(Math.random() * MUTED_COLORS.length)]!
}

const BRIEF_PROMPT = `You are a design reverse-engineer. You are given a collection of screenshots that represent a user's design taste and desired aesthetic. Some screenshots are UI references (actual app screens). Others are aesthetic/mood references — abstract patterns, textures, graphic design, illustrations, or visual compositions that communicate the PERSONALITY and CHARACTER the user wants, not specific UI components.

Your job is to produce a design brief that captures BOTH the technical specs AND the visual personality, so a developer using an AI coding tool can build something that genuinely feels like these references — not a generic dark-mode template that happens to use the right colors.

---

# PART 1: TECHNICAL SPECS

Extract exact, implementation-level values from the UI screenshots. Give values a developer can copy-paste into CSS or Tailwind config.

## Color Palette
Extract every distinct color. Provide exact hex codes.
- Background colors (page, card, section backgrounds)
- Text colors (headings, body, muted/secondary text)
- Accent/brand colors (buttons, links, highlights)
- Border/divider colors
- State colors (hover, active, disabled) if visible

## Typography
- Font families (identify the exact typeface or closest match — e.g., "Inter", "SF Pro", "Geist")
- Font sizes in px for: headings (h1-h3), body text, small/caption text, labels
- Font weights used (e.g., 400, 500, 600, 700)
- Line-height values
- Letter-spacing if notable

## Spacing & Layout
- Base spacing unit (e.g., 4px, 8px grid)
- Padding values observed on cards, sections, containers (in px)
- Gap/margin values between elements
- Content max-width
- Grid or flex patterns (e.g., "3-column grid with 24px gap", "single column centered at 680px max-width")

## Component Patterns
For each distinct component type you observe (cards, buttons, inputs, navbars, sidebars, modals, etc.):
- border-radius in px
- box-shadow (full CSS value)
- border (width, style, color)
- padding
- background treatment
- Any other distinguishing CSS properties

## Visual Effects
- Shadow definitions (exact CSS box-shadow values)
- Gradient definitions if present (exact CSS gradient values)
- Backdrop blur values if present
- Opacity values used

---

# PART 2: DESIGN PERSONALITY & DECORATIVE LANGUAGE

This is what separates a human-designed UI from a generic AI-generated one. Analyze ALL screenshots — especially abstract, graphic, or mood-reference images — and extract the visual personality.

## Decorative Vocabulary
What recurring visual motifs, patterns, or textures appear across the collection? Describe each one with enough specificity to implement it in CSS/SVG:
- Geometric patterns (dot grids, line patterns, crosshatches — specify dot size, spacing, opacity, color)
- Background textures (noise, grain, gradients, pattern overlays — describe how to implement each)
- Graphic elements (circles, lines, shapes used as decoration — specify sizes, stroke widths, positioning approach)
- Illustrative elements (icons, drawings, visual metaphors — describe the style and where they appear)

For each motif, provide a concrete implementation instruction. Not "use geometric patterns" but "add a dot grid background using 3px circles at 32px intervals, #ffffff at 6% opacity, on dark section backgrounds."

## Visual Rhythm & Composition
- Scale relationships: Are there bold size contrasts (e.g., oversized headlines against fine-detail body text)? Or is the scale uniform?
- Density: Is the layout spacious with lots of breathing room, or dense and information-rich?
- Repetition patterns: What elements repeat to create visual rhythm? (e.g., evenly spaced cards, repeating icon rows, grid-based layouts)
- Asymmetry vs. symmetry: Does the design favor centered/balanced layouts or intentional asymmetry?

## Texture & Surface Quality
- Do surfaces feel flat, or do they have depth (layered cards, subtle shadows, elevation)?
- Is there visual noise/grain, or are surfaces perfectly smooth?
- Are borders hard and defined, or soft/blurred?
- How do elements relate to their background — do they float above it, sit flush, or blend into it?

## Motion & Energy
Based on the static screenshots, what kind of motion would feel natural?
- Smooth and slow vs. snappy and quick
- Subtle micro-interactions vs. bold transitions
- Suggested animation patterns (e.g., "elements should fade in with slight upward drift, 200ms ease-out")

## Personality in One Paragraph
Write a short paragraph that captures the SOUL of this collection — not in generic marketing language, but in specific, implementable terms. Example: "This design language combines a dark, technical foundation (#0a0a0b backgrounds) with precise geometric accents — dot grids at intersections, thin 1px rules as dividers, and circular motifs that echo the abstract pattern references. Typography is sharp and high-contrast (white on near-black), with oversized bold headlines (48-64px, weight 700) creating dramatic scale contrast against 14px body text. The overall feeling is engineered precision — like a well-designed developer tool that takes its visual craft seriously. Decorative elements should feel mathematical, not organic."

---

# PART 3: CONVERGENCE & IMPLEMENTATION GUIDE

## Convergence & Divergence
- List design choices that are CONSISTENT across all screenshots (high-confidence specs)
- List areas where screenshots CONFLICT — present both options

## Implementation Checklist
Write a concrete, ordered list of instructions a developer should follow to implement this design system. Combine the technical specs and personality into actionable steps. Example:
1. "Set page background to #0a0a0b, card backgrounds to #141416 with 1px solid #1e1e22 borders"
2. "Use Inter font family, 14px/1.6 body, 48px/1.1 weight-700 for hero headings"
3. "Add a dot grid background pattern: 3px circles, 32px spacing, rgba(255,255,255,0.04), applied to hero sections and empty states"
4. "Cards: 12px border-radius, no box-shadow, 1px border #1e1e22, padding 24px"
5. "Accent color #00e5a0 for primary CTAs, interactive elements, and status indicators"
...and so on.

Remember: Give EXACT VALUES for technical specs. Say "border-radius: 12px" not "rounded corners". Say "#1a1a2e" not "dark background". For personality elements, be specific enough that a developer could implement them without seeing the original screenshots.`

export const collectionRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.user.findUnique({
			where: { clerkId: ctx.userId },
		})
		if (!user) return []

		return ctx.db.collection.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			include: { _count: { select: { captures: true } } },
		})
	}),

	byId: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return null

			return ctx.db.collection.findFirst({
				where: { id: input.id, userId: user.id },
				include: {
					captures: {
						orderBy: { position: "asc" },
						include: { capture: true },
					},
				},
			})
		}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return null

			return ctx.db.collection.create({
				data: {
					name: input.name,
					color: randomMutedColor(),
					userId: user.id,
				},
			})
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return null

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.id, userId: user.id },
			})
			if (!collection) return null

			return ctx.db.collection.update({
				where: { id: collection.id },
				data: {
					...(input.name !== undefined && { name: input.name }),
					...(input.description !== undefined && {
						description: input.description,
					}),
				},
			})
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return { success: false }

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.id, userId: user.id },
			})
			if (!collection) return { success: false }

			await ctx.db.collection.delete({
				where: { id: collection.id },
			})
			return { success: true }
		}),

	addCaptures: protectedProcedure
		.input(
			z.object({
				collectionId: z.string(),
				captureIds: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return { success: false }

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.collectionId, userId: user.id },
			})
			if (!collection) return { success: false }

			const maxPositionRow = await ctx.db.collectionCapture.findFirst({
				where: { collectionId: input.collectionId },
				orderBy: { position: "desc" },
				select: { position: true },
			})
			const basePosition = (maxPositionRow?.position ?? -1) + 1

			await ctx.db.collectionCapture.createMany({
				data: input.captureIds.map((captureId, index) => ({
					collectionId: input.collectionId,
					captureId,
					position: basePosition + index,
				})),
				skipDuplicates: true,
			})

			return { success: true }
		}),

	removeCaptures: protectedProcedure
		.input(
			z.object({
				collectionId: z.string(),
				captureIds: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return { success: false }

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.collectionId, userId: user.id },
			})
			if (!collection) return { success: false }

			await ctx.db.collectionCapture.deleteMany({
				where: {
					collectionId: input.collectionId,
					captureId: { in: input.captureIds },
				},
			})

			return { success: true }
		}),

	captureCollections: protectedProcedure
		.input(z.object({ captureIds: z.array(z.string()) }))
		.query(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return {}

			const rows = await ctx.db.collectionCapture.findMany({
				where: {
					captureId: { in: input.captureIds },
					collection: { userId: user.id },
				},
				select: { collectionId: true, captureId: true },
			})

			// Group by collectionId
			const result: Record<string, string[]> = {}
			for (const row of rows) {
				if (!result[row.collectionId]) result[row.collectionId] = []
				result[row.collectionId]!.push(row.captureId)
			}
			return result
		}),

	reorder: protectedProcedure
		.input(
			z.object({
				collectionId: z.string(),
				orderedCaptureIds: z.array(z.string()),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) return { success: false }

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.collectionId, userId: user.id },
			})
			if (!collection) return { success: false }

			await ctx.db.$transaction(
				input.orderedCaptureIds.map((captureId, index) =>
					ctx.db.collectionCapture.updateMany({
						where: { collectionId: input.collectionId, captureId },
						data: { position: index },
					}),
				),
			)

			return { success: true }
		}),

	generateBrief: protectedProcedure
		.input(z.object({ collectionId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db.user.findUnique({
				where: { clerkId: ctx.userId },
			})
			if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

			const collection = await ctx.db.collection.findFirst({
				where: { id: input.collectionId, userId: user.id },
				include: {
					captures: {
						orderBy: { position: "asc" },
						include: { capture: true },
					},
				},
			})
			if (!collection) throw new TRPCError({ code: "NOT_FOUND" })

			const imageUrls = collection.captures
				.map((row) => row.capture.imageUrl)
				.filter(Boolean)

			if (imageUrls.length === 0) return { brief: "" }

			const apiKey = process.env.OPENAI_API_KEY
			if (!apiKey)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "OpenAI API key not configured",
				})

			const client = new OpenAI({ apiKey })

			try {
				const response = await client.chat.completions.create({
					model: "gpt-4o",
					max_tokens: 4000,
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: BRIEF_PROMPT },
								...imageUrls.map((url) => ({
									type: "image_url" as const,
									image_url: { url },
								})),
							],
						},
					],
				})

				const brief = response.choices[0]?.message?.content ?? ""
				return { brief }
			} catch (error) {
				console.error("[generateBrief] OpenAI call failed:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to generate design brief",
				})
			}
		}),
})
