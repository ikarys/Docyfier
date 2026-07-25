import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES, extensionFor, saveUpload } from "@/lib/uploads";

/** Receive one image from the editor (paste, drop or file picker). */
export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file in the request" }, { status: 400 });
  }
  if (!extensionFor(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }
  const url = await saveUpload(await file.arrayBuffer(), file.type);
  return NextResponse.json({ url, alt: file.name });
}
