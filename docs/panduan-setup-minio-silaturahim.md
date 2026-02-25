# Panduan Lengkap Setup MinIO Untuk Upload Foto Silaturahim

Panduan ini dibuat untuk pemula. Ikuti dari atas ke bawah.

## 1. Tujuan Akhir

Setelah selesai, alurnya menjadi:

1. User pilih foto di form Silaturahim.
2. Frontend upload foto ke endpoint backend.
3. Backend simpan file ke MinIO.
4. Backend mengembalikan URL/object key.
5. Laporan Silaturahim menyimpan URL/object key foto (bukan base64).

## 2. Yang Sudah Ada Di Project Kamu

Project ini sudah punya service MinIO di `docker-compose.yml`:

- API MinIO: `http://localhost:9000`
- Console MinIO: `http://localhost:9001`
- User default: `minioadmin`
- Password default: `minioadmin`

## 3. Prasyarat

Pastikan sudah terinstall:

1. Docker + Docker Compose
2. Node.js + npm

## 4. Jalankan MinIO

Di root project:

```bash
docker compose up -d minio
```

Cek status:

```bash
docker compose ps
```

Buka console MinIO di browser:

- `http://localhost:9001`
- Login: `minioadmin` / `minioadmin`

## 5. Buat Bucket Di MinIO

Di MinIO Console:

1. Klik `Buckets`
2. Klik `Create Bucket`
3. Nama bucket contoh: `majelis-uploads`
4. Klik `Create Bucket`

### Pilihan akses bucket

Ada 2 mode:

1. Public bucket:
- URL file bisa diakses langsung.
- Mudah untuk development.

2. Private bucket:
- Lebih aman.
- Perlu signed URL saat menampilkan gambar.

Untuk pemula, mulai dari public dulu.

## 6. Tambahkan Environment Variable

Edit `.env` dan tambahkan:

```env
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=majelis-uploads
MINIO_REGION=us-east-1
MINIO_FORCE_PATH_STYLE=true
MINIO_PUBLIC_BASE_URL=http://localhost:9000
```

Keterangan:

- `MINIO_FORCE_PATH_STYLE=true` penting untuk MinIO lokal.
- `MINIO_PUBLIC_BASE_URL` dipakai untuk membentuk URL file public.

Restart dev server setelah ubah `.env`.

## 7. Install Library S3 (Kompatibel MinIO)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 8. Buat Utility Client MinIO

Buat file baru: `lib/minio.ts`

```ts
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.MINIO_ENDPOINT;
const accessKeyId = process.env.MINIO_ACCESS_KEY;
const secretAccessKey = process.env.MINIO_SECRET_KEY;
const region = process.env.MINIO_REGION || "us-east-1";
const forcePathStyle = process.env.MINIO_FORCE_PATH_STYLE === "true";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error("Konfigurasi MinIO belum lengkap di environment variable.");
}

export const minioClient = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export function getMinioBucket() {
  const bucket = process.env.MINIO_BUCKET;
  if (!bucket) {
    throw new Error("MINIO_BUCKET belum diisi.");
  }
  return bucket;
}

export function buildPublicObjectUrl(objectKey: string) {
  const base = process.env.MINIO_PUBLIC_BASE_URL;
  const bucket = getMinioBucket();
  if (!base) {
    throw new Error("MINIO_PUBLIC_BASE_URL belum diisi.");
  }
  return `${base.replace(/\\/$/, "")}/${bucket}/${objectKey}`;
}
```

## 9. Buat Endpoint Upload Baru

Buat route baru: `app/api/uploads/silaturahim/route.ts`

