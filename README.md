# Comforts From Home

Website for Comforts From Home, a hand-knitting business in Canmore, Alberta.

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

## Adding photos

Photos live in one folder per category:

```
src/assets/gallery/
  toques/
  sweaters/
  home-goods/
```

1. Drop a photo (`.jpg`, `.jpeg`, `.png`, `.webp`) into the right folder. Big
   phone photos are fine: Astro resizes them and converts them to AVIF/WebP
   at build time.
2. Photos are shown in filename order, so prefix names with `01-`, `02-`… to
   control the order. The first photo is the category's cover on the homepage.
3. The filename becomes the image description for screen readers
   (`02-blue-cable-toque.jpg` → "Blue cable toque"). To write a better one,
   add a caption, or change how the cover is cropped, edit `captions.json` in
   the same folder:

   ```json
   {
     "02-blue-cable-toque.jpg": {
       "alt": "Blue cable-knit toque with a pom-pom",
       "caption": "Merino wool, adult size",
       "position": "center 30%"
     }
   }
   ```

To add a new category, create a folder and add an entry to `categories` in
`src/lib/gallery.ts`. Its page appears at `/<folder-name>/`.

### Uploading from the website

`/admin` (e.g. https://cfhcanmore.ca/admin) is a password-protected
page for adding photos from a phone or computer: pick a category, choose
photos, say what each one is, and upload. Photos are shrunk in the browser
(which also strips location data), committed to the right gallery folder on
`main`, and live after Railway's next deploy (about 5 minutes).

It runs from `admin/server.mjs` in the same container as the site and needs
two Railway service variables:

- `ADMIN_PASSWORD`: the password for the page (use a long one)
- `GITHUB_TOKEN`: a fine-grained GitHub token limited to this repo, with
  **Contents: Read and write** permission

Captions and cover crops are still edited in `captions.json`.

## Contact form

The form in `src/components/Contact.astro` sends messages to
cfhcanmore@gmail.com through [FormSubmit](https://formsubmit.co) (free, no
account). **The first message submitted on the live site triggers an
activation email from FormSubmit. Click the link in it once**, and every message
after that is delivered normally. Replies go straight to the sender's address.

## Structure

- `src/pages/index.astro` — the page; assembles the sections
- `src/pages/gallery.astro` — gallery overview (a preview of every category)
- `src/pages/[category].astro` — one gallery page per category (`/toques/`, …)
- `src/pages/404.astro` — not-found page
- `src/lib/gallery.ts` — categories and the photo-folder loader
- `src/components/` — one component per section (Header, Hero, About, Work, Contact, Footer), plus Gallery and Lightbox
- `src/layouts/Layout.astro` — `<head>` (SEO, social preview, structured data), fonts (Fraunces headings, Nunito Sans body) and global styles
- `src/assets/` — hero and profile photos; `src/assets/gallery/` holds product photos
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
