# Comforts From Home

One-page website for Comforts From Home, a hand-knitting business in Canmore, Alberta.

Built with [Astro](https://astro.build).

## Development

```sh
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run format    # format with Prettier
```

Locally the site runs at http://localhost:4321/. On GitHub Pages it's served under
`/comfortsfromhome-frontend/` — that prefix is only applied in CI (see `base` in
`astro.config.mjs`).

## Structure

- `src/pages/index.astro` — the page; assembles the sections
- `src/components/` — one component per section (Header, Hero, About, Work, Contact, Footer)
- `src/layouts/Layout.astro` — `<head>`, font and global styles
- `src/styles/global.css` — styles and color palette (CSS variables at the top)
- `public/` — static files copied as-is (favicon)

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

If you move to a custom domain, update `site` and remove `base` in `astro.config.mjs`.
