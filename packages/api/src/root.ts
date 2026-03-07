import { createTRPCRouter, createCallerFactory } from "./trpc";
import { userRouter } from "./routers/user";
import { captureRouter } from "./routers/capture";
import { collectionRouter } from "./routers/collection";

export const appRouter = createTRPCRouter({
  user: userRouter,
  capture: captureRouter,
  collection: collectionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
