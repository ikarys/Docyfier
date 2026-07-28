import type { EditorView } from "@tiptap/pm/view";

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
 * Upload each file and insert it at `pos`. Uploads run in order so several
 * pasted images keep their order in the document; a failed upload is reported
 * and skipped rather than breaking the batch.
 */
export async function insertUploadedImages(
  view: EditorView,
  files: File[],
  pos: number,
): Promise<void> {
  let at = pos;
  for (const file of files) {
    try {
      const { url, alt } = await uploadImage(file);
      const type = view.state.schema.nodes.image;
      if (!type) return;
      const node = type.create({ src: url, alt, width: 100 });
      view.dispatch(view.state.tr.insert(at, node));
      at += node.nodeSize;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Upload failed");
    }
  }
}
