import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  define: {
    "process.env.VITE_WEB_URL": JSON.stringify(
      mode === "production" ? "https://www.curate.is" : "http://localhost:3000"
    ),
    "process.env.CLERK_OAUTH_CLIENT_ID": JSON.stringify(
      process.env.CLERK_OAUTH_CLIENT_ID ?? ""
    ),
  },
  build: {
    rollupOptions: {
      external: [/\.node$/],
    },
  },
}));
