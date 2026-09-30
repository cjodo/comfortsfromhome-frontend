// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Public URL, used for canonical links, social previews and the sitemap.
// Set SITE_URL on Railway once a custom domain is added; until then the
// Railway-generated domain is used.
const site =
  process.env.SITE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:4321");

export default defineConfig({
  site,
  integrations: [sitemap()],
  // Single small stylesheet: inline it to avoid a render-blocking request.
  build: { inlineStylesheets: "always" },
});
