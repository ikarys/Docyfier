import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Disk-backed uploads (PLAN.md STEP U2, widened in STEP U10). Same convention
 * as `src/lib/store.ts`: a plain directory standing in for the object storage a
 * later STEP will use. Files are content-addressed by a random uuid, never by
 * the name the browser sent.
 */

/** What a stored file is for: drawn in the page, or attached to it. */
export type UploadKind = "image" | "file";

interface AcceptedType {
  readonly ext: string;
  readonly kind: UploadKind;
}

/** 10 MB — a photo at print resolution, not a video still. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** 25 MB — a slide deck with pictures in it, not an archive. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Accepted types, mime → what to store it as.
 *
 * SVG is deliberately absent: an SVG is a document that can carry script, and
 * these files are served from the app's own origin, so a stored SVG would run
 * with the app's privileges the moment someone opened it directly. Raster
 * images, and documents no browser executes.
 */
const ACCEPTED: Record<string, AcceptedType> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "file" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    kind: "file",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: "xlsx",
    kind: "file",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: "pptx",
    kind: "file",
  },
  "text/csv": { ext: "csv", kind: "file" },
  "text/plain": { ext: "txt", kind: "file" },
  "text/markdown": { ext: "md", kind: "file" },
};

const EXTENSIONS = Object.values(ACCEPTED).map((type) => type.ext);

/** `<uuid>.<ext>` and nothing else — the shape `uploadPath` will accept back. */
const NAME_RE = new RegExp(`^[a-zA-Z0-9-]+\\.(${EXTENSIONS.join("|")})$`);

export function uploadsDir(): string {
  const documents =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(documents), "uploads");
}

export function extensionFor(mime: string): string | null {
  return ACCEPTED[mime]?.ext ?? null;
}

export function uploadKind(mime: string): UploadKind | null {
  return ACCEPTED[mime]?.kind ?? null;
}

/** The most this type may weigh, and zero for a type nobody accepted. */
export function limitFor(mime: string): number {
  const kind = uploadKind(mime);
  if (!kind) return 0;
  return kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
}

export function mimeForName(name: string): string | null {
  const ext = name.slice(name.lastIndexOf(".") + 1);
  const entry = Object.entries(ACCEPTED).find(([, type]) => type.ext === ext);
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
  if (!ext) throw new Error(`Unsupported file type: ${mime}`);
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(data));
  return `/api/uploads/${name}`;
}
