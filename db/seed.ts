import { db } from "../lib/db";
import { missions, teacherVideos } from "./schema";

const data = [
  {
    code: "HAFALAN_SURAT_PENDEK",
    title: "Hafalan Surat-Surat Pendek",
    category: "RAMADAN_INTI",
    xp: 30,
  },
  {
    code: "CATATAN_PUASA_DAN_JAMAAH",
    title: "Shalat Lima Waktu",
    category: "RAMADAN_INTI",
    xp: 35,
  },
  {
    code: "SHALAT_TARAWIH",
    title: "Shalat Tarawih",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "SHALAT_TAHAJJUD",
    title: "Shalat Tahajjud",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "SHALAT_DHUHA",
    title: "Shalat Dhuha",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "INFAQ_SHADAQAH",
    title: "Infaq/ Shadaqah",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "SILATURAHIM",
    title: "Silaturahim",
    category: "IBADAH_SUNNAH",
    xp: 20,
  },
  {
    code: "TAKZIAH_ZIARAH",
    title: "Takziah/Ziarah",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "SUNNAH_LAINNYA",
    title: "Lainnya (bisa diisi sendiri)",
    category: "IBADAH_SUNNAH",
    xp: 10,
  },
  {
    code: "TADARUS_RAMADAN",
    title: "Catatan Kegiatan Tadarus",
    category: "RAMADAN_INTI",
    xp: 25,
  },
  {
    code: "KULTUM_CERAMAH",
    title: "Catatan Ceramah Agama / Kultum Ramadan",
    category: "LITERASI_DAKWAH",
    xp: 15,
  },
  {
    code: "SHALAT_IDULFITRI",
    title: "Catatan Shalat Idulfitri",
    category: "MOMEN_PUNCAK",
    xp: 15,
  },
  {
    code: "ZAKAT_FITRAH",
    title: "Catatan Menunaikan Zakat Fitrah",
    category: "MOMEN_PUNCAK",
    xp: 20,
  },
  {
    code: "SILATURRAHIM_RAMADAN",
    title: "Catatan Kegiatan Silaturrahim",
    category: "AKHLAK_SOSIAL",
    xp: 20,
  },
  {
    code: "REFLEKSI_DIRI",
    title: "Lembar Penilaian Diri (Refleksi)",
    category: "REFLEKSI",
    xp: 20,
    requiresNarration: true,
  },
];

const teacherVideoSeed = [
  {
    title: "Keutamaan Menjaga Lisan di Bulan Ramadan",
    youtubeUrl: "https://www.youtube.com/watch?v=YQHsXMglC9A",
    videoId: "YQHsXMglC9A",
    ustadz: "Ustadz Ahmad",
    publishedAt: "2025-03-01T00:00:00+07:00",
  },
  {
    title: "Adab kepada Orang Tua dan Guru",
    youtubeUrl: "https://www.youtube.com/watch?v=fLexgOxsZu0",
    videoId: "fLexgOxsZu0",
    ustadz: "Ustadzah Aisyah",
    publishedAt: "2025-03-03T00:00:00+07:00",
  },
];

async function main() {
  await db.update(missions).set({ active: false });

  for (const item of data) {
    await db
      .insert(missions)
      .values({
        code: item.code,
        title: item.title,
        category: item.category,
        xp: item.xp,
        requiresNarration: item.requiresNarration || false,
        active: true,
      })
      .onConflictDoUpdate({
        target: [missions.code],
        set: {
          title: item.title,
          category: item.category,
          xp: item.xp,
          requiresNarration: item.requiresNarration || false,
          active: true,
        },
      });
  }

  for (const item of teacherVideoSeed) {
    await db
      .insert(teacherVideos)
      .values({
        title: item.title,
        youtubeUrl: item.youtubeUrl,
        videoId: item.videoId,
        ustadz: item.ustadz,
        active: true,
        publishedAt: new Date(item.publishedAt),
      })
      .onConflictDoUpdate({
        target: [teacherVideos.videoId],
        set: {
          title: item.title,
          youtubeUrl: item.youtubeUrl,
          ustadz: item.ustadz,
          active: true,
          publishedAt: new Date(item.publishedAt),
        },
      });
  }
}

main()
  .then(() => {
    console.log("Seed selesai.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
