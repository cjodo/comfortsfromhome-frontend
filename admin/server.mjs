// Tiny photo-upload admin for the static site.
//
// Serves /admin (a password-protected upload form) and saves uploaded photos
// by committing them to src/assets/gallery/<category>/ on GitHub. Railway
// redeploys on every push to the branch, so the photos go live after the next
// build. No dependencies: run with `node admin/server.mjs`.
//
// Environment:
//   ADMIN_PASSWORD  required; the password typed on the admin page
//   GITHUB_TOKEN    required; fine-grained token with Contents read/write on the repo
//   GITHUB_REPO     default cjodo/comfortsfromhome-frontend
//   GITHUB_BRANCH   default main
//   ADMIN_PORT      default 3001 (Caddy proxies /admin to it)
//   DRY_RUN=1       report the filenames that would be saved, without committing

import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const PORT = Number(process.env.ADMIN_PORT ?? 3001);
const HOST = process.env.ADMIN_HOST ?? "127.0.0.1";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const REPO = process.env.GITHUB_REPO ?? "cjodo/comfortsfromhome-frontend";
const BRANCH = process.env.GITHUB_BRANCH ?? "main";
const DRY_RUN = process.env.DRY_RUN === "1";

const GALLERY = "src/assets/gallery";
const MAX_BYTES = 60 * 1024 * 1024;
const MAX_PHOTOS = 20;
const PAGE = readFileSync(new URL("./page.html", import.meta.url), "utf8");

class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// --- Password check, with a global brake on repeated wrong guesses ---------

const sha = (s) => createHash("sha256").update(String(s)).digest();
let failures = [];

async function checkPassword(given) {
  const now = Date.now();
  failures = failures.filter((t) => now - t < 15 * 60_000);
  if (failures.length >= 30) {
    throw new UserError("Too many wrong passwords. Try again later.", 429);
  }
  if (PASSWORD && timingSafeEqual(sha(given ?? ""), sha(PASSWORD))) return;
  failures.push(now);
  await new Promise((r) => setTimeout(r, 1000));
  throw new UserError("Wrong password.", 401);
}

// --- GitHub ----------------------------------------------------------------

