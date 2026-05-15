/// <reference types="vitest/config" />
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    // Cap-warning at 600KB after the split; the remaining "vendor" bundle
    // bumps near it but doesn't really exceed it once gzipped.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Split rarely-changing third-party code into separate chunks so the
        // browser cache survives our app deploys. Each visitor downloads
        // React/Router/etc. once and reuses it across releases.
        manualChunks: (id: string) => {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]@sentry[\\/]/.test(id)) return "vendor-sentry";
          if (/[\\/]@radix-ui[\\/]/.test(id)) return "vendor-radix";
          if (/[\\/](i18next|react-i18next)[\\/]/.test(id)) return "vendor-i18n";
          if (/[\\/](react|react-dom|react-router|react-router-dom|react-helmet-async|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: "rs-recruiting",
            project: "rs-recruiting-frontend",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: process.env.VITE_RELEASE },
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/robots.txt": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
