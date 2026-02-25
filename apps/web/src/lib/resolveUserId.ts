import { auth, verifyToken } from "@clerk/nextjs/server";

export async function resolveUserId(req: Request): Promise<string | null> {
  // Path 1: Clerk session (web clients — cookies/session JWT)
  const { userId } = await auth();
  if (userId) return userId;

  // Path 2: OAuth Bearer token (desktop client)
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub;
  } catch {
    return null;
  }
}
