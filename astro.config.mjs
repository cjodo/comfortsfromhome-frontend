// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://cjodo.github.io",
  // GitHub Pages serves the site from username.github.io/<repo>/. Only apply
  // that prefix in CI so the local dev server works at the root.
  // Remove if moving to a custom domain.
  base: process.env.GITHUB_ACTIONS ? "/comfortsfromhome-frontend" : "/",
});
