import type { ImageMetadata } from "astro";

/**
 * Photo galleries are driven by folders:
 *
 *   src/assets/gallery/<category-slug>/<photo>.jpg
 *
 * Drop a photo into a folder and it appears on that category's page.
 * Photos are sorted by filename, so prefix with 01-, 02-… to control order.
 *
 * Optional `captions.json` in a folder adds alt text, captions or a crop focus:
 *   { "01-maple-leaf-toque.jpeg": { "alt": "...", "caption": "...", "position": "center 30%" } }
 */

export interface Category {
  slug: string;
  name: string;
  description: string;
  /** Filename in the folder to use as the homepage cover; defaults to the first photo. */
  cover?: string;
}

export const categories: Category[] = [
  {
    slug: "toques",
    name: "Toques",
    description: "Warm hats for cold mountain mornings.",
  },
  {
    slug: "sweaters",
    name: "Sweaters",
    description: "Cardigans and pullovers, knit stitch by stitch.",
  },
  {
    slug: "home-goods",
    name: "Home Goods",
    description: "Baskets and cozy things for the home.",
  },
];

export interface PhotoMeta {
  alt?: string;
  caption?: string;
  /** CSS object-position used when the photo is cropped (e.g. on homepage cards). */
  position?: string;
}

export interface Photo extends PhotoMeta {
  file: string;
  src: ImageMetadata;
  alt: string;
}

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/gallery/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}",
  { eager: true },
);

const captionModules = import.meta.glob<{
  default: Record<string, PhotoMeta>;
}>("/src/assets/gallery/*/captions.json", { eager: true });

/** "01-orange_maple-toque.jpeg" → "Orange maple toque" */
function altFromFilename(file: string): string {
  const words = file
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_ ]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Hand-knit item";
}

function parsePath(path: string) {
  const [, , , , slug, file] = path.split("/");
  return { slug, file };
}

const photosBySlug = new Map<string, Photo[]>();

for (const [path, mod] of Object.entries(imageModules)) {
  const { slug, file } = parsePath(path);
  const captions =
    captionModules[`/src/assets/gallery/${slug}/captions.json`]?.default ?? {};
  const meta = captions[file] ?? {};
  const photo: Photo = {
    ...meta,
    file,
    src: mod.default,
    alt: meta.alt ?? altFromFilename(file),
  };
  const list = photosBySlug.get(slug) ?? [];
  list.push(photo);
  photosBySlug.set(slug, list);
}

for (const list of photosBySlug.values()) {
  list.sort((a, b) =>
    a.file.localeCompare(b.file, undefined, { numeric: true }),
  );
}

export function getPhotos(slug: string): Photo[] {
  return photosBySlug.get(slug) ?? [];
}

export function getCover(category: Category): Photo | undefined {
  const photos = getPhotos(category.slug);
  return (
    (category.cover && photos.find((p) => p.file === category.cover)) ||
    photos[0]
  );
}
