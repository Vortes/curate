import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const captureRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) return [];

    return ctx.db.capture.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return null;

      return ctx.db.capture.findFirst({
        where: { id: input.id, userId: user.id },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        tags: z.array(z.string()).default([]),
        sourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { clerkId: ctx.userId },
      });

      return ctx.db.capture.create({
        data: {
          userId: user.id,
          imageUrl: input.imageUrl,
          tags: input.tags,
          sourceUrl: input.sourceUrl,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      await ctx.db.capture.deleteMany({
        where: { id: input.id, userId: user.id },
      });
      return { success: true };
    }),
});
