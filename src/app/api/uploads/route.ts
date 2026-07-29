import { NextResponse } from "next/server";
import { limitFor, saveUpload, uploadKind } from "@/lib/uploads";
import { isAuthorized } from "@/lib/auth";

/** Receive one file from the editor (paste, drop or file picker). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isAuthorized())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file in the request" }, { status: 400 });
  }
  const kind = uploadKind(file.type);
  if (!kind) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }
  const limit = limitFor(file.type);
  if (file.size > limit) {
    return NextResponse.json(
      { error: `File is too large (max ${limit / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }
  const url = await saveUpload(await file.arrayBuffer(), file.type);
  return NextResponse.json({ url, alt: file.name, name: file.name, size: file.size, kind });
}
