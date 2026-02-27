import { auth } from "@/lib/auth";
import { uploadSilaturahimProof } from "@/lib/minio";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { message: "File foto wajib diisi." },
      { status: 400 }
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return Response.json(
      { message: "Format foto harus JPG, PNG, atau WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json(
      { message: "Ukuran foto maksimal 2MB." },
      { status: 400 }
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadSilaturahimProof({
      userId: session.user.id,
      data: bytes,
      mimeType: file.type,
    });

    return Response.json({
      objectKey: uploaded.objectKey,
      url: uploaded.url,
    });
  } catch (error) {
    console.error("[upload][silaturahim] failed:", error);
    return Response.json(
      { message: "Upload foto ke server gagal. Coba lagi." },
      { status: 500 }
    );
  }
}
