import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the build works on GitHub Pages
  // (username.github.io/repo/) or a custom domain without changes.
  base: "./",
  server: { open: true },
});
