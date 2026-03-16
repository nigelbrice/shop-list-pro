import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url"
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",

      includeAssets: ["icon-192.png", "icon-512.png"],

      manifest: {
        name: "Shopeeze",
        short_name: "Shopeeze",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      workbox: {
        // Take over immediately without waiting for tabs to close
        skipWaiting: true,
        clientsClaim: true,

        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],

        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60
              },
              backgroundSync: {
                name: "apiQueue",
                options: {
                  maxRetentionTime: 24 * 60
                }
              }
            }
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },

  root: path.resolve(__dirname, "client"),

  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },

  server: {
    fs: {
      strict: true
    }
  }
});