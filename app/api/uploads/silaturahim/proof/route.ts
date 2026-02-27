import { Readable } from "node:stream";
import { auth } from "@/lib/auth";
import { getSilaturahimProofObject } from "@/lib/minio";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const objectKey = searchParams.get("key")?.trim() || "";
  if (!objectKey) {
    return Response.json(
      { message: "Parameter key wajib diisi." },
      { status: 400 },
    );
  }

  if (!objectKey.startsWith("silaturahim/")) {
    return Response.json({ message: "Object key tidak valid." }, { status: 400 });
  }

  try {
    const object = await getSilaturahimProofObject(objectKey);
    const body = Readable.toWeb(object.stream as unknown as Readable);

    return new Response(body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.size),
        ETag: object.etag,
        "Last-Modified": object.lastModified,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[upload][silaturahim][proof] failed:", error);
    return Response.json(
      { message: "File bukti tidak ditemukan atau tidak bisa dibuka." },
      { status: 404 },
    );
  }
}
