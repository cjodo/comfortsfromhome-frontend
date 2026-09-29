# Comforts From Home

One-page website for Comforts From Home, a hand-knitting business in Canmore, Alberta.

Built with plain HTML/CSS/JS and [Vite](https://vite.dev).

## Development

```sh
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run format    # format with Prettier
```

## Structure

- `index.html` — the page content
- `src/style.css` — styles and color palette (CSS variables at the top)
- `src/main.js` — entry point (imports font + styles)
- `public/` — static files copied as-is (favicon, images)

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
