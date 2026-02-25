Berikut adalah ringkasan alur aplikasi dan fitur utama untuk **Majelis Digital SMKN Pasirian**:

---

## 1. Alur Utama Aplikasi (User Journey)

Aplikasi ini dirancang dengan alur yang ringkas agar siswa tidak merasa terbebani saat mengisi laporan harian:

1. **Onboarding & Auth:** Siswa masuk menggunakan **Google OAuth**. Sistem secara otomatis mencocokkan email dengan database siswa SMKN Pasirian.
2. **Dashboard Utama (The Progress Hub):** Setelah login, siswa melihat ringkasan **Total XP**, level karakter (Sholeh Level), dan *streak* (berapa hari berturut-turut puasa).
3. **Daily Mission Checklist:** Siswa mengisi checklist ibadah yang terbagi dalam 4 kelompok (Pilar Utama, Sunnah, Literasi, dan Akhlak).
4. **XP Calculation & Update:** Setiap checklist yang dicentang akan menjumlahkan poin secara *real-time* menggunakan Drizzle ORM ke database Postgres.
5. **Leaderboard & History:** Siswa dapat melihat posisi mereka di klasemen sekolah (berdasarkan XP) dan melihat kalender ibadah mereka selama sebulan penuh.

---

## 2. Fitur Utama Majelis Digital

### 🛡️ Smart Authentication (Google OAuth)

Integrasi menggunakan **Auth.js (NextAuth)**. Ini memastikan keamanan dan kemudahan akses tanpa perlu menghafal password baru. Data profil (nama & foto) akan langsung sinkron dari akun Google siswa.

### 🎮 Gamified Daily Checklist

Sesuai rancangan Bapak, checklist ini bukan sekadar formulir, tapi "Quest":

* **Pilar Utama (Auto-Validated):** Jika puasa "Tidak", maka XP untuk Sholat 5 waktu tetap bisa didapat, tapi bonus "Ramadan Perfect Day" akan hilang.
* **Sunnah Boost:** Tombol khusus untuk menambah XP ekstra di luar ibadah wajib.
* **Social & Akhlak Quest:** Input narasi singkat (misal: "Membantu ibu cuci piring") untuk mendapatkan XP Berbakti.

### 📊 Leaderboard "Mengejar Jannah"

Fitur peringkat berdasarkan kelas atau keseluruhan sekolah. Ini memicu semangat *fastabiqul khairat* (berlomba-lomba dalam kebaikan) antar siswa SMK.

### 📈 Statistik "Istiqomah" (L)

Grafik perkembangan ibadah mingguan. Jika grafik menurun, aplikasi akan memberikan *push notification* atau pesan motivasi untuk kembali semangat.

### 📚 Edu-Content (E)

Integrasi video pendek atau artikel singkat harian seputar fikih Ramadan yang bisa diakses langsung di dalam aplikasi (Edukasi).

---

## 3. Arsitektur Teknis (The Tech Stack)

Karena Bapak ingin menggunakan Docker dan VPS, berikut adalah gambaran strukturnya:

| Komponen | Teknologi | Peran |
| --- | --- | --- |
| **Frontend/Backend** | Next.js 15 (App Router) | Framework utama untuk performa cepat dan SEO friendly. |
| **UI Library** | Tailwind CSS & ShadcnUI | Membuat tampilan dashboard yang modern, clean, dan responsif. |
| **Database Tool** | Drizzle ORM | Menghubungkan aplikasi ke Postgres dengan skema yang *type-safe*. |
| **Database** | PostgreSQL | Penyimpanan data siswa, checklist, dan poin XP. |
| **Containerization** | Docker | Membungkus app, database, dan MinIO agar mudah di-*deploy* di VPS. |
| **Storage** | MinIO | Menyimpan aset digital atau mungkin foto bukti kegiatan siswa. |

---

## 4. Struktur Database (Drizzle Schema)

Secara singkat, Bapak akan membutuhkan tabel:

* `users`: Data profil siswa & total XP.
* `daily_reports`: Mencatat checklist per hari per siswa.
* `missions`: Master data poin XP untuk tiap jenis ibadah.
