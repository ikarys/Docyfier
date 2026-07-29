import type { EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import { imageRowSizes } from "@/domain/documents/image";

/**
 * Client half of the image upload (PLAN.md STEP U2): send the file to
 * `/api/uploads`, then insert the returned URL as an image node.
 */

export interface UploadResult {
  url: string;
  alt: string;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const json = (await res.json().catch(() => null)) as
    | (UploadResult & { error?: string })
    | null;
  if (!res.ok || !json?.url) {
    throw new Error(json?.error ?? `Upload failed (${res.status})`);
  }
  return { url: json.url, alt: json.alt ?? "" };
}

/** Image files out of a paste or drop payload, ignoring everything else. */
export function imageFilesOf(list: FileList | DataTransferItemList | null): File[] {
  if (!list) return [];
  const files: File[] = [];
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    const file = entry instanceof File ? entry : entry.getAsFile();
    if (file && file.type.startsWith("image/")) files.push(file);
  }
  return files;
}

/**
 * Upload each file in turn, so several pasted images keep the order they were
 * given in. A failed upload is reported and skipped rather than breaking the
 * batch.
 */
async function uploadEach(files: File[]): Promise<UploadResult[]> {
  const uploaded: UploadResult[] = [];
  for (const file of files) {
    try {
      uploaded.push(await uploadImage(file));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Upload failed");
    }
  }
  return uploaded;
}

function imageNodes(view: EditorView, uploaded: UploadResult[]): PMNode[] {
  const type = view.state.schema.nodes.image;
  return uploaded.map(({ url, alt }) => type.create({ src: url, alt, width: 100 }));
}

/** Upload the files and insert them at `pos`, one under the other. */
export async function insertUploadedImages(
  view: EditorView,
  files: File[],
  pos: number,
): Promise<void> {
  const nodes = imageNodes(view, await uploadEach(files));
  if (nodes.length > 0) view.dispatch(view.state.tr.insert(pos, nodes));
}

/**
 * The same files as a gallery: rows of two to four, shared out by the domain.
 * A batch too small for a row is simply the images it holds — one picture is
 * not a gallery.
 */
export async function insertUploadedGallery(
  view: EditorView,
  files: File[],
  pos: number,
): Promise<void> {
  const nodes = imageNodes(view, await uploadEach(files));
  const sizes = imageRowSizes(nodes.length);
  if (sizes.length === 0) {
    if (nodes.length > 0) view.dispatch(view.state.tr.insert(pos, nodes));
    return;
  }
  const rowType = view.state.schema.nodes.imageRow;
  let taken = 0;
  const rows = sizes.map((size) => {
    const row = rowType.create(null, nodes.slice(taken, taken + size));
    taken += size;
    return row;
  });
  view.dispatch(view.state.tr.insert(pos, rows));
}
