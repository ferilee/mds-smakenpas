# Majelis Digital SMKN Pasirian

Aplikasi gamified checklist ibadah harian berbasis:
- Next.js 15 (App Router)
- Auth.js (Google OAuth)
- Hono (API di `/api`)
- Drizzle ORM + PostgreSQL
- Tailwind CSS

## Fitur Utama
- Login siswa via Google OAuth.
- Dashboard Progress Hub: total XP, level, streak.
- Dashboard khusus Admin (`/admin/dashboard`) untuk monitoring sekolah.
- Dashboard khusus Guru (`/guru/dashboard`) untuk monitoring kelas.
- Daily Mission Checklist berfokus Ramadan:
  - hafalan surat-surat pendek
  - catatan puasa & shalat berjamaah
  - catatan ibadah sunnah Ramadan
  - catatan tadarus
  - catatan kultum/ceramah agama
  - catatan shalat Idulfitri
  - catatan zakat fitrah
  - catatan silaturrahim
  - lembar penilaian diri (refleksi)
- XP real-time + bonus Ramadan Perfect Day.
- Leaderboard (sekolah / kelas).
- Kalender history ibadah bulanan.
- Halaman materi khusus: Taharah, Wudlu, Mandi, Shalat, Puasa, Shalat Tarawih.

## Endpoint API (`/api`)
- `GET /api/me`
- `GET /api/missions`
- `GET /api/reports/today`
- `POST /api/reports/today`
- `GET /api/reports/history?month=YYYY-MM`
- `GET /api/leaderboard?scope=school|classroom`
- `GET /api/sholat/cities?keyword=lumajang`
- `GET /api/sholat/schedule?cityId=<id>&tz=Asia/Jakarta`

## Setup Lokal
1. Install dependency:
```bash
npm install
```
2. Copy env:
```bash
cp .env.example .env
```
Opsional: sesuaikan `DB_MAX_CONNECTIONS` di `.env` jika server Postgres memiliki batas koneksi kecil.
3. Jalankan PostgreSQL + MinIO (opsional via Docker):
```bash
docker compose up -d db minio
```
4. Push schema:
```bash
npm run db:push
```
5. Seed data missions:
```bash
npm run db:seed
```
6. Jalankan app:
```bash
npm run dev
```
7. Buka:
```bash
http://localhost:3010
```

## Panduan Google OAuth
1. Buka Google Cloud Console: https://console.cloud.google.com
2. Pilih atau buat project.
3. Masuk ke `APIs & Services` -> `OAuth consent screen`.
4. Pilih tipe `External`, isi data aplikasi, lalu simpan.
5. Tambahkan `Authorized domain` jika diperlukan untuk production.
6. Masuk ke `Credentials` -> `Create Credentials` -> `OAuth client ID`.
7. Pilih `Web application`.
8. Isi:
   - `Authorized JavaScript origins`: `http://localhost:3010`
   - `Authorized redirect URIs`: `http://localhost:3010/api/auth/callback/google`
9. Copy `Client ID` dan `Client Secret`, lalu isi ke `.env`:
```env
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_URL=http://localhost:3010
```
10. Restart server (`npm run dev`) setelah update env.

## Role Dashboard (Admin/Guru)
- Sistem role saat ini berbasis daftar email pada environment variable.
- Tambahkan email di `.env`:
```env
ADMIN_EMAILS=the.real.ferilee@gmail.com
GURU_EMAIL_DOMAIN=guru.smk.belajar.id
```
- Admin default: `the.real.ferilee@gmail.com`.
- Role `guru` otomatis hanya untuk akun yang domain email-nya sesuai `GURU_EMAIL_DOMAIN`
  (default: `@guru.smk.belajar.id`).
- Contoh akun guru valid: `ferihermawan42@guru.smk.belajar.id`.
- Prioritas role: `admin` > `guru` > `user`.
- Setelah login:
  - Admin diarahkan ke `/admin/dashboard`
  - Guru diarahkan ke `/guru/dashboard`
  - User/siswa tetap ke `/dashboard`

## Catatan Auth
- Untuk deploy production, tambahkan redirect URI production dengan format:
  - `https://domain-kamu/api/auth/callback/google`
