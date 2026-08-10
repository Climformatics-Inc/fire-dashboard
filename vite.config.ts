import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // keep ONLY plotly isolated
          if (id.includes("plotly.js-basic-dist-min")) return "plotly";
          // let Vite/rollup split other deps (React, Leaflet, etc.)
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
