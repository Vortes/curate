import { z } from "zod";
import { UTApi } from "uploadthing/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { analyzeCapture } from "../lib/analyze";

const utapi = new UTApi();

export const captureRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) return [];

    return ctx.db.capture.findMany({
      where: { userId: user.id },
      orderBy: { libraryPosition: "asc" },
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
        sourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { clerkId: ctx.userId },
      });

      await ctx.db.capture.updateMany({
        where: { userId: user.id },
        data: { libraryPosition: { increment: 1 } },
      });

      return ctx.db.capture.create({
        data: {
          userId: user.id,
          imageUrl: input.imageUrl,
          sourceUrl: input.sourceUrl,
          libraryPosition: 0,
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

      const capture = await ctx.db.capture.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!capture) return { success: false };

      // Extract file key from Uploadthing URL and delete the file
      const fileKey = capture.imageUrl.split("/").pop();
      if (fileKey) {
        await utapi.deleteFiles(fileKey).catch(() => {
          // Non-blocking — DB record still gets deleted
        });
      }

      await ctx.db.capture.delete({
        where: { id: capture.id },
      });
      return { success: true };
    }),

  analyze: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      const capture = await ctx.db.capture.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!capture) return { success: false };

      const tags = await analyzeCapture(capture.imageUrl);
      if (!tags) return { success: false };

      await ctx.db.capture.update({
        where: { id: capture.id },
        data: {
          tags,
          analyzedAt: new Date(),
        },
      });

      return { success: true };
    }),

  reorderLibrary: protectedProcedure
    .input(z.object({ orderedCaptureIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      await ctx.db.$transaction(
        input.orderedCaptureIds.map((id, index) =>
          ctx.db.capture.updateMany({
            where: { id, userId: user.id },
            data: { libraryPosition: index },
          })
        )
      );

      return { success: true };
    }),

  reanalyzeAll: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) return { processed: 0, failed: 0 };

    const captures = await ctx.db.capture.findMany({
      where: { userId: user.id, tags: { isEmpty: true } },
    });

    let processed = 0;
    let failed = 0;

    for (const capture of captures) {
      const tags = await analyzeCapture(capture.imageUrl);
      if (!tags) {
        failed++;
        continue;
      }

      await ctx.db.capture.update({
        where: { id: capture.id },
        data: {
          tags,
          analyzedAt: new Date(),
        },
      });

      processed++;

      // Rate limit: 1.5 second delay between calls
      await new Promise((r) => setTimeout(r, 1500));
    }

    return { processed, failed };
  }),
});
