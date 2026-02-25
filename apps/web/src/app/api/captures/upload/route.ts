import { UTApi } from "uploadthing/server";
import { resolveUserId } from "../../../../lib/resolveUserId";
import { db } from "@curate/db";
import { analyzeCapture } from "@curate/api";

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
    const userId = await resolveUserId(req);
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
    const sourceApp = formData.get("sourceApp");
    const sourceUrl = formData.get("sourceUrl");
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
        sourceApp: typeof sourceApp === "string" ? sourceApp : null,
        sourceUrl: typeof sourceUrl === "string" ? sourceUrl : null,
      },
    });

    // Fire-and-forget: analyze and store tags
    (async () => {
      try {
        const tags = await analyzeCapture(imageUrl);
        if (!tags) return;

        await db.capture.update({
          where: { id: capture.id },
          data: { tags, analyzedAt: new Date() },
        });
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
