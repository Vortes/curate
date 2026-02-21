import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.VITE_WEB_URL": JSON.stringify(
      process.env.VITE_WEB_URL || "http://localhost:3000"
    ),
  },
});
