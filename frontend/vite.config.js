import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Built assets are served by FastAPI from the site root (Azure App Service).
// Set BASE_PATH (e.g. "/Chatbot-/") only when publishing to a sub-path such as GitHub Pages.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.BASE_PATH || "/",
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
