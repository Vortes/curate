import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DesktopCallbackPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/desktop-callback");
  }

  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 300,
  });

  redirect(`synthesis://auth?token=${signInToken.token}`);
}
