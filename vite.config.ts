import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Declared locally so the config stays typed without pulling in @types/node.
declare const process: { env: Record<string, string | undefined> };

// Must track server.port in backend/src/main/resources/application.yml. Set
// BACKEND_URL to override when the backend runs somewhere else.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8081";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
