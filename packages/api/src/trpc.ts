import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { db as prismaDb } from "@synthesis/db";

export type Context = {
  db: typeof prismaDb;
  userId: string | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
