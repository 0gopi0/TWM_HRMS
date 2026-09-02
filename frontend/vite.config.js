import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Dual-stack: Node's `localhost` is often [::1] only; IPv4-only bind breaks the other.
    host: "::",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:4000" },
      "/ready": { target: "http://127.0.0.1:4000" },
    },
  },
});
