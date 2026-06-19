import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    allowedHosts: true,

    proxy: {
      "/api": {
        target: "https://codewar-gt53.onrender.com",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "https://codewar-gt53.onrender.com",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});