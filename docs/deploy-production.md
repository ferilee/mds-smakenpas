# Deploy Production

Panduan ini untuk deploy aplikasi di server Linux dengan Docker Compose, lalu diproxy dari Nginx Proxy Manager (NPM).

## 1) Siapkan file environment production

```bash
cp .env.production.example .env.production
```

Wajib diisi:
- `AUTH_URL` ke domain production HTTPS
- `AUTH_SECRET` (acak kuat, minimal 32 karakter)
- `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_USER` dan `MINIO_ROOT_PASSWORD`

## 2) Konfigurasi Google OAuth

Di Google Cloud Console:
- Authorized JavaScript origins: `https://mds.gemastika.or.id`
- Authorized redirect URIs: `https://mds.gemastika.or.id/api/auth/callback/google`

Ganti domain sesuai domain production kamu.

## 3) Jalankan stack production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Cek status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```

## 4) Konfigurasi Nginx Proxy Manager

- Domain: `mds.gemastika.or.id`
- Forward hostname/IP: `127.0.0.1`
- Forward port: `APP_PORT` di `.env.production` (default `3011`)
- Aktifkan SSL certificate
- Aktifkan Force SSL
- Aktifkan Websockets Support

## 5) Verifikasi setelah deploy

```bash
curl -I http://127.0.0.1:3011
```

Expected minimal:
- Bukan `502`
- Response `307` (redirect ke `/login`) atau `200`

## 6) Update aplikasi

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 7) Troubleshooting cepat

- Jika `502 Bad Gateway`, cek:
  - `docker compose ... ps` (apakah `app` status `Up`)
  - `docker compose ... logs --tail=200 app`
  - Port NPM sama dengan `APP_PORT`
- Jika login Google gagal:
  - Pastikan redirect URI di Google Console persis sama dengan domain + path callback
- Jika koneksi DB gagal:
  - Pastikan `DATABASE_URL` mengarah ke `db:5432` pada compose production ini
