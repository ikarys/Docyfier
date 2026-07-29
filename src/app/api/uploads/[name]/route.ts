import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { mimeForName, uploadKind, uploadPath } from "@/lib/uploads";
import { isAuthorized } from "@/lib/auth";

/** Serve a stored upload. `uploadPath` rejects any name that is not one we
 * wrote, so a traversal attempt never reaches the filesystem. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  if (!(await isAuthorized())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { name } = await params;
  const file = uploadPath(name);
  const mime = file && mimeForName(name);
  if (!file || !mime) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await readFile(file);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        // Uploads are immutable: the name is a uuid, a new file is a new name.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        // Only a picture is ever meant to be shown by this origin; everything
        // else is handed over as a download, whatever a browser would sniff.
        "X-Content-Type-Options": "nosniff",
        ...(uploadKind(mime) === "image"
          ? {}
          : { "Content-Disposition": `attachment; filename="${name}"` }),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
