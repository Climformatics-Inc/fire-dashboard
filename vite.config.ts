import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/auth": "http://127.0.0.1:3001",
      "/plans": "http://127.0.0.1:3001",
      "/admin": "http://127.0.0.1:3001",
      "/checkout": "http://127.0.0.1:3001",
      // Local map-tile preview: set VITE_TILE_BASE=/tiles and serve the tile
      // builder's output dir on :8090 (see usa-gridmet-map-tiles README).
      "/tiles": {
        target: "http://127.0.0.1:8090",
        rewrite: (p) => p.replace(/^\/tiles/, ""),
      },
    },
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
