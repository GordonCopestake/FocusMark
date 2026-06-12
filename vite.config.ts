import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

const host = process.env.TAURI_DEV_HOST || "0.0.0.0";

export default defineConfig(async () => ({
  clearScreen: false,
  plugins: [
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
  server: {
    port: 1420,
    strictPort: true,
    host,
    hmr: {
      protocol: "ws",
      host: "0.0.0.0",
      port: 1421,
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
