import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@curate/api";
import { db } from "@curate/db";
import { resolveUserId } from "../../../../lib/resolveUserId";

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
      const userId = await resolveUserId(req);
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
