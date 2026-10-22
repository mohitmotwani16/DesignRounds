import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { guideExcerptsPlugin } from "./server/content/guide-excerpts.js";

export default defineConfig(({ mode }) => {
  // PostHog is reached through /ingest, as in production (vercel.json rewrites).
  const posthogHost = loadEnv(mode, process.cwd(), "VITE_").VITE_POSTHOG_HOST || "https://us.i.posthog.com";
  const posthogAssets = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");
  return {
    plugins: [react(), guideExcerptsPlugin()],
    server: {
      proxy: {
        // Keep the browser's Host header so the API's same-origin check sees localhost:5173.
        "/api": { target: "http://localhost:8787", changeOrigin: false },
        "/ingest/static": { target: posthogAssets, changeOrigin: true, rewrite: (path) => path.replace(/^\/ingest/, "") },
        "/ingest": { target: posthogHost, changeOrigin: true, rewrite: (path) => path.replace(/^\/ingest/, "") },
      },
    },
  };
});
