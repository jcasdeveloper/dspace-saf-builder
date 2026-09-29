import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  build: {
    // Modern WebView2 is Chromium-based — no legacy polyfills needed
    target: "es2021",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: "react-vendor",
            },
            {
              test: /[\\/]node_modules[\\/](motion)[\\/]/,
              name: "motion",
            },
            {
              test: /[\\/]node_modules[\\/](@tauri-apps)[\\/]/,
              name: "tauri",
            },
          ],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
