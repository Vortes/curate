import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const MUTED_COLORS = [
  "#8B9DC3", // muted blue
  "#9DB8A4", // muted green
  "#C3A98B", // muted orange
  "#B8A9C9", // muted purple
  "#C9A9A9", // muted red
  "#A9C3C9", // muted teal
  "#C9C3A9", // muted yellow
  "#B8B8A9", // muted gray-green
  "#C9B8A9", // muted peach
  "#A9B8C9", // muted slate
];

function randomMutedColor(): string {
  return MUTED_COLORS[Math.floor(Math.random() * MUTED_COLORS.length)]!;
}

export const collectionRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) return [];

    return ctx.db.collection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { captures: true } } },
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return null;

      return ctx.db.collection.findFirst({
        where: { id: input.id, userId: user.id },
        include: {
          captures: {
            orderBy: { position: "asc" },
            include: { capture: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return null;

      return ctx.db.collection.create({
        data: {
          name: input.name,
          color: randomMutedColor(),
          userId: user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return null;

      const collection = await ctx.db.collection.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!collection) return null;

      return ctx.db.collection.update({
        where: { id: collection.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
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

      const collection = await ctx.db.collection.findFirst({
        where: { id: input.id, userId: user.id },
      });
      if (!collection) return { success: false };

      await ctx.db.collection.delete({
        where: { id: collection.id },
      });
      return { success: true };
    }),

  addCaptures: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        captureIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      const collection = await ctx.db.collection.findFirst({
        where: { id: input.collectionId, userId: user.id },
      });
      if (!collection) return { success: false };

      const maxPositionRow = await ctx.db.collectionCapture.findFirst({
        where: { collectionId: input.collectionId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const basePosition = (maxPositionRow?.position ?? -1) + 1;

      await ctx.db.collectionCapture.createMany({
        data: input.captureIds.map((captureId, index) => ({
          collectionId: input.collectionId,
          captureId,
          position: basePosition + index,
        })),
        skipDuplicates: true,
      });

      return { success: true };
    }),

  removeCaptures: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        captureIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      const collection = await ctx.db.collection.findFirst({
        where: { id: input.collectionId, userId: user.id },
      });
      if (!collection) return { success: false };

      await ctx.db.collectionCapture.deleteMany({
        where: {
          collectionId: input.collectionId,
          captureId: { in: input.captureIds },
        },
      });

      return { success: true };
    }),

  captureCollections: protectedProcedure
    .input(z.object({ captureIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return {};

      const rows = await ctx.db.collectionCapture.findMany({
        where: {
          captureId: { in: input.captureIds },
          collection: { userId: user.id },
        },
        select: { collectionId: true, captureId: true },
      });

      // Group by collectionId
      const result: Record<string, string[]> = {};
      for (const row of rows) {
        if (!result[row.collectionId]) result[row.collectionId] = [];
        result[row.collectionId]!.push(row.captureId);
      }
      return result;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        orderedCaptureIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) return { success: false };

      const collection = await ctx.db.collection.findFirst({
        where: { id: input.collectionId, userId: user.id },
      });
      if (!collection) return { success: false };

      await ctx.db.$transaction(
        input.orderedCaptureIds.map((captureId, index) =>
          ctx.db.collectionCapture.updateMany({
            where: { collectionId: input.collectionId, captureId },
            data: { position: index },
          })
        )
      );

      return { success: true };
    }),
});
