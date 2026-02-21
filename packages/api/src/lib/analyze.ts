import OpenAI from "openai"
import { UTApi } from "uploadthing/server"

function getClient() {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) return null
	return new OpenAI({ apiKey })
}

const VISION_PROMPT = `Describe this UI screenshot for a design reference library. Include:
- Screen type (login, dashboard, pricing, settings, etc.)
- Key UI components (buttons, forms, cards, modals, navigation, etc.)
- Layout structure (sidebar, grid, split view, etc.)
- Color palette and visual mood (dark, minimal, vibrant, etc.)
- Typography style (sans-serif, large headings, monospace, etc.)
- Notable design details (gradients, shadows, rounded corners, illustrations, etc.)

Be concise but thorough. Optimize for semantic search retrieval — someone should be able to find this screenshot by describing what they remember about it.`

export async function analyzeCapture(imageUrl: string): Promise<string | null> {
	const client = getClient()
	if (!client) return null

	try {
		const response = await client.chat.completions.create({
			model: "gpt-4o-mini",
			max_tokens: 500,
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: VISION_PROMPT },
						{ type: "image_url", image_url: { url: imageUrl } },
					],
				},
			],
		})

		return response.choices[0]?.message?.content ?? null
	} catch (error) {
		console.error("[analyze] Vision analysis failed:", error)
		return null
	}
}

export async function uploadDescription(
	text: string,
	captureId: string,
): Promise<string | null> {
	try {
		const utapi = new UTApi()
		const blob = new Blob([text], { type: "text/plain" })
		const file = new File([blob], `${captureId}.txt`, { type: "text/plain" })
		const response = await utapi.uploadFiles(file)
		return response.data?.ufsUrl ?? null
	} catch (error) {
		console.error("[analyze] Description upload failed:", error)
		return null
	}
}

export async function generateEmbedding(
	text: string,
): Promise<number[] | null> {
	const client = getClient()
	if (!client) return null

	try {
		const response = await client.embeddings.create({
			model: "text-embedding-3-small",
			input: text,
		})

		return response.data[0]?.embedding ?? null
	} catch (error) {
		console.error("[analyze] Embedding generation failed:", error)
		return null
	}
}
