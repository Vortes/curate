import { createTRPCRouter, createCallerFactory } from "./trpc";
import { userRouter } from "./routers/user";
import { captureRouter } from "./routers/capture";

export const appRouter = createTRPCRouter({
  user: userRouter,
  capture: captureRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
