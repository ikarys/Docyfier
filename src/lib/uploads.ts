import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Disk-backed image uploads (PLAN.md STEP U2). Same convention as
 * `src/lib/store.ts`: a plain directory standing in for the object storage a
 * later STEP will use. Files are content-addressed by a random uuid, never by
 * the name the browser sent.
 */

/** 10 MB — a photo at print resolution, not a video still. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Accepted image types, mime → extension.
 *
 * SVG is deliberately absent: an SVG is a document that can carry script, and
 * these files are served from the app's own origin, so a stored SVG would run
 * with the app's privileges the moment someone opened it directly. Raster
 * formats only.
 */
const ACCEPTED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

const EXTENSIONS = Object.values(ACCEPTED);

/** `<uuid>.<ext>` and nothing else — the shape `uploadPath` will accept back. */
const NAME_RE = new RegExp(`^[a-zA-Z0-9-]+\\.(${EXTENSIONS.join("|")})$`);

export function uploadsDir(): string {
  const documents =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(documents), "uploads");
}

export function extensionFor(mime: string): string | null {
  return ACCEPTED[mime] ?? null;
}

export function mimeForName(name: string): string | null {
  const ext = name.slice(name.lastIndexOf(".") + 1);
  const entry = Object.entries(ACCEPTED).find(([, e]) => e === ext);
  return entry ? entry[0] : null;
}

/** Absolute path for a stored upload, or null if `name` is not one of ours. */
export function uploadPath(name: string): string | null {
  if (!NAME_RE.test(name)) return null;
  return path.join(uploadsDir(), name);
}

/** Store `data` as a new upload and return its public URL. */
export async function saveUpload(data: ArrayBuffer, mime: string): Promise<string> {
  const ext = extensionFor(mime);
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(data));
  return `/api/uploads/${name}`;
}