async function gh(method, path, body) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gallery-admin",
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(
      `GitHub ${method} ${path}: ${res.status} ${await res.text()}`,
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Current branch head, plus the gallery folders and files in it. */
async function getRepoState() {
  const ref = await gh("GET", `/git/ref/heads/${BRANCH}`);
  const commit = await gh("GET", `/git/commits/${ref.object.sha}`);
  const tree = await gh("GET", `/git/trees/${commit.tree.sha}?recursive=1`);
  const categories = new Map(); // slug -> filenames
  for (const entry of tree.tree) {
    if (!entry.path.startsWith(`${GALLERY}/`)) continue;
    const [slug, file] = entry.path.slice(GALLERY.length + 1).split("/");
    if (!categories.has(slug)) categories.set(slug, []);
    if (entry.type === "blob" && file) categories.get(slug).push(file);
  }
  return { head: ref.object.sha, baseTree: commit.tree.sha, categories };
}

let categoryCache = { at: 0, list: [] };
async function listCategories() {
  if (Date.now() - categoryCache.at > 5 * 60_000) {
    const { categories } = await getRepoState();
    categoryCache = { at: Date.now(), list: [...categories.keys()].sort() };
  }
  return categoryCache.list;
}

// --- Photos ----------------------------------------------------------------

function imageType(bytes) {
  const ascii = (a, b) => bytes.subarray(a, b).toString("latin1");
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** "Blue Cable Toque!" → "blue-cable-toque" */
function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

async function savePhotos(form) {
  const category = String(form.get("category") ?? "");
  const names = form.getAll("name").map(String);
  const photos = form
    .getAll("photo")
    .filter((f) => typeof f === "object" && f.size > 0);

  if (photos.length === 0) throw new UserError("Choose at least one photo.");
  if (photos.length > MAX_PHOTOS) {
    throw new UserError(`Upload at most ${MAX_PHOTOS} photos at a time.`);
  }

  const files = [];
  for (const [i, photo] of photos.entries()) {
    const bytes = Buffer.from(await photo.arrayBuffer());
    const ext = imageType(bytes);
    if (!ext) {
      throw new UserError(
        `"${photo.name}" isn't a JPEG, PNG or WebP photo, so it can't be added.`,
      );
    }
    files.push({ bytes, ext, slug: slugify(names[i] ?? "") || "photo" });
  }

  // Upload the image data once; the commit itself is retried if the branch
  // moved underneath us.
  const blobs = DRY_RUN
    ? []
    : await Promise.all(
        files.map((f) =>
          gh("POST", "/git/blobs", {
            content: f.bytes.toString("base64"),
            encoding: "base64",
          }),
        ),
      );

  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await getRepoState();
    const existing = state.categories.get(category);
    if (!existing) throw new UserError("Pick a category.");

    // Number new photos after the existing ones so they sort last.
    let next =
      Math.max(0, ...existing.map((f) => Number(/^\d+/.exec(f)?.[0] ?? 0))) + 1;
    const taken = new Set(existing);
    const saved = files.map((f) => {
      let name;
      do name = `${String(next++).padStart(2, "0")}-${f.slug}.${f.ext}`;
      while (taken.has(name));
      taken.add(name);
      return name;
    });

    if (DRY_RUN) return { category, saved };

    const tree = await gh("POST", "/git/trees", {
      base_tree: state.baseTree,
      tree: saved.map((name, i) => ({
        path: `${GALLERY}/${category}/${name}`,
        mode: "100644",
        type: "blob",
        sha: blobs[i].sha,
      })),
    });
    const commit = await gh("POST", "/git/commits", {
      message: `Add ${saved.length === 1 ? "photo" : "photos"} to ${category}: ${saved.join(", ")}`,
      tree: tree.sha,
      parents: [state.head],
    });
    try {
      await gh("PATCH", `/git/refs/heads/${BRANCH}`, { sha: commit.sha });
      return { category, saved };
    } catch (err) {
      if (err.status !== 422) throw err; // 422: branch moved, try again
    }
  }
  throw new Error("Branch kept changing while saving; gave up.");
}

// --- HTTP ------------------------------------------------------------------

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(body);
}
const json = (res, status, data) =>
  send(res, status, "application/json", JSON.stringify(data));

async function readBody(req) {
  if (Number(req.headers["content-length"] ?? 0) > MAX_BYTES) {
    throw new UserError("That's too much at once. Try fewer photos.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) {
      throw new UserError("That's too much at once. Try fewer photos.", 413);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
const label = (slug) => {
  const words = slug.replace(/-/g, " ");
  return words[0].toUpperCase() + words.slice(1);
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  try {
    if (!PASSWORD || !TOKEN) {
      return send(
        res,
        503,
        "text/plain",
        "Admin is not set up"
      );
    }

    if (
      req.method === "GET" &&
      (pathname === "/admin" || pathname === "/admin/")
    ) {
      const options = (await listCategories())
        .map(
          (slug) =>
            `<option value="${escapeHtml(slug)}">${escapeHtml(label(slug))}</option>`,
        )
        .join("");
      return send(
        res,
        200,
        "text/html; charset=utf-8",
        PAGE.replace("<!--CATEGORIES-->", options),
      );
    }

    if (req.method === "POST" && pathname === "/admin/upload") {
      await checkPassword(req.headers["x-admin-password"]);
      const body = await readBody(req);
      const form = await new Response(body, {
        headers: { "Content-Type": req.headers["content-type"] ?? "" },
      }).formData();
      const result = await savePhotos(form);
      console.log(`Saved ${result.saved.join(", ")} to ${result.category}`);
      return json(res, 200, result);
    }

    return send(res, 404, "text/plain", "Not found");
  } catch (err) {
    if (err instanceof UserError) {
      return json(res, err.status, { error: err.message });
    }
    console.error(err);
    return json(res, 500, {
      error: "Something went wrong saving the photos. Please try again.",
    });
  }
}).listen(PORT, HOST, () => {
  console.log(
    `Photo admin on http://${HOST}:${PORT}/admin → ${REPO}@${BRANCH}${DRY_RUN ? " (dry run)" : ""}`,
  );
});
