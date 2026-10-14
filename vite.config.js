import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { guideExcerptsPlugin } from "./scripts/guide-excerpts.js";

export default defineConfig({
  plugins: [react(), guideExcerptsPlugin()],
  server: {
    proxy: {
      // Keep the browser's Host header so the API's same-origin check sees localhost:5173.
      "/api": { target: "http://localhost:8787", changeOrigin: false },
    },
  },
});
