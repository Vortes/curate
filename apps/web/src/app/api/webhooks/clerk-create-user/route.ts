import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@synthesis/db";
import type { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      return new Response("Missing webhook secret", { status: 500 });
    }

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Clerk webhook: missing svix headers");
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Clerk webhook: signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = evt.type;
    console.log("Clerk webhook received:", eventType);

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      if (!id || !primaryEmail) {
        console.error("Clerk webhook: missing user ID or email");
        return new Response("Missing user ID or email", { status: 400 });
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await db.user.upsert({
        where: { clerkId: id },
        create: { clerkId: id, email: primaryEmail, name },
        update: { email: primaryEmail, name },
      });

      console.log("Clerk webhook: upserted user", id, primaryEmail);
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (id) {
        await db.user.deleteMany({ where: { clerkId: id } });
        console.log("Clerk webhook: deleted user", id);
      }
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Clerk webhook: unhandled error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
