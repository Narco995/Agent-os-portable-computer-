import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// PORT is only required for dev/preview server — not during `vite build`.
const isBuild = process.argv.includes("build");
const rawPort = process.env.PORT ?? (isBuild ? "3000" : undefined);

if (!isBuild && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort ?? 3000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH defaults to "/" when not set (Netlify, Railway, local)
const basePath = process.env.BASE_PATH ?? "/";

// Only load Replit plugins when actually running on Replit
const isReplit = process.env.REPL_ID !== undefined;

const replitPlugins = isReplit && !isBuild
  ? await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
      import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
      ),
      import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
    ])
  : [];

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), ...replitPlugins],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? 8080}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
