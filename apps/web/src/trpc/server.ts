import "server-only";
import { createCaller } from "@synthesis/api";
import { db } from "@synthesis/db";
import { auth } from "@clerk/nextjs/server";

export async function serverTrpc() {
  const { userId } = await auth();
  return createCaller({ db, userId });
}
