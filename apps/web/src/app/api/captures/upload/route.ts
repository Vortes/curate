import { auth } from "@clerk/nextjs/server";
import { UTApi } from "uploadthing/server";
import { db } from "@synthesis/db";
import {
  analyzeCapture,
  generateEmbedding,
  uploadDescription,
} from "@synthesis/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return Response.json(
        { error: "No image provided" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Upload image to Uploadthing
    const utapi = new UTApi();
    const uploadResult = await utapi.uploadFiles(file);
    if (!uploadResult.data?.ufsUrl) {
      return Response.json(
        { error: "Upload failed" },
        { status: 500, headers: corsHeaders }
      );
    }

    const imageUrl = uploadResult.data.ufsUrl;

    // Create capture record
    const capture = await db.capture.create({
      data: {
        userId: user.id,
        imageUrl,
      },
    });

    // Fire-and-forget: analyze + embed
    (async () => {
      try {
        const description = await analyzeCapture(imageUrl);
        if (!description) return;

        const descriptionUrl = await uploadDescription(
          description,
          capture.id
        );
        const embedding = await generateEmbedding(description);

        if (!embedding) {
          await db.capture.update({
            where: { id: capture.id },
            data: { descriptionUrl, analyzedAt: new Date() },
          });
          return;
        }

        const vectorStr = `[${embedding.join(",")}]`;
        await db.$executeRawUnsafe(
          `UPDATE "Capture" SET "descriptionUrl" = $1, "embedding" = $2::vector, "analyzedAt" = NOW() WHERE "id" = $3`,
          descriptionUrl,
          vectorStr,
          capture.id
        );
      } catch (err) {
        console.error("[upload] Background analysis failed:", err);
      }
    })();

    return Response.json(
      { id: capture.id, imageUrl },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("[upload] Error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