```ts
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { buildPublicObjectUrl, getMinioBucket, minioClient } from "@/lib/minio";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Format file harus JPG/PNG/WEBP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { message: "Ukuran file maksimal 2MB." },
      { status: 400 },
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `silaturahim/${session.user.id}/${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.send(
    new PutObjectCommand({
      Bucket: getMinioBucket(),
      Key: objectKey,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const publicUrl = buildPublicObjectUrl(objectKey);
  return NextResponse.json({
    objectKey,
    publicUrl,
  });
}
```

## 10. Ubah Data Silaturahim Dari Base64 Ke URL

Saat ini kamu pakai `proofPhotoDataUrl`.
Ubah menjadi:

- `proofPhotoUrl?: string`
- `proofPhotoObjectKey?: string`

Lokasi yang perlu disesuaikan:

1. `db/schema.ts` bagian `answers.silaturahimReport`
2. `app/api/[[...route]]/route.ts` schema `silaturahimReport`
3. `components/daily-checklist.tsx` state + UI preview

Contoh shape baru:

```ts
silaturahimReport?: {
  teacherName: string;
  location: string;
  recordedAt: string;
  purpose?: string;
  lessonSummary?: string;
  proofPhotoUrl?: string;
  proofPhotoObjectKey?: string;
};
```

## 11. Ubah Frontend Upload

Di `components/daily-checklist.tsx`, ubah handler upload:

1. File tidak lagi dibaca dengan `FileReader` base64.
2. File dikirim ke `/api/uploads/silaturahim` via `FormData`.
3. Simpan `publicUrl` ke state form.

Contoh:

```ts
const handleSilaturahimPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/silaturahim", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    setSilaturahimStatus(data.message || "Upload foto gagal.");
    return;
  }

  setSilaturahimForm((prev) => ({
    ...prev,
    proofPhotoUrl: data.publicUrl,
    proofPhotoObjectKey: data.objectKey,
  }));
};
```

Preview image:

```tsx
{silaturahimForm.proofPhotoUrl ? (
  <img src={silaturahimForm.proofPhotoUrl} alt="Bukti kunjungan" />
) : null}
```

## 12. Simpan URL Ke Laporan Harian

Pastikan payload ke `/api/reports/today` mengirim URL/object key:

```ts
silaturahimReport: {
  teacherName,
  location,
  recordedAt,
  purpose,
  lessonSummary,
  proofPhotoUrl,
  proofPhotoObjectKey,
}
```

## 13. Testing End-to-End

### A. Test MinIO

1. Upload file manual via MinIO console.
2. Coba buka URL file langsung:
   - `http://localhost:9000/majelis-uploads/<objectKey>`

### B. Test API Upload

1. Jalankan app: `npm run dev`
2. Login
3. Isi form Silaturahim
4. Pilih foto
5. Pastikan preview muncul
6. Klik `Kunjungan Selesai`
7. Refresh halaman
8. Pastikan data foto tetap tampil

### C. Test TypeScript

```bash
npx tsc --noEmit
```

## 14. Jika Bucket Private (Opsional, Lebih Aman)

Jika bucket private, jangan pakai `publicUrl` langsung.
Gunakan signed URL:

1. Simpan `objectKey` di DB.
2. Buat endpoint `GET /api/uploads/silaturahim/view?key=...`.
3. Backend generate signed URL dengan `getSignedUrl`.
4. Frontend request signed URL saat ingin menampilkan gambar.

Ini aman untuk production.

## 15. Troubleshooting Umum

1. Error `ECONNREFUSED` ke MinIO:
- Cek MinIO jalan: `docker compose ps`
- Cek endpoint `.env` benar.

2. Error `SignatureDoesNotMatch`:
- Pastikan `MINIO_FORCE_PATH_STYLE=true`.
- Cek access key/secret key.

3. Upload berhasil tapi gambar tidak bisa dibuka:
- Bucket belum public.
- URL base salah.

4. `File terlalu besar`:
- Kecilkan foto sebelum upload.
- Naikkan limit di backend jika diperlukan.

## 16. Checklist Cepat

1. MinIO jalan (`9000`, `9001`)
2. Bucket dibuat
3. `.env` MinIO lengkap
4. Package AWS SDK terinstall
5. Utility `lib/minio.ts` dibuat
6. API upload dibuat
7. Frontend upload disambungkan
8. Schema report pakai URL/object key
9. `npx tsc --noEmit` lolos
10. Uji upload + simpan laporan berhasil

---

Kalau kamu mau, saya bisa lanjut langsung tahap implementasi kode MinIO di project ini sesuai panduan di atas (siap pakai).
