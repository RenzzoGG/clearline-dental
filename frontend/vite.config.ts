/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { routePreload } from "./route-preload";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      routePreload({
        "/": "src/features/site/LandingSections.tsx",
        "/book": "src/features/booking/BookingPage.tsx",
        "/login": "src/features/auth/LoginPage.tsx",
      }),
    ],
    build: {
      // dist/.vite/manifest.json maps source modules to chunks; scripts/check-budgets.mjs
      // uses it to measure the critical bundle and each route separately.
      manifest: true,
    },
    server: {
      port: 5173,
      // Dev only: the browser talks to one origin and Vite forwards /api to Django,
      // so no CORS is involved locally. Host header is kept (changeOrigin: false)
      // so Django sees "localhost", which is in ALLOWED_HOSTS.
      proxy: {
        "/api": { target: env.VITE_PROXY_TARGET || "http://localhost:8000", changeOrigin: false },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
