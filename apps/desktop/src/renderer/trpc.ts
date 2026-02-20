import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@synthesis/api";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();
