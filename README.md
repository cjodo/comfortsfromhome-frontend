# Comforts From Home

One-page website for Comforts From Home, a hand-knitting business in Canmore, Alberta.

Built with [Astro](https://astro.build).

## Development

```sh
npm install
npm run dev       # local dev server with hot reload
npm run check     # type-check .astro files
npm run build     # type-check, then production build to dist/
npm run preview   # serve the production build locally
npm run format    # format with Prettier
npm run format:check
```

The dev server runs at http://localhost:4321/.

## Structure

- `src/pages/index.astro` — the page; assembles the sections
- `src/pages/404.astro` — not-found page
- `src/components/` — one component per section (Header, Hero, About, Work, Contact, Footer)
- `src/layouts/Layout.astro` — `<head>` (SEO, social preview, structured data), font and global styles
- `src/assets/` — photos; Astro resizes and converts them to WebP at build time
- `src/styles/global.css` — styles and color palette (CSS variables at the top)
- `public/` — static files copied as-is (favicon, apple-touch-icon)

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm run format:check`
2. `npm run build` (runs `astro check` first)
3. Warns (without failing) about leftover `TODO` / `Placeholder` / `example.com` content

Dependabot (`.github/dependabot.yml`) opens monthly PRs to update npm packages
and GitHub Actions; CI checks each one before you merge.

## Deployment (Railway)

Railway builds the `Dockerfile` (Node builds the site, Caddy serves `dist/`)
and redeploys on every push to `main`. Settings live in `railway.json`; the
server config (security headers, caching, 404 page) is in `Caddyfile`.

To test the production image locally:

```sh
docker build -t cfh . && docker run --rm -e PORT=8080 -p 8080:8080 cfh
```

The public URL used for canonical links, social previews and the sitemap comes
from Railway's generated domain. When adding a custom domain, set the
`SITE_URL` variable on the Railway service (e.g. `https://example.ca`).
