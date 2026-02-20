import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@synthesis/api";
import { db } from "@synthesis/db";
import { auth } from "@clerk/nextjs/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const { userId } = await auth();
      return { db, userId };
    },
    responseMeta: () => ({ headers: corsHeaders }),
    onError: ({ error, path }) => {
      console.error(`tRPC error on '${path}':`, error.message);
    },
  });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export { handler as GET, handler as POST };
