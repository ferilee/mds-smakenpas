"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { defaultFikihMaterials, type FikihTopic } from "@/lib/fikih-materials";

type Mission = {
  id: number;
  code: string;
  title: string;
  category: string;
  xp: number;
  requiresNarration: boolean;
};

type City = {
  id: string;
  name: string;
};

type Schedule = {
  cityId: string;
  cityName: string;
  province: string;
  dateKey: string;
  times: {
    tanggal: string;
    imsak: string;
    subuh: string;
    terbit: string;
    dhuha: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
  };
};
type TeacherVideoOption = {
  id: number;
  title: string;
  youtubeUrl: string;
  videoId: string;
  ustadz: string | null;
  publishedAt: string;
};

type MissionDetail = {
  title: string;
  description: string;
};
type PrayerMode = "Berjamaah" | "Munfarid";
type ZakatFitrahForm = {
  via: string;
  address: string;
  date: string;
  form: "Beras" | "Uang";
  amount: string;
};
type InfaqShadaqahForm = {
  amount: string;
};
type TakziahZiarahForm = {
  purpose: string;
};
type IdulfitriForm = {
  place: string;
  khatib: string;
  khutbahSummary: string;
};
type TadarusReportForm = {
  surahName: string;
  ayatFrom: string;
  ayatTo: string;
  totalAyatRead: string;
};
type SilaturahimForm = {
  teacherName: string;
  location: string;
  recordedAt: string;
  purpose: string;
  lessonSummary: string;
  proofPhotoUrl: string;
  proofPhotoObjectKey: string;
};

function createEmptySilaturahimForm(
  recordedAt = new Date().toISOString(),
): SilaturahimForm {
  return {
    teacherName: "",
    location: "",
    recordedAt,
    purpose: "",
    lessonSummary: "",
    proofPhotoUrl: "",
    proofPhotoObjectKey: "",
  };
}
type KultumForm = {
  teacherVideoId: string;
  ringkasan: string;
  poinPelajaranText: string;
};

const navItems = [
  {
    key: "PILAR_UTAMA",
    label: "Pilar Utama",
    categories: ["RAMADAN_INTI", "MOMEN_PUNCAK"],
  },
  {
    key: "SUNNAH",
    label: "Sunnah",
    categories: ["IBADAH_SUNNAH"],
  },
  {
    key: "LITERASI",
    label: "Literasi",
    categories: ["LITERASI_DAKWAH"],
  },
  {
    key: "AKHLAK",
    label: "Akhlak",
    categories: ["AKHLAK_SOSIAL", "REFLEKSI"],
  },
] as const;

type CategoryKey = (typeof navItems)[number]["key"];
type MobileNavItem =
  | { label: string; kind: "category"; target: CategoryKey }
  | { label: string; kind: "route"; href: "/leaderboard" };

const mobileNavItems: MobileNavItem[] = [
  { label: "UTAMA", kind: "category", target: "PILAR_UTAMA" },
  { label: "SUNNAH", kind: "category", target: "SUNNAH" },
  { label: "LITERASI", kind: "category", target: "LITERASI" },
  { label: "AKHLAK", kind: "category", target: "AKHLAK" },
  { label: "PERINGKAT", kind: "route", href: "/leaderboard" },
];

const STORAGE_KEY = "prayer_city_id";
const REMINDER_STORAGE_KEY = "prayer_sound_reminder";
const FASTING_PROMPT_SEEN_KEY_PREFIX = "fasting_prompt_seen";
const FASTING_PROMPT_VALUE_KEY_PREFIX = "fasting_prompt_value";
const FASTING_CONFIRMATION_KEY = "fasting_confirmation_latest";
const FASTING_CONFIRMATION_UPDATED_EVENT = "fasting-confirmation-updated";
const MURAJAAH_STORAGE_KEY = "murajaah_juz30_hafal";
const FIKIH_SUMMARY_STORAGE_KEY = "fikih_ramadan_summaries_v1";
const JUZ30_TOTAL_SURAH = 37;
const MURAJAAH_TARGET_SURAH = 30;
const DEFAULT_CITY_KEYWORD = "lumajang";
const FIKIH_XP_PER_SUMMARY = 15;
const FASTING_MODAL_DELAY_MS = 60_000;

const missionDetails: Record<string, MissionDetail> = {
  HAFALAN_SURAT_PENDEK: {
    title: "Murajaah Hafalan Surat Pendek",
    description:
      '"Sebaik-baik kalian adalah yang belajar Al-Quran dan mengajarkannya." (HR. Bukhari)',
  },
  MATERI_FIKIH_RAMADAN: {
    title: "Materi Fikih Ramadan",
    description:
      "Pelajari materi fikih Ramadan per topik dan isi ringkasan untuk setiap materi.",
  },
  CATATAN_PUASA_DAN_JAMAAH: {
    title: "Shalat Lima Waktu",
    description:
      'Dari Abu Hurairah R.A., dia berkata: "Sesungguhnya Rasulullah Shallallahu \'alaihi wa sallam bersabda: Shalat lima waktu, hari Jumat ke Jumat berikutnya, dan dari puasa Ramadan satu sampai puasa Ramadan berikutnya adalah penghapus dosa; selama seseorang menjauhi dosa-dosa besar." (HR. Muslim)',
  },
  TADARUS_RAMADAN: {
    title: "Baca Al-Quran Harian",
    description:
      '"Bacalah Al-Quran, karena ia akan datang pada hari kiamat sebagai pemberi syafaat." (HR. Muslim)',
  },
  KULTUM_CERAMAH: {
    title: "Catatan Ceramah Agama / Kultum Ramadan",
    description:
      "Pilih video yang disediakan guru, amati dengan baik, lalu tulis ringkasannya.",
  },
  SHALAT_IDULFITRI: {
    title: "Shalat Idulfitri",
    description:
      "Tunaikan shalat Idulfitri sebagai penutup ibadah Ramadan dan syiar kebersamaan umat.",
  },
  ZAKAT_FITRAH: {
    title: "Tunaikan Zakat Fitrah",
    description:
      "Pastikan zakat fitrah ditunaikan tepat waktu untuk menyucikan jiwa dan membantu yang membutuhkan.",
  },
  SILATURAHIM: {
    title: "Catatan Kegiatan Silaturahim",
    description:
      "Catat kegiatan kunjungan silaturahim: kepada siapa, lokasi, waktu, dan adab/hal baik yang dipelajari.",
  },
  SILATURRAHIM_RAMADAN: {
    title: "Catatan Kegiatan Silaturahim",
    description:
      "Catat kegiatan kunjungan silaturahim: kepada siapa, lokasi, waktu, dan adab/hal baik yang dipelajari.",
  },
  SUNNAH_LAINNYA: {
    title: "Aktivitas Sunnah Lainnya (Isi Sendiri)",
    description:
      "Contoh ide: puasa sunnah, membaca shalawat, membantu orang tua, menjenguk orang sakit, sedekah makanan, menjaga lisan, atau menebar salam.",
  },
};
const prayerReportOrder = [
  "Subuh",
  "Dzuhur",
  "Ashar",
  "Maghrib",
  "Isya",
] as const;
const prayerXpByMode: Record<PrayerMode, number> = {
  Berjamaah: 27,
  Munfarid: 20,
};
const quranSurahNames = [
  "Al-Fatihah",
  "Al-Baqarah",
  "Ali Imran",
  "An-Nisa",
  "Al-Ma'idah",
  "Al-An'am",
  "Al-A'raf",
  "Al-Anfal",
  "At-Taubah",
  "Yunus",
  "Hud",
  "Yusuf",
  "Ar-Ra'd",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Taha",
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Mu'minun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shu'ara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum",
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Yasin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir",
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf",
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqi'ah",
  "Al-Hadid",
  "Al-Mujadilah",
  "Al-Hashr",
  "Al-Mumtahanah",
  "As-Saff",
  "Al-Jumu'ah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Ma'arij",
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Nazi'at",
  "Abasa",
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-A'la",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad",
  "Ash-Shams",
  "Al-Lail",
  "Ad-Duha",
  "Ash-Sharh",
  "At-Tin",
  "Al-'Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-'Adiyat",
  "Al-Qari'ah",
  "At-Takathur",
  "Al-'Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraisy",
  "Al-Ma'un",
  "Al-Kauthar",
  "Al-Kafirun",
  "An-Nasr",
  "Al-Lahab",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas",
] as const;
const quranSurahAyatCounts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;
const SUNNAH_OTHER_SECTION_LABEL = "Sunnah Lainnya";
const sunnahOtherIdeaOptions = [
  "Puasa sunnah",
  "Membaca shalawat",
  "Membantu orang tua",
  "Menjenguk orang sakit",
  "Sedekah makanan",
  "Menjaga lisan",
  "Menebar salam",
] as const;
const reflectionIdeaOptions = [
  "Ibadah terbaik hari ini yang paling khusyuk",
  "Kebiasaan kurang baik yang masih muncul",
  "Sikap kepada orang tua/guru/teman hari ini",
  "Hal yang disyukuri hari ini",
  "Target perbaikan akhlak untuk besok",
] as const;

function buildSunnahSection(note: string) {
  const cleanNote = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  if (!cleanNote) return "";
  return `[${SUNNAH_OTHER_SECTION_LABEL}]\n${cleanNote}`;
}

function splitNarrationSections(raw: string) {
  const source = raw.trim();
  if (!source) {
    return { narrationOnly: "", sunnahNote: "" };
  }

  const escapedLabel = SUNNAH_OTHER_SECTION_LABEL.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const sectionPattern = new RegExp(
    `\\[${escapedLabel}\\]\\n([\\s\\S]*?)(?=\\n\\n\\[[^\\]]+\\]\\n|$)`,
    "g",
  );
  let sunnahNote = "";
  const narrationOnly = source
    .replace(sectionPattern, (_match, captured: string) => {
      sunnahNote = captured.trim();
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { narrationOnly, sunnahNote };
}

function mergeNarrationWithSunnah(narrationOnly: string, sunnahNote: string) {
  const cleanNarration = narrationOnly.trim();
  const sunnahSection = buildSunnahSection(sunnahNote);
  if (!sunnahSection) return cleanNarration;
  if (!cleanNarration) return sunnahSection;
  return `${cleanNarration}\n\n${sunnahSection}`;
}

function countAyatRange(ayatFromRaw: string, ayatToRaw: string) {
  const ayatFrom = Number(ayatFromRaw);
  const ayatTo = Number(ayatToRaw);
  if (
    !Number.isInteger(ayatFrom) ||
    !Number.isInteger(ayatTo) ||
    ayatFrom < 1 ||
    ayatTo < 1 ||
    ayatTo < ayatFrom
  ) {
    return null;
  }
  return ayatTo - ayatFrom + 1;
}

function calculateTadarusXpPreview(totalAyatRead: string) {
  const ayat = Number(totalAyatRead);
  if (!Number.isInteger(ayat) || ayat < 0) return 0;
  return ayat;
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoCompleteSurahName(rawInput: string) {
  const q = normalizeLookupText(rawInput);
  if (!q) return "";
  const exact = quranSurahNames.find((name) => normalizeLookupText(name) === q);
  if (exact) return exact;
  const starts = quranSurahNames.find((name) =>
    normalizeLookupText(name).startsWith(q),
  );
  if (starts) return starts;
  const contains = quranSurahNames.find((name) =>
    normalizeLookupText(name).includes(q),
  );
  return contains || "";
}

function getSurahAyatLimit(surahNameRaw: string) {
  const normalized = normalizeLookupText(surahNameRaw);
  if (!normalized) return null;
  const idx = quranSurahNames.findIndex(
    (name) => normalizeLookupText(name) === normalized,
  );
  if (idx < 0) return null;
  return quranSurahAyatCounts[idx] ?? null;
}

function parseTimeForDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatRecordedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function toDateTimeLocalValue(inputIso: string) {
  const date = inputIso ? new Date(inputIso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(localValue: string) {
  if (!localValue) return "";
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function findSyawalFirstDate(yearHijri: number, fromDate: Date) {
  const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 500; i += 1) {
    const candidate = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const parts = fmt.formatToParts(candidate);
    const day = Number(parts.find((p) => p.type === "day")?.value || "0");
    const month = Number(parts.find((p) => p.type === "month")?.value || "0");
    const year = Number(parts.find((p) => p.type === "year")?.value || "0");
    if (year === yearHijri && month === 10 && day === 1) {
      return candidate;
    }
  }
  return null;
}

function getIslamicDateParts(baseDate: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(baseDate);
  const day = Number(parts.find((p) => p.type === "day")?.value || "0");
  const monthText = (
    parts.find((p) => p.type === "month")?.value || ""
  ).toLowerCase();
  const year = Number(parts.find((p) => p.type === "year")?.value || "0");
  const isSyawal =
    monthText.includes("shawwal") ||
    monthText.includes("syawal") ||
    monthText.includes("syawwal");
  return { day, monthText, year, isSyawal };
}

function NavIcon({ category }: { category: CategoryKey }) {
  const cls = "h-5 w-5";
  switch (category) {
    case "AKHLAK":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"
          />
          <circle cx="9.5" cy="8" r="3" strokeWidth="1.8" />
          <path strokeWidth="1.8" strokeLinecap="round" d="M15 8h6m-3-3v6" />
        </svg>
      );
    case "PILAR_UTAMA":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 12a8 8 0 1 1-8-8 6.5 6.5 0 0 0 0 13 8 8 0 0 0 8-5Z"
          />
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            d="m16.5 5.5.6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6 1.2-.6.6-1.2Z"
          />
        </svg>
      );
    case "SUNNAH":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path strokeWidth="1.8" strokeLinecap="round" d="M4 12h16M12 4v16" />
          <path strokeWidth="1.8" strokeLinecap="round" d="M7 18h10" />
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            d="M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4"
          />
        </svg>
      );
    case "LITERASI":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="1.8"
            strokeLinejoin="round"
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5v-14Z"
          />
          <path strokeWidth="1.8" strokeLinecap="round" d="M8 8h8M8 12h8" />
        </svg>
      );
    default:
      return null;
  }
}

function BottomNavIcon({ label }: { label: string }) {
  const cls = "h-6 w-6";
  switch (label) {
    case "UTAMA":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 2 5 8v2h14V8l-7-6Z" />
          <path d="M6 11h12v10H6z" />
          <rect x="10" y="14" width="4" height="7" rx="1" fill="currentColor" />
        </svg>
      );
    case "SUNNAH":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 12a8 8 0 1 1-8-8 6.5 6.5 0 0 0 0 13 8 8 0 0 0 8-5Z M15.5 5.5l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7.7-1.4Z"
          />
        </svg>
      );
    case "LITERASI":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M6 3h9l3 3v15H6z" />
          <rect
            x="9"
            y="10"
            width="6"
            height="1.8"
            rx=".9"
            fill="currentColor"
          />
          <rect
            x="9"
            y="14"
            width="6"
            height="1.8"
            rx=".9"
            fill="currentColor"
          />
        </svg>
      );
    case "AKHLAK":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinecap="round"
            d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"
          />
          <circle cx="9.5" cy="8" r="3" strokeWidth="2.4" />
          <path strokeWidth="2.4" strokeLinecap="round" d="M15 8h6m-3-3v6" />
        </svg>
      );
    case "MATERI":
      return null;
    case "PERINGKAT":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinejoin="round"
            d="M4 19h16M7 19V9h3v10m4 0V5h3v14"
          />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
  }
}

type DailyChecklistProps = {
  initialShowPrayerPanel?: boolean;
};

export function DailyChecklist({
  initialShowPrayerPanel = false,
}: DailyChecklistProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [fasting, setFasting] = useState(true);
  const [narration, setNarration] = useState("");
  const [sunnahOtherNote, setSunnahOtherNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [hideCompletedItems, setHideCompletedItems] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<CategoryKey>("PILAR_UTAMA");
  const [fikihRamadanTopics, setFikihRamadanTopics] = useState<FikihTopic[]>(
    defaultFikihMaterials,
  );
  const [teacherVideos, setTeacherVideos] = useState<TeacherVideoOption[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleError, setScheduleError] = useState("");
  const [reminderOn, setReminderOn] = useState(true);
  const [showPrayerPanel, setShowPrayerPanel] = useState(
    initialShowPrayerPanel,
  );
  const [activePilarMission, setActivePilarMission] = useState<Mission | null>(
    null,
  );
  const [pilarSheetOpen, setPilarSheetOpen] = useState(false);
  const [prayerReports, setPrayerReports] = useState<
    Partial<Record<(typeof prayerReportOrder)[number], PrayerMode>>
  >({});
  const [murajaahXpBonus, setMurajaahXpBonus] = useState(0);
  const [activePrayerReport, setActivePrayerReport] = useState<
    (typeof prayerReportOrder)[number] | null
  >(null);
  const [hideReportedPrayers, setHideReportedPrayers] = useState(true);
  const [prayerReporting, setPrayerReporting] = useState(false);
  const [prayerModeDraft, setPrayerModeDraft] =
    useState<PrayerMode>("Berjamaah");
  const [showPrayerReward, setShowPrayerReward] = useState(false);
  const [prayerRewardXp, setPrayerRewardXp] = useState(0);
  const [prayerRewardMode, setPrayerRewardMode] =
    useState<PrayerMode>("Berjamaah");
  const [prayerRewardName, setPrayerRewardName] =
    useState<(typeof prayerReportOrder)[number]>("Subuh");
  const [showSunnahReward, setShowSunnahReward] = useState(false);
  const [sunnahRewardName, setSunnahRewardName] = useState("");
  const [sunnahRewardXp, setSunnahRewardXp] = useState(0);
  const [tadarusReportForm, setTadarusReportForm] = useState<TadarusReportForm>(
    {
      surahName: "",
      ayatFrom: "",
      ayatTo: "",
      totalAyatRead: "",
    },
  );
  const [tadarusTotalManual, setTadarusTotalManual] = useState(false);
  const [tadarusSubmitting, setTadarusSubmitting] = useState(false);
  const [tadarusStatus, setTadarusStatus] = useState("");
  const [idulfitriForm, setIdulfitriForm] = useState<IdulfitriForm>({
    place: "",
    khatib: "",
    khutbahSummary: "",
  });
  const [idulfitriSubmitting, setIdulfitriSubmitting] = useState(false);
  const [idulfitriStatus, setIdulfitriStatus] = useState("");
  const [silaturahimForm, setSilaturahimForm] = useState<SilaturahimForm>(
    createEmptySilaturahimForm(),
  );
  const [silaturahimSubmitting, setSilaturahimSubmitting] = useState(false);
  const [silaturahimPhotoUploading, setSilaturahimPhotoUploading] =
    useState(false);
  const [silaturahimStatus, setSilaturahimStatus] = useState("");
  const [silaturahimHistory, setSilaturahimHistory] = useState<
    {
      teacherName: string;
      location: string;
      recordedAt: string;
      purpose?: string;
      lessonSummary?: string;
      proofPhotoUrl?: string;
      proofPhotoObjectKey?: string;
    }[]
  >([]);
  const [kultumForm, setKultumForm] = useState<KultumForm>({
    teacherVideoId: "",
    ringkasan: "",
    poinPelajaranText: "",
  });
  const [kultumSubmitting, setKultumSubmitting] = useState(false);
  const [kultumStatus, setKultumStatus] = useState("");
  const [zakatForm, setZakatForm] = useState<ZakatFitrahForm>({
    via: "",
    address: "",
    date: "",
    form: "Beras",
    amount: "",
  });
  const [infaqShadaqahForm, setInfaqShadaqahForm] = useState<InfaqShadaqahForm>(
    { amount: "" },
  );
  const [takziahZiarahForm, setTakziahZiarahForm] = useState<TakziahZiarahForm>(
    { purpose: "" },
  );
  const [infaqSubmitting, setInfaqSubmitting] = useState(false);
  const [infaqStatus, setInfaqStatus] = useState("");
  const [takziahSubmitting, setTakziahSubmitting] = useState(false);
  const [takziahStatus, setTakziahStatus] = useState("");
  const [zakatSubmitting, setZakatSubmitting] = useState(false);
  const [zakatStatus, setZakatStatus] = useState("");
  const [showZakatReward, setShowZakatReward] = useState(false);
  const [syawalFirstDate, setSyawalFirstDate] = useState<Date | null>(null);
  const [reportDateKey, setReportDateKey] = useState("");
  const [showFastingModal, setShowFastingModal] = useState(false);
  const [showFikihModal, setShowFikihModal] = useState(false);
  const [fikihTopicIndex, setFikihTopicIndex] = useState(0);
  const [fikihSummaries, setFikihSummaries] = useState<Record<string, string>>(
    {},
  );
  const [fikihStatus, setFikihStatus] = useState("");
  const [murajaahDoneCount, setMurajaahDoneCount] = useState(0);
  const [checklistTimestamps, setChecklistTimestamps] = useState<
    Record<number, string>
  >({});
  const [prayerReportTimestamps, setPrayerReportTimestamps] = useState<
    Partial<Record<(typeof prayerReportOrder)[number], string>>
  >({});
  const [now, setNow] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [shouldShowDelayedFastingPrompt, setShouldShowDelayedFastingPrompt] =
    useState(false);
  const selectedSunnahIdeas = useMemo(
    () =>
      new Set(
        sunnahOtherNote
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    [sunnahOtherNote],
  );
  const normalizedTadarusReport = useMemo(() => {
    const surahName = tadarusReportForm.surahName.trim();
    const ayatFrom = Number(tadarusReportForm.ayatFrom);
    const ayatTo = Number(tadarusReportForm.ayatTo);
    const totalAyatRead = Number(tadarusReportForm.totalAyatRead);
    if (!surahName) return undefined;
    if (
      !Number.isInteger(ayatFrom) ||
      !Number.isInteger(ayatTo) ||
      !Number.isInteger(totalAyatRead) ||
      ayatFrom < 1 ||
      ayatTo < 1 ||
      totalAyatRead < 1 ||
      ayatTo < ayatFrom
    ) {
      return undefined;
    }
    return {
      surahName,
      ayatFrom,
      ayatTo,
      totalAyatRead,
    };
  }, [tadarusReportForm]);
  const normalizedKultumReport = useMemo(() => {
    const teacherVideoId = Number(kultumForm.teacherVideoId);
    const ringkasan = kultumForm.ringkasan.trim();
    const poinPelajaran = kultumForm.poinPelajaranText
      .split("\n")
      .map((line) => line.replace(/^[\-\u2022]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (!Number.isInteger(teacherVideoId) || teacherVideoId <= 0) {
      return undefined;
    }
    if (ringkasan.length < 120 || poinPelajaran.length < 1) {
      return undefined;
    }
    return {
      teacherVideoId,
      ringkasan,
      poinPelajaran,
    };
  }, [kultumForm]);
  const autoAyatCount = useMemo(
    () => countAyatRange(tadarusReportForm.ayatFrom, tadarusReportForm.ayatTo),
    [tadarusReportForm.ayatFrom, tadarusReportForm.ayatTo],
  );
  const tadarusXpPreview = useMemo(
    () => calculateTadarusXpPreview(tadarusReportForm.totalAyatRead),
    [tadarusReportForm.totalAyatRead],
  );
  const tadarusAyatLimit = useMemo(
    () => getSurahAyatLimit(tadarusReportForm.surahName),
    [tadarusReportForm.surahName],
  );
  const currentFikihTopic = fikihRamadanTopics[fikihTopicIndex];
  const currentFikihSummary = currentFikihTopic
    ? (fikihSummaries[currentFikihTopic.key] ?? "")
    : "";
  const fikihCompletedCount = useMemo(
    () =>
      fikihRamadanTopics.filter(
        (topic) => (fikihSummaries[topic.key] ?? "").trim().length > 0,
      ).length,
    [fikihSummaries],
  );
  const selectedKultumVideo = useMemo(() => {
    const id = Number(kultumForm.teacherVideoId);
    if (!Number.isInteger(id) || id <= 0) return null;
    return teacherVideos.find((v) => v.id === id) || null;
  }, [kultumForm.teacherVideoId, teacherVideos]);
  const fikihSummaryXp = fikihCompletedCount * FIKIH_XP_PER_SUMMARY;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedReminder = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (savedReminder === "off") {
      setReminderOn(false);
    }
    setSyawalFirstDate(findSyawalFirstDate(1447, new Date()));
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FIKIH_SUMMARY_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, string>;
      if (!parsed || typeof parsed !== "object") return;
      const next: Record<string, string> = {};
      fikihRamadanTopics.forEach((topic) => {
        const value = parsed[topic.key];
        if (typeof value === "string") next[topic.key] = value;
      });
      setFikihSummaries(next);
    } catch {
      // ignore invalid local data
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(
      REMINDER_STORAGE_KEY,
      reminderOn ? "on" : "off",
    );
  }, [mounted, reminderOn]);

  useEffect(() => {
    window.localStorage.setItem(
      FIKIH_SUMMARY_STORAGE_KEY,
      JSON.stringify(fikihSummaries),
    );
  }, [fikihSummaries]);

  useEffect(() => {
    if (!shouldShowDelayedFastingPrompt || !reportDateKey) return;
    const timer = window.setTimeout(() => {
      const promptSeen =
        window.localStorage.getItem(
          `${FASTING_PROMPT_SEEN_KEY_PREFIX}:${reportDateKey}`,
        ) === "1";
      if (!promptSeen) {
        setShowFastingModal(true);
      }
    }, FASTING_MODAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [reportDateKey, shouldShowDelayedFastingPrompt]);

  useEffect(() => {
    if (!tadarusAyatLimit) return;
    setTadarusReportForm((prev) => {
      const ayatFrom = Number(prev.ayatFrom);
      const ayatTo = Number(prev.ayatTo);
      let nextAyatFrom = prev.ayatFrom;
      let nextAyatTo = prev.ayatTo;
      let changed = false;

      if (Number.isInteger(ayatFrom) && ayatFrom > tadarusAyatLimit) {
        nextAyatFrom = String(tadarusAyatLimit);
        changed = true;
      }
      if (Number.isInteger(ayatTo) && ayatTo > tadarusAyatLimit) {
        nextAyatTo = String(tadarusAyatLimit);
        changed = true;
      }
      if (!changed) return prev;

      const next = {
        ...prev,
        ayatFrom: nextAyatFrom,
        ayatTo: nextAyatTo,
      };
      if (!tadarusTotalManual) {
        const computed = countAyatRange(next.ayatFrom, next.ayatTo);
        next.totalAyatRead = computed === null ? "" : String(computed);
      }
      return next;
    });
  }, [tadarusAyatLimit, tadarusTotalManual]);

  useEffect(() => {
    if (!activePilarMission) {
      setPilarSheetOpen(false);
      setActivePrayerReport(null);
      return;
    }
    const timer = window.setTimeout(() => setPilarSheetOpen(true), 10);
    return () => window.clearTimeout(timer);
  }, [activePilarMission]);

  useEffect(() => {
    const panel = searchParams.get("panel");
    setShowPrayerPanel(panel === "prayer");
    const category = searchParams.get("category");
    if (category === "sunnah") setActiveCategory("SUNNAH");
    else if (category === "literasi") setActiveCategory("LITERASI");
    else if (category === "akhlak") setActiveCategory("AKHLAK");
    else if (category === "pilar") setActiveCategory("PILAR_UTAMA");
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      const [mRes, tRes, cRes, vRes, fRes] = await Promise.all([
        fetch("/api/missions", { cache: "no-store" }),
        fetch("/api/reports/today", { cache: "no-store" }),
        fetch(`/api/sholat/cities?keyword=${DEFAULT_CITY_KEYWORD}`, {
          cache: "no-store",
        }),
        fetch("/api/teacher-videos", { cache: "no-store" }),
        fetch("/api/fikih/materials", { cache: "no-store" }),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        setMissions(mData.missions || []);
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        const reportDate =
          typeof tData.reportDate === "string" && tData.reportDate
            ? tData.reportDate
            : new Date().toISOString().slice(0, 10);
        setReportDateKey(reportDate);
        const fastingPromptKey = `${FASTING_PROMPT_SEEN_KEY_PREFIX}:${reportDate}`;
        const fastingPromptValueKey = `${FASTING_PROMPT_VALUE_KEY_PREFIX}:${reportDate}`;
        const hasSeenPrompt =
          window.localStorage.getItem(fastingPromptKey) === "1";
        const storedFastingValue = window.localStorage.getItem(
          fastingPromptValueKey,
        );
        const hasDailyReport = Boolean(tData.report?.answers);
        if (!hasSeenPrompt && !hasDailyReport) {
          setShouldShowDelayedFastingPrompt(true);
        } else if (!hasDailyReport && storedFastingValue) {
          setFasting(storedFastingValue === "fasting");
        }
        if (tData.report?.answers) {
          const selectedMissionIds =
            tData.report.answers.selectedMissionIds || [];
          setSelected(selectedMissionIds);
          setFasting(Boolean(tData.report.answers.fasting));
          const narrationSections = splitNarrationSections(
            tData.report.narration || "",
          );
          setNarration(narrationSections.narrationOnly);
          setSunnahOtherNote(narrationSections.sunnahNote);
          setPrayerReports(tData.report.answers.prayerReports || {});
          const checklistTsRaw = tData.report.answers.checklistTimestamps || {};
          const checklistTs: Record<number, string> = {};
          Object.entries(checklistTsRaw).forEach(([k, v]) => {
            const id = Number(k);
            if (Number.isInteger(id) && typeof v === "string") {
              checklistTs[id] = v;
            }
          });
          const fallbackChecklistTimestamp =
            tData.report.updatedAt ||
            tData.report.createdAt ||
            new Date().toISOString();
          selectedMissionIds.forEach((missionId: number) => {
            if (!checklistTs[missionId]) {
              checklistTs[missionId] = fallbackChecklistTimestamp;
            }
          });
          setChecklistTimestamps(checklistTs);
          setPrayerReportTimestamps(
            tData.report.answers.prayerReportTimestamps || {},
          );
          setMurajaahXpBonus(Number(tData.report.answers.murajaahXpBonus || 0));
          if (tData.report.answers.tadarusReport) {
            setTadarusReportForm({
              surahName: tData.report.answers.tadarusReport.surahName || "",
              ayatFrom: String(
                tData.report.answers.tadarusReport.ayatFrom || "",
              ),
              ayatTo: String(tData.report.answers.tadarusReport.ayatTo || ""),
              totalAyatRead: String(
                tData.report.answers.tadarusReport.totalAyatRead || "",
              ),
            });
            setTadarusTotalManual(false);
          }
          if (tData.report.answers.idulfitriReport) {
            setIdulfitriForm({
              place: tData.report.answers.idulfitriReport.place || "",
              khatib: tData.report.answers.idulfitriReport.khatib || "",
              khutbahSummary:
                tData.report.answers.idulfitriReport.khutbahSummary || "",
            });
          }
          if (tData.report.answers.silaturahimReport) {
            setSilaturahimForm({
              teacherName:
                tData.report.answers.silaturahimReport.teacherName || "",
              location: tData.report.answers.silaturahimReport.location || "",
              recordedAt:
                tData.report.answers.silaturahimReport.recordedAt ||
                new Date().toISOString(),
              purpose: tData.report.answers.silaturahimReport.purpose || "",
              lessonSummary:
                tData.report.answers.silaturahimReport.lessonSummary || "",
              proofPhotoUrl:
                tData.report.answers.silaturahimReport.proofPhotoUrl ||
                tData.report.answers.silaturahimReport.proofPhotoDataUrl ||
                "",
              proofPhotoObjectKey:
                tData.report.answers.silaturahimReport.proofPhotoObjectKey ||
                "",
            });
          } else {
            setSilaturahimForm(
              createEmptySilaturahimForm(new Date().toISOString()),
            );
          }
          if (tData.report.answers.silaturahimHistory) {
            setSilaturahimHistory(tData.report.answers.silaturahimHistory);
          } else {
            setSilaturahimHistory([]);
          }
          if (tData.report.answers.zakatFitrah) {
            setZakatForm({
              via: tData.report.answers.zakatFitrah.via || "",
              address: tData.report.answers.zakatFitrah.address || "",
              date: tData.report.answers.zakatFitrah.date || "",
              form:
                tData.report.answers.zakatFitrah.form === "Uang"
                  ? "Uang"
                  : "Beras",
              amount: tData.report.answers.zakatFitrah.amount || "",
            });
          }
          if (tData.report.answers.infaqShadaqahReport) {
            setInfaqShadaqahForm({
              amount: tData.report.answers.infaqShadaqahReport.amount || "",
            });
          }
          if (tData.report.answers.takziahZiarahReport) {
            setTakziahZiarahForm({
              purpose: tData.report.answers.takziahZiarahReport.purpose || "",
            });
          }
          if (tData.report.answers.kultumReport) {
            setKultumForm({
              teacherVideoId: String(
                tData.report.answers.kultumReport.teacherVideoId || "",
              ),
              ringkasan: tData.report.answers.kultumReport.ringkasan || "",
              poinPelajaranText: Array.isArray(
                tData.report.answers.kultumReport.poinPelajaran,
              )
                ? tData.report.answers.kultumReport.poinPelajaran.join("\n")
                : "",
            });
          }
        }
      } else {
        setChecklistTimestamps({});
        setPrayerReportTimestamps({});
        setSilaturahimForm(
          createEmptySilaturahimForm(new Date().toISOString()),
        );
        setSilaturahimHistory([]);
      }

      if (cRes.ok) {
        const data = await cRes.json();
        const cityList = (data.cities || []) as City[];
        setCities(cityList);

        const savedCity = window.localStorage.getItem(STORAGE_KEY);
        const candidate =
          cityList.find((c) => c.id === savedCity) || cityList[0];
        if (candidate) {
          setSelectedCityId(candidate.id);
        }
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setTeacherVideos((vData.videos || []) as TeacherVideoOption[]);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        const next = Array.isArray(fData.materials)
          ? (fData.materials as FikihTopic[])
          : [];
        if (next.length) {
          setFikihRamadanTopics(next);
          setFikihTopicIndex((prev) => Math.min(prev, next.length - 1));
        }
      }
    };

    void load();
  }, []);

  useEffect(() => {
    setFikihSummaries((prev) => {
      const allowed = new Set(fikihRamadanTopics.map((topic) => topic.key));
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (allowed.has(key)) next[key] = value;
      });
      return next;
    });
  }, [fikihRamadanTopics]);

  useEffect(() => {
    const syncMurajaahProgress = () => {
      const raw = window.localStorage.getItem(MURAJAAH_STORAGE_KEY);
      if (!raw) {
        setMurajaahDoneCount(0);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as number[];
        if (!Array.isArray(parsed)) {
          setMurajaahDoneCount(0);
          return;
        }
        const unique = new Set(
          parsed.filter((v) => Number.isInteger(v) && v >= 78 && v <= 114),
        );
        setMurajaahDoneCount(Math.min(JUZ30_TOTAL_SURAH, unique.size));
      } catch {
        setMurajaahDoneCount(0);
      }
    };

    syncMurajaahProgress();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncMurajaahProgress();
      }
    };
    window.addEventListener("storage", syncMurajaahProgress);
    window.addEventListener("focus", syncMurajaahProgress);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("storage", syncMurajaahProgress);
      window.removeEventListener("focus", syncMurajaahProgress);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!reportDateKey) return;
    setSilaturahimForm((prev) => {
      const prevDate = prev.recordedAt ? prev.recordedAt.slice(0, 10) : "";
      if (prevDate === reportDateKey) return prev;
      return createEmptySilaturahimForm(new Date().toISOString());
    });
  }, [reportDateKey]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!selectedCityId) return;
      setScheduleError("");
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
      const res = await fetch(
        `/api/sholat/schedule?cityId=${encodeURIComponent(selectedCityId)}&tz=${encodeURIComponent(tz)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) {
        setSchedule(null);
        setScheduleError(data.message || "Gagal memuat jadwal sholat.");
        return;
      }
      setSchedule((data.schedule || null) as Schedule | null);
      window.localStorage.setItem(STORAGE_KEY, selectedCityId);
    };

    void loadSchedule();
  }, [selectedCityId]);

  const grouped = useMemo(() => {
    return missions.reduce<Record<string, Mission[]>>((acc, item) => {
      acc[item.category] ||= [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [missions]);

  const activeMissionCategories =
    navItems.find((item) => item.key === activeCategory)?.categories || [];
  let activeMissions = activeMissionCategories.flatMap(
    (category) => grouped[category] || [],
  );
  if (activeCategory === "PILAR_UTAMA") {
    activeMissions = activeMissions.filter((m) => m.code !== "TADARUS_RAMADAN");
  }
  if (activeCategory === "LITERASI") {
    const tadarusFromCore =
      grouped.RAMADAN_INTI?.find((m) => m.code === "TADARUS_RAMADAN") || null;
    if (
      tadarusFromCore &&
      !activeMissions.some((m) => m.id === tadarusFromCore.id)
    ) {
      activeMissions = [tadarusFromCore, ...activeMissions];
    }

    const fikihPlaceholder: Mission = {
      id: -999,
      code: "MATERI_FIKIH_RAMADAN",
      title: "Materi Fikih Ramadan",
      category: "LITERASI_DAKWAH",
      xp: 0,
      requiresNarration: false,
    };
    if (!activeMissions.some((m) => m.code === fikihPlaceholder.code)) {
      activeMissions = [...activeMissions, fikihPlaceholder];
    }
  }
  if (activeCategory === "SUNNAH") {
    activeMissions = activeMissions.filter(
      (m) => m.code !== "SILATURAHIM" && m.code !== "SILATURRAHIM_RAMADAN",
    );
  }
  if (activeCategory === "AKHLAK") {
    const hasAkhlakSilaturahim = activeMissions.some(
      (m) => m.code === "SILATURRAHIM_RAMADAN",
    );
    const silaturahimFromSunnah =
      grouped.IBADAH_SUNNAH?.find((m) => m.code === "SILATURAHIM") || null;
    if (
      !hasAkhlakSilaturahim &&
      silaturahimFromSunnah &&
      !activeMissions.some((m) => m.id === silaturahimFromSunnah.id)
    ) {
      activeMissions = [silaturahimFromSunnah, ...activeMissions];
    }
  }
  const isPilarStyleCategory =
    activeCategory === "PILAR_UTAMA" ||
    activeCategory === "SUNNAH" ||
    activeCategory === "LITERASI" ||
    activeCategory === "AKHLAK";
  const visibleMissions =
    isPilarStyleCategory && hideCompletedItems
      ? activeMissions.filter((m) => !selected.includes(m.id))
      : activeMissions;
  const missionXpValue = (mission: Mission) =>
    mission.code === "SILATURAHIM" || mission.code === "SILATURRAHIM_RAMADAN"
      ? 20
      : mission.code === "REFLEKSI_DIRI"
        ? 15
        : mission.code === "TADARUS_RAMADAN"
          ? tadarusXpPreview
          : mission.xp;

  const countdown = useMemo(() => {
    if (!schedule) {
      return {
        currentLabel: "Sholat",
        currentKey: "",
        currentAtMs: 0,
        nextLabel: "Sholat",
        currentTime: "--:--",
        nextTime: "--:--",
        remaining: "--:--",
        progress: 0,
        isNextSoon: false,
      };
    }

    const entries = [
      { key: "subuh", label: "Subuh", time: schedule.times.subuh },
      { key: "dzuhur", label: "Dzuhur", time: schedule.times.dzuhur },
      { key: "ashar", label: "Ashar", time: schedule.times.ashar },
      { key: "maghrib", label: "Maghrib", time: schedule.times.maghrib },
      { key: "isya", label: "Isya", time: schedule.times.isya },
    ];

    const currentDate = new Date(now);
    const dated = entries.map((item) => ({
      ...item,
      at: parseTimeForDate(currentDate, item.time),
    }));

    let next = dated.find((item) => item.at > now) || null;
    let current =
      [...dated].reverse().find((item) => item.at <= now) || dated[0];

    if (!next) {
      next = {
        ...dated[0],
        at: new Date(
          parseTimeForDate(new Date(now), dated[0].time).getTime() +
            24 * 3600 * 1000,
        ),
      };
      current = dated[dated.length - 1];
    }

    const span = Math.max(1, next.at.getTime() - current.at.getTime());
    const passed = Math.max(0, now.getTime() - current.at.getTime());
    const progress = Math.max(
      0,
      Math.min(100, Math.round((passed / span) * 100)),
    );
    const remainingSec = Math.floor((next.at.getTime() - now.getTime()) / 1000);

    return {
      currentLabel: `Sholat ${current.label}`,
      currentKey: current.key,
      currentAtMs: current.at.getTime(),
      nextLabel: `Sholat ${next.label}`,
      currentTime: current.time,
      nextTime: next.time,
      remaining: formatCountdown(remainingSec),
      progress,
      isNextSoon: remainingSec <= 15 * 60,
    };
  }, [now, schedule]);

  const lastAlertKeyRef = useRef<string>("");
  useEffect(() => {
    if (!reminderOn) return;
    if (!schedule || !countdown.currentKey || !countdown.currentAtMs) return;

    const elapsedSec = Math.floor(
      (now.getTime() - countdown.currentAtMs) / 1000,
    );
    if (elapsedSec < 0 || elapsedSec > 45) return;

    const alertKey = `${schedule.dateKey}:${countdown.currentKey}`;
    if (lastAlertKeyRef.current === alertKey) return;
    lastAlertKeyRef.current = alertKey;

    if (typeof window === "undefined") return;
    const AudioContextImpl =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextImpl) return;

    const ctx = new AudioContextImpl();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const playBeep = (when: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.38);
    };

    const startAt = ctx.currentTime + 0.02;
    playBeep(startAt, 760);
    playBeep(startAt + 0.45, 880);
    playBeep(startAt + 0.9, 760);

    window.setTimeout(() => {
      void ctx.close();
    }, 1800);
  }, [countdown.currentAtMs, countdown.currentKey, now, reminderOn, schedule]);

  const gaugePath = "M 20 120 A 120 120 0 0 1 260 120";
  const gaugeLength = 377;
  const gaugeProgressLength = (countdown.progress / 100) * gaugeLength;

  const toggleMission = (id: number) => {
    const clickedAt = new Date().toISOString();
    setSelected((prev) => {
      if (prev.includes(id)) {
        setChecklistTimestamps((prevTs) => {
          const next = { ...prevTs };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      setChecklistTimestamps((prevTs) => ({
        ...prevTs,
        [id]: clickedAt,
      }));
      return [...prev, id];
    });
  };
  const addSunnahIdea = (idea: string) => {
    setSunnahOtherNote((prev) => {
      const lines = prev
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.includes(idea)) return prev;
      return [...lines, idea].join("\n");
    });
  };
  const addReflectionIdea = (idea: string) => {
    setNarration((prev) => {
      const cleanPrev = prev.trim();
      const nextLine = `- ${idea}: `;
      if (!cleanPrev) return nextLine;
      if (cleanPrev.includes(nextLine)) return prev;
      return `${prev}\n${nextLine}`;
    });
  };

  const pickFastingStatus = (value: boolean) => {
    setFasting(value);
    if (reportDateKey) {
      window.localStorage.setItem(
        `${FASTING_PROMPT_SEEN_KEY_PREFIX}:${reportDateKey}`,
        "1",
      );
      window.localStorage.setItem(
        `${FASTING_PROMPT_VALUE_KEY_PREFIX}:${reportDateKey}`,
        value ? "fasting" : "not_fasting",
      );
      window.localStorage.setItem(
        FASTING_CONFIRMATION_KEY,
        JSON.stringify({
          date: reportDateKey,
          status: value ? "fasting" : "not_fasting",
        }),
      );
      window.dispatchEvent(new Event(FASTING_CONFIRMATION_UPDATED_EVENT));
    }
    setShowFastingModal(false);
    setShouldShowDelayedFastingPrompt(false);
  };

  const submit = async () => {
    setSaving(true);
    setStatus("");
    try {
      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;
      const normalizedInfaqShadaqah = infaqShadaqahForm.amount.trim()
        ? infaqShadaqahForm
        : undefined;
      const normalizedTakziahZiarah = takziahZiarahForm.purpose.trim()
        ? takziahZiarahForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds: selected,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          fikihXpBonus: fikihSummaryXp,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: normalizedZakat,
          silaturahimReport: normalizedSilaturahim,
          infaqShadaqahReport: normalizedInfaqShadaqah,
          takziahZiarahReport: normalizedTakziahZiarah,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || "Gagal menyimpan laporan.");
        setSaving(false);
        return;
      }
      const idulfitriNote =
        data?.meta?.idulfitriIgnored && data?.meta?.idulfitriIgnoredReason
          ? ` (${data.meta.idulfitriIgnoredReason})`
          : "";
      setStatus(
        `Laporan tersimpan. XP hari ini: ${data.xp.xpGained}${idulfitriNote}`,
      );
    } catch (err) {
      console.error(err);
      setStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const submitZakatReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "ZAKAT_FITRAH")
      return;
    if (
      !zakatForm.via ||
      !zakatForm.address ||
      !zakatForm.date ||
      !zakatForm.amount
    ) {
      setZakatStatus("Semua field zakat fitrah wajib diisi.");
      return;
    }
    setZakatSubmitting(true);
    setZakatStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const selectedMissionIds = selected.includes(activePilarMission.id)
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: zakatForm,
          silaturahimReport: normalizedSilaturahim,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setZakatStatus(data.message || "Gagal mengirim laporan zakat fitrah.");
        setZakatSubmitting(false);
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setZakatStatus("Laporan zakat fitrah berhasil dikirim.");
      setShowZakatReward(true);
      window.setTimeout(() => setShowZakatReward(false), 2400);
    } catch (err) {
      console.error(err);
      setZakatStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setZakatSubmitting(false);
    }
  };

  const submitInfaqShadaqahReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "INFAQ_SHADAQAH") {
      return;
    }
    if (!infaqShadaqahForm.amount.trim()) {
      setInfaqStatus("Jumlah infaq/shadaqah wajib diisi.");
      return;
    }
    setInfaqSubmitting(true);
    setInfaqStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const selectedMissionIds = selected.includes(activePilarMission.id)
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          fikihXpBonus: fikihSummaryXp,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          infaqShadaqahReport: infaqShadaqahForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInfaqStatus(
          data.message || "Gagal mengirim laporan infaq/shadaqah.",
        );
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setInfaqStatus("Laporan infaq/shadaqah berhasil dikirim.");
    } catch (err) {
      console.error(err);
      setInfaqStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setInfaqSubmitting(false);
    }
  };

  const submitTakziahZiarahReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "TAKZIAH_ZIARAH") {
      return;
    }
    if (!takziahZiarahForm.purpose.trim()) {
      setTakziahStatus("Tujuan takziah/ziarah wajib diisi.");
      return;
    }
    setTakziahSubmitting(true);
    setTakziahStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const selectedMissionIds = selected.includes(activePilarMission.id)
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          fikihXpBonus: fikihSummaryXp,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          takziahZiarahReport: takziahZiarahForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTakziahStatus(
          data.message || "Gagal mengirim laporan takziah/ziarah.",
        );
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setTakziahStatus("Laporan takziah/ziarah berhasil dikirim.");
    } catch (err) {
      console.error(err);
      setTakziahStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setTakziahSubmitting(false);
    }
  };

  const submitPrayerReport = async () => {
    if (!activePrayerReport) return;
    setPrayerReporting(true);
    setStatus("");
    try {
      const prayerName = activePrayerReport;
      const selectedMode = prayerModeDraft;
      const nextPrayerReports = {
        ...prayerReports,
        [prayerName]: selectedMode,
      };
      const nextPrayerReportTimestamps = {
        ...prayerReportTimestamps,
        [prayerName]: new Date().toISOString(),
      };

      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds: selected,
          fasting,
          narration: narrationPayload,
          prayerReports: nextPrayerReports,
          checklistTimestamps,
          prayerReportTimestamps: nextPrayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: normalizedZakat,
          silaturahimReport: normalizedSilaturahim,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || "Gagal melapor shalat.");
        setPrayerReporting(false);
        return;
      }
      setPrayerReports(nextPrayerReports);
      setPrayerReportTimestamps(nextPrayerReportTimestamps);
      setActivePrayerReport(null);
      setPrayerRewardName(prayerName);
      setPrayerRewardMode(selectedMode);
      setPrayerRewardXp(prayerXpByMode[selectedMode]);
      setShowPrayerReward(true);
      window.setTimeout(() => setShowPrayerReward(false), 2400);
    } catch (err) {
      console.error(err);
      setStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setPrayerReporting(false);
    }
  };

  const submitIdulfitriReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "SHALAT_IDULFITRI")
      return;
    if (!isIdulfitriFormActive) {
      setIdulfitriStatus("Form aktif pada tanggal 1 Syawal.");
      return;
    }
    if (
      !idulfitriForm.place.trim() ||
      !idulfitriForm.khatib.trim() ||
      !idulfitriForm.khutbahSummary.trim()
    ) {
      setIdulfitriStatus("Semua field Shalat Idulfitri wajib diisi.");
      return;
    }
    setIdulfitriSubmitting(true);
    setIdulfitriStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const selectedMissionIds = selected.includes(activePilarMission.id)
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          idulfitriReport: idulfitriForm,
          zakatFitrah: normalizedZakat,
          silaturahimReport: normalizedSilaturahim,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIdulfitriStatus(data.message || "Gagal mengirim laporan Idulfitri.");
        setIdulfitriSubmitting(false);
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setIdulfitriStatus("Laporan Shalat Idulfitri berhasil dikirim.");
    } catch (err) {
      console.error(err);
      setIdulfitriStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIdulfitriSubmitting(false);
    }
  };
  const submitSilaturahimReport = async () => {
    if (
      !activePilarMission ||
      (activePilarMission.code !== "SILATURAHIM" &&
        activePilarMission.code !== "SILATURRAHIM_RAMADAN")
    )
      return;
    if (
      !silaturahimForm.teacherName.trim() ||
      !silaturahimForm.location.trim() ||
      !silaturahimForm.recordedAt
    ) {
      setSilaturahimStatus(
        "Nama guru, alamat/lokasi, dan timestamp wajib diisi.",
      );
      return;
    }
    setSilaturahimSubmitting(true);
    setSilaturahimStatus("");
    try {
      const alreadyCompleted = selected.includes(activePilarMission.id);
      const selectedMissionIds = alreadyCompleted
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: silaturahimForm.recordedAt,
      };

      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: normalizedTadarusReport,
          kultumReport: normalizedKultumReport,
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: normalizedZakat,
          silaturahimReport: silaturahimForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSilaturahimStatus(
          data.message || "Gagal mengirim laporan Silaturahim.",
        );
        setSilaturahimSubmitting(false);
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);

      const newHistoryItem = { ...silaturahimForm };
      const nextHistory = [...silaturahimHistory, newHistoryItem];
      setSilaturahimHistory(nextHistory);
      setSilaturahimForm(createEmptySilaturahimForm(new Date().toISOString()));

      setSilaturahimStatus(
        "Laporan Silaturahim berhasil dikirim. Form telah direset.",
      );
      if (!alreadyCompleted) {
        setSunnahRewardName(activePilarMission.title);
        setSunnahRewardXp(20);
        setShowSunnahReward(true);
        window.setTimeout(() => setShowSunnahReward(false), 2400);
      }
    } catch (err) {
      console.error(err);
      setSilaturahimStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setSilaturahimSubmitting(false);
    }
  };
  const submitTadarusReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "TADARUS_RAMADAN")
      return;
    const surahName = tadarusReportForm.surahName.trim();
    const ayatFrom = Number(tadarusReportForm.ayatFrom);
    const ayatTo = Number(tadarusReportForm.ayatTo);
    const totalAyatRead = Number(tadarusReportForm.totalAyatRead);
    if (!surahName) {
      setTadarusStatus("Nama surat wajib diisi.");
      return;
    }
    if (
      !Number.isInteger(ayatFrom) ||
      !Number.isInteger(ayatTo) ||
      ayatFrom < 1 ||
      ayatTo < 1
    ) {
      setTadarusStatus("Ayat awal dan akhir harus berupa angka bulat >= 1.");
      return;
    }
    if (ayatTo < ayatFrom) {
      setTadarusStatus("Ayat akhir tidak boleh lebih kecil dari ayat awal.");
      return;
    }
    if (!Number.isInteger(totalAyatRead) || totalAyatRead < 1) {
      setTadarusStatus("Jumlah ayat dibaca harus berupa angka bulat >= 1.");
      return;
    }
    setTadarusSubmitting(true);
    setTadarusStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const alreadyCompleted = selected.includes(activePilarMission.id);
      const selectedMissionIds = alreadyCompleted
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: {
            surahName,
            ayatFrom,
            ayatTo,
            totalAyatRead,
          },
          kultumReport: normalizedKultumReport,
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: normalizedZakat,
          silaturahimReport: normalizedSilaturahim,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTadarusStatus(data.message || "Gagal mengirim laporan tadarus.");
        setTadarusSubmitting(false);
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setTadarusStatus("Laporan baca Al-Qur'an harian berhasil dikirim.");
    } catch (err) {
      console.error(err);
      setTadarusStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setTadarusSubmitting(false);
    }
  };
  const submitKultumReport = async () => {
    if (!activePilarMission || activePilarMission.code !== "KULTUM_CERAMAH")
      return;
    const teacherVideoId = Number(kultumForm.teacherVideoId);
    const ringkasan = kultumForm.ringkasan.trim();
    const poinPelajaran = kultumForm.poinPelajaranText
      .split("\n")
      .map((line) => line.replace(/^[\-\u2022]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!Number.isInteger(teacherVideoId) || teacherVideoId <= 0) {
      setKultumStatus("Pilih video kultum yang disediakan guru.");
      return;
    }
    if (ringkasan.length < 120) {
      setKultumStatus("Ringkasan minimal 120 karakter.");
      return;
    }
    if (poinPelajaran.length < 1) {
      setKultumStatus("Isi minimal 1 poin pelajaran.");
      return;
    }
    setKultumSubmitting(true);
    setKultumStatus("");
    try {
      const submittedAt = new Date().toISOString();
      const alreadyCompleted = selected.includes(activePilarMission.id);
      const selectedMissionIds = alreadyCompleted
        ? selected
        : [...selected, activePilarMission.id];
      const nextChecklistTimestamps = {
        ...checklistTimestamps,
        [activePilarMission.id]: submittedAt,
      };

      const normalizedIdulfitri = idulfitriForm.place.trim()
        ? idulfitriForm
        : undefined;
      const normalizedZakat = zakatForm.via.trim() ? zakatForm : undefined;
      const normalizedSilaturahim = silaturahimForm.teacherName.trim()
        ? silaturahimForm
        : undefined;

      const narrationPayload = mergeNarrationWithSunnah(
        narration,
        sunnahOtherNote,
      );
      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds,
          fasting,
          narration: narrationPayload,
          prayerReports,
          checklistTimestamps: nextChecklistTimestamps,
          prayerReportTimestamps,
          murajaahXpBonus,
          tadarusReport: normalizedTadarusReport,
          kultumReport: {
            teacherVideoId,
            ringkasan,
            poinPelajaran,
          },
          idulfitriReport: normalizedIdulfitri,
          zakatFitrah: normalizedZakat,
          silaturahimReport: normalizedSilaturahim,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKultumStatus(data.message || "Gagal mengirim laporan kultum.");
        setKultumSubmitting(false);
        return;
      }
      setSelected(selectedMissionIds);
      setChecklistTimestamps(nextChecklistTimestamps);
      setKultumStatus("Laporan kultum berhasil dikirim.");
    } catch (err) {
      console.error(err);
      setKultumStatus("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setKultumSubmitting(false);
    }
  };
  const handleSilaturahimPhotoChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSilaturahimPhotoUploading(true);
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setSilaturahimStatus("Ukuran foto maksimal 2MB.");
      setSilaturahimPhotoUploading(false);
      event.currentTarget.value = "";
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/silaturahim", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setSilaturahimStatus(data.message || "Gagal mengunggah foto.");
        return;
      }
      setSilaturahimForm((prev) => ({
        ...prev,
        proofPhotoUrl: data.url || "",
        proofPhotoObjectKey: data.objectKey || "",
      }));
      setSilaturahimStatus("Foto bukti berhasil diunggah.");
    } catch (error) {
      console.error(error);
      setSilaturahimStatus("Gagal mengunggah foto ke server.");
    } finally {
      setSilaturahimPhotoUploading(false);
      event.currentTarget.value = "";
    }
  };

  const prayerGrid = schedule
    ? [
        { label: "Imsak", value: schedule.times.imsak },
        { label: "Subuh", value: schedule.times.subuh },
        { label: "Terbit", value: schedule.times.terbit },
        { label: "Dhuha", value: schedule.times.dhuha },
        { label: "Dzuhur", value: schedule.times.dzuhur },
        { label: "Ashar", value: schedule.times.ashar },
        { label: "Maghrib", value: schedule.times.maghrib },
        { label: "Isya", value: schedule.times.isya },
      ]
    : [];
  const prayerReportRows = [
    { label: "Subuh", value: schedule?.times.subuh || "--:--" },
    { label: "Dzuhur", value: schedule?.times.dzuhur || "--:--" },
    { label: "Ashar", value: schedule?.times.ashar || "--:--" },
    { label: "Maghrib", value: schedule?.times.maghrib || "--:--" },
    { label: "Isya", value: schedule?.times.isya || "--:--" },
  ] as const;
  const prayerEarnedXp = useMemo(
    () =>
      prayerReportOrder.reduce((acc, key) => {
        const mode = prayerReports[key];
        if (!mode) return acc;
        return acc + prayerXpByMode[mode];
      }, 0),
    [prayerReports],
  );
  const reportedPrayerCount = useMemo(
    () =>
      prayerReportOrder.reduce(
        (acc, key) => (prayerReports[key] ? acc + 1 : acc),
        0,
      ),
    [prayerReports],
  );
  const visiblePrayerReportRows = hideReportedPrayers
    ? prayerReportRows.filter((item) => !prayerReports[item.label])
    : prayerReportRows;
  const syawalCountdownParts = useMemo(() => {
    if (!syawalFirstDate) return null;
    const diffSec = Math.max(
      0,
      Math.floor((syawalFirstDate.getTime() - now.getTime()) / 1000),
    );
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    return { days, hours, minutes, seconds };
  }, [now, syawalFirstDate]);
  const syawalCountdownRings = useMemo(() => {
    if (!syawalCountdownParts) {
      return [
        { label: "DAYS", value: "--", progress: 0 },
        { label: "HOURS", value: "--", progress: 0 },
        { label: "MINUTES", value: "--", progress: 0 },
        { label: "SECONDS", value: "--", progress: 0 },
      ];
    }
    const dayBase = Math.max(30, syawalCountdownParts.days || 1);
    const dayProgress = Math.min(
      100,
      Math.max(0, Math.round((1 - syawalCountdownParts.days / dayBase) * 100)),
    );
    return [
      {
        label: "DAYS",
        value: String(syawalCountdownParts.days),
        progress: dayProgress,
      },
      {
        label: "HOURS",
        value: String(syawalCountdownParts.hours).padStart(2, "0"),
        progress: Math.round((syawalCountdownParts.hours / 24) * 100),
      },
      {
        label: "MINUTES",
        value: String(syawalCountdownParts.minutes).padStart(2, "0"),
        progress: Math.round((syawalCountdownParts.minutes / 60) * 100),
      },
      {
        label: "SECONDS",
        value: String(syawalCountdownParts.seconds).padStart(2, "0"),
        progress: Math.round((syawalCountdownParts.seconds / 60) * 100),
      },
    ];
  }, [syawalCountdownParts]);
  const isIdulfitriFormActive = useMemo(() => {
    if (!reportDateKey) return false;
    const base = new Date(`${reportDateKey}T00:00:00+07:00`);
    if (Number.isNaN(base.getTime())) return false;
    const { day, isSyawal } = getIslamicDateParts(base);
    return isSyawal && day === 1;
  }, [reportDateKey]);

  const openFikihModal = () => {
    setFikihTopicIndex(0);
    setFikihStatus("");
    setShowFikihModal(true);
  };

  const saveCurrentFikihSummary = () => {
    if (!currentFikihTopic) return false;
    if (!currentFikihSummary.trim()) {
      setFikihStatus("Ringkasan materi ini wajib diisi sebelum lanjut.");
      return false;
    }
    setFikihStatus("Ringkasan tersimpan.");
    return true;
  };

  const goToNextFikihTopic = () => {
    if (!saveCurrentFikihSummary()) return;
    setFikihStatus("");
    setFikihTopicIndex((prev) =>
      Math.min(prev + 1, fikihRamadanTopics.length - 1),
    );
  };

  const mobileBottomNav = (
    <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-brand-300/70 bg-gradient-to-b from-brand-800 to-brand-900 px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.42)] backdrop-blur dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 sm:hidden">
      <div className="mb-2 flex justify-center">
        <span className="h-1 w-12 rounded-full bg-brand-200/50 dark:bg-slate-500/60" />
      </div>
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1.5">
        {mobileNavItems.map((item) =>
          item.kind === "category" ? (
            <button
              key={item.label}
              type="button"
              onClick={() => setActiveCategory(item.target)}
              title={item.label}
              aria-label={item.label}
              className={`flex h-[62px] flex-col items-center justify-center gap-1 rounded-xl px-1 ${
                activeCategory === item.target
                  ? "border border-brand-200/80 bg-white/15 text-white dark:border-brand-500/50 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-brand-100/85 hover:text-white dark:text-slate-300 dark:hover:text-slate-100"
              }`}
            >
              <BottomNavIcon label={item.label} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">
                {item.label}
              </span>
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`flex h-[62px] flex-col items-center justify-center gap-1 rounded-xl px-1 ${
                pathname === item.href
                  ? "border border-brand-200/80 bg-white/15 text-white dark:border-brand-500/50 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-brand-100/85 hover:text-white dark:text-slate-300 dark:hover:text-slate-100"
              }`}
            >
              <BottomNavIcon label={item.label} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">
                {item.label}
              </span>
            </Link>
          ),
        )}
      </div>
    </nav>
  );

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
        strategy="afterInteractive"
      />
      <div className="space-y-4">
        {showPrayerPanel ? (
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-lg shadow-slate-200/60 backdrop-blur sm:p-5 dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-slate-950/40">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Waktu Ibadah & Jadwal Sholat
              </h2>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-4 text-white ring-1 ring-brand-300/20 sm:p-5 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 dark:ring-brand-700/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-100/90">
                    Lokasi sholat
                  </p>
                  <p className="text-lg font-semibold leading-tight">
                    {schedule?.cityName || "Memuat lokasi..."}
                  </p>
                </div>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="rounded-full border border-brand-200/35 bg-white/10 px-3 py-1.5 text-xs text-brand-50 outline-none backdrop-blur"
                >
                  <option value="">Pilih Kota</option>
                  {cities.map((city) => (
                    <option
                      key={city.id}
                      value={city.id}
                      className="text-slate-900"
                    >
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-[22px] border border-brand-300/35 bg-gradient-to-b from-brand-600/60 to-brand-800/70 px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-[11px] uppercase tracking-[0.17em] text-brand-100/90">
                  Countdown Waktu Ibadah
                </p>

                <div className="relative mt-2 h-[170px] overflow-visible sm:h-[182px]">
                  <svg
                    viewBox="0 0 280 140"
                    className="absolute left-1/2 top-0 h-[122px] w-[248px] -translate-x-1/2 overflow-visible sm:h-[132px] sm:w-[268px]"
                    aria-hidden
                  >
                    <path
                      d="M 20 120 A 120 120 0 0 1 260 120"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    <path
                      d={gaugePath}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={`${gaugeProgressLength} ${gaugeLength}`}
                      style={{ transition: "stroke-dasharray 0.6s ease" }}
                    />
                  </svg>

                  <div className="absolute bottom-0 left-1/2 w-[230px] -translate-x-1/2 rounded-2xl border border-brand-300/55 bg-brand-700 px-3 py-2 text-center shadow-[0_10px_24px_rgba(26,63,32,0.35)] sm:w-[248px] sm:py-3 dark:bg-brand-800">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-brand-100">
                      MENUJU {countdown.nextLabel.toUpperCase()}
                    </p>
                    <p className="mt-1 text-[52px] font-semibold leading-[0.9] text-white">
                      {countdown.remaining}
                    </p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-brand-50">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.13em] text-brand-200/95">
                      Saat Ini
                    </p>
                    <p className="font-semibold">{countdown.currentLabel}</p>
                    <p className="font-semibold text-brand-200">
                      {countdown.currentTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.13em] text-brand-200/95">
                      Berikutnya
                    </p>
                    <p className="font-semibold">{countdown.nextLabel}</p>
                    <p className="font-semibold text-brand-200">
                      {countdown.nextTime}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReminderOn((prev) => !prev)}
                  className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                    reminderOn
                      ? "border-brand-200/20 bg-brand-900/35 text-brand-100"
                      : "border-slate-400/25 bg-slate-800/60 text-slate-300"
                  }`}
                  aria-pressed={reminderOn}
                >
                  <span>Suara Pengingat Sholat</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${
                      reminderOn
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "bg-slate-300/20 text-slate-200"
                    }`}
                  >
                    {reminderOn ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              {scheduleError ? (
                <p className="mt-3 text-sm text-amber-200">{scheduleError}</p>
              ) : null}

              <div className="mt-4 grid grid-cols-4 gap-2">
                {prayerGrid.map((item) => {
                  const active = countdown.nextLabel.includes(item.label);
                  return (
                    <article
                      key={item.label}
                      className={`rounded-2xl border px-2 py-3 text-center transition ${
                        active
                          ? "border-amber-500/70 bg-gradient-to-br from-amber-900/40 to-amber-950/50 text-amber-200 shadow-[0_8px_24px_rgba(244,160,54,0.18)]"
                          : "border-brand-300/25 bg-gradient-to-b from-brand-900/40 to-slate-900/60 text-slate-100"
                      }`}
                    >
                      <p
                        className={`text-[11px] sm:text-sm ${
                          active ? "text-amber-200/95" : "text-brand-100/80"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white sm:text-[33px]">
                        {item.value}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-[28px] border border-brand-200/40 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-4 shadow-lg shadow-brand-900/20 sm:p-5 dark:border-brand-800/40 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand-300/45 blur-[1px] dark:bg-brand-700/35"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-20 h-60 w-60 rounded-full bg-brand-800/60 dark:bg-slate-800/70"
          />
          <div className="relative z-10">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Checklist Aktivitas Ramadan
              </h2>
              <p className="mt-1 text-sm text-emerald-100">
                Catat aktivitas Ramadan harian untuk menjaga progres ibadah dan
                kebiasaan baik.
              </p>
            </div>

            <div className="mt-4 hidden grid-cols-2 gap-2 sm:grid lg:grid-cols-4">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveCategory(item.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    activeCategory === item.key
                      ? "border-white/70 bg-white text-brand-800"
                      : "border-white/35 bg-white/10 text-brand-50 hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 pb-24 sm:pb-0">
              {isPilarStyleCategory ? (
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setHideCompletedItems((prev) => !prev)}
                    className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-50 transition hover:bg-white/15"
                  >
                    {hideCompletedItems
                      ? "Tampilkan Yang Sudah Dikerjakan"
                      : "Sembunyikan Yang Sudah Dikerjakan"}
                  </button>
                </div>
              ) : null}

              {isPilarStyleCategory ? (
                <div className="relative pl-9">
                  <div className="absolute bottom-0 left-3.5 top-1 rounded-full border-l border-white/50" />
                  <div className="space-y-4">
                    {visibleMissions.map((m) => {
                      const detail = missionDetails[m.code];
                      const isMurajaah = m.code === "HAFALAN_SURAT_PENDEK";
                      const isFikih = m.code === "MATERI_FIKIH_RAMADAN";
                      const fikihPercent = Math.round(
                        (fikihCompletedCount / fikihRamadanTopics.length) * 100,
                      );
                      const done = isMurajaah
                        ? murajaahDoneCount >= 20
                        : isFikih
                          ? fikihCompletedCount >= fikihRamadanTopics.length
                          : selected.includes(m.id);
                      const isShalatLimaWaktu =
                        m.code === "CATATAN_PUASA_DAN_JAMAAH";
                      const murajaahPercent = Math.min(
                        100,
                        Math.round(
                          (murajaahDoneCount / MURAJAAH_TARGET_SURAH) * 100,
                        ),
                      );
                      const displayXp = isMurajaah
                        ? murajaahXpBonus
                        : isShalatLimaWaktu
                          ? prayerEarnedXp
                          : done
                            ? missionXpValue(m)
                            : 0;
                      const progressPercent = isMurajaah
                        ? murajaahPercent
                        : isFikih
                          ? fikihPercent
                          : isShalatLimaWaktu
                            ? Math.round(
                                (reportedPrayerCount /
                                  prayerReportOrder.length) *
                                  100,
                              )
                            : done
                              ? 100
                              : 0;
                      return (
                        <article key={m.id} className="relative">
                          <span
                            className={`absolute -left-[31px] top-16 h-4 w-4 rounded-full border-2 ${
                              done
                                ? "border-emerald-200 bg-emerald-400"
                                : "border-brand-100 bg-white"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (m.code === "HAFALAN_SURAT_PENDEK") {
                                router.push("/murajaah" as Route);
                                return;
                              }
                              if (m.code === "MATERI_FIKIH_RAMADAN") {
                                openFikihModal();
                                return;
                              }
                              setActivePilarMission(m);
                            }}
                            className="w-full rounded-3xl bg-slate-100 p-5 text-left text-slate-700 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-800"
                          >
                            {done ? (
                              <div className="mb-2 space-y-0.5">
                                <span className="inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                                  Selesai
                                </span>
                                {checklistTimestamps[m.id] ? (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-300">
                                    Dicentang:{" "}
                                    {formatRecordedAt(
                                      checklistTimestamps[m.id],
                                    )}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-100">
                              {detail?.title || m.title}
                            </h3>
                            {isMurajaah ? (
                              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                Saya hafal {murajaahDoneCount} dari total surat
                                pendek juz 30 ({JUZ30_TOTAL_SURAH} surat)
                              </p>
                            ) : null}
                            {isFikih ? (
                              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                Ringkasan terisi {fikihCompletedCount}/
                                {fikihRamadanTopics.length} materi
                              </p>
                            ) : null}
                            <p className="mt-2 text-[32px] leading-none text-slate-200 dark:text-slate-700/70">
                              —
                            </p>
                            <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-200">
                              {detail?.description ||
                                "Selesaikan aktivitas ini untuk menambah progress ibadah harian."}
                            </p>
                            {isFikih ? (
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                                  Baca Materi & Isi Ringkasan
                                </span>
                                <span className="text-slate-500 dark:text-slate-300">
                                  {progressPercent}%
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-500/70">
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                  <span className="font-semibold text-orange-500">
                                    ★ {displayXp}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-300">
                                    {progressPercent}%
                                  </span>
                                </div>
                              </>
                            )}
                          </button>
                        </article>
                      );
                    })}
                    {!visibleMissions.length ? (
                      <p className="rounded-lg border border-dashed border-white/40 bg-white/10 p-3 text-sm text-brand-50">
                        {activeMissions.length
                          ? "Semua aktivitas pada kategori ini sudah dikerjakan."
                          : "Belum ada aktivitas pada kategori ini."}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeMissions.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <span className="flex items-center gap-2 text-sm dark:text-slate-100">
                        <input
                          type="checkbox"
                          checked={selected.includes(m.id)}
                          onChange={() => toggleMission(m.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {m.title}
                      </span>
                      <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                        +{missionXpValue(m)} XP
                      </span>
                    </label>
                  ))}
                  {!activeMissions.length ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      Belum ada aktivitas pada kategori ini.
                    </p>
                  ) : null}
                </div>
              )}

              {status && <p className="mt-2 text-sm text-brand-50">{status}</p>}
            </div>
          </div>
        </section>
      </div>
      {showFastingModal ? (
        <div className="fixed inset-0 z-[148] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
              Checklist Harian
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Saya berpuasa hari ini
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Pilih status puasa hari ini untuk mengisi checklist harian
              Ramadan.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => pickFastingStatus(true)}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Saya berpuasa
              </button>
              <button
                type="button"
                onClick={() => pickFastingStatus(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Tidak berpuasa
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showFikihModal ? (
        <div className="fixed inset-0 z-[152] flex items-end bg-slate-950/45 p-0 sm:p-4">
          <div className="w-full rounded-t-3xl border border-brand-300/45 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-brand-50 shadow-2xl ring-1 ring-brand-200/25 sm:mx-auto sm:max-w-2xl sm:rounded-3xl dark:border-brand-800/50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 sm:hidden" />
            <h3 className="text-xl font-bold text-brand-50">
              Materi Fikih Ramadan
            </h3>
            <p className="mt-1 text-sm text-brand-100/95">
              Satu materi per halaman. Isi ringkasan pada setiap materi.
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-brand-100">
              <span>
                Materi {fikihTopicIndex + 1} dari {fikihRamadanTopics.length}
              </span>
              <span>
                Ringkasan selesai: {fikihCompletedCount}/
                {fikihRamadanTopics.length}
              </span>
            </div>
            {currentFikihTopic ? (
              <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto rounded-2xl border border-brand-100/35 bg-brand-950/20 p-3 dark:border-brand-800/40 dark:bg-slate-900/55">
                <article className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {currentFikihTopic.title}
                  </p>
                  <div className="mt-3 space-y-3">
                    {currentFikihTopic.sections.map((section) => (
                      <div key={section.title}>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {section.title}
                        </p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                          {section.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>

                <label className="block text-xs font-bold uppercase tracking-[0.08em] text-brand-100">
                  Ringkasan Siswa (Wajib)
                  <textarea
                    value={currentFikihSummary}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFikihSummaries((prev) => ({
                        ...prev,
                        [currentFikihTopic.key]: value,
                      }));
                      if (fikihStatus) setFikihStatus("");
                    }}
                    placeholder={`Tulis ringkasan materi ${currentFikihTopic.title}...`}
                    className="mt-1.5 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-brand-500/20 transition focus:border-brand-500 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                {fikihStatus ? (
                  <p className="text-xs font-semibold text-amber-100">
                    {fikihStatus}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFikihTopicIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={fikihTopicIndex === 0}
                className="rounded-xl border border-brand-100/45 bg-brand-950/15 px-4 py-3 text-sm font-semibold text-brand-50 hover:bg-brand-950/25 disabled:opacity-50 dark:border-brand-700/45 dark:bg-brand-950/30"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={saveCurrentFikihSummary}
                className="rounded-xl border border-brand-100/45 bg-brand-950/15 px-4 py-3 text-sm font-semibold text-brand-50 hover:bg-brand-950/25 dark:border-brand-700/45 dark:bg-brand-950/30"
              >
                Simpan
              </button>
              {fikihTopicIndex < fikihRamadanTopics.length - 1 ? (
                <button
                  type="button"
                  onClick={goToNextFikihTopic}
                  className="rounded-xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-700"
                >
                  Berikutnya
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!saveCurrentFikihSummary()) return;
                    setShowFikihModal(false);
                    setFikihStatus("");
                  }}
                  className="rounded-xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-700"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {activePilarMission ? (
        <div className="fixed inset-0 z-[130] flex items-end bg-slate-950/45 p-0 sm:p-4">
          <div
            className={`flex max-h-[95dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 transition-transform duration-300 sm:mx-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-3xl dark:bg-slate-900 dark:ring-slate-800 ${
              pilarSheetOpen ? "translate-y-0" : "translate-y-12"
            }`}
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 sm:hidden" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {missionDetails[activePilarMission.code]?.title ||
                activePilarMission.title}
            </h3>
            {activePilarMission.code === "SHALAT_IDULFITRI" ? (
              <div className="mt-3 space-y-3">
                <div
                  className={`rounded-2xl border p-3 text-sm ${
                    isIdulfitriFormActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
                  }`}
                >
                  {isIdulfitriFormActive
                    ? "Form Shalat Idulfitri aktif hari ini (1 Syawal)."
                    : "Form Shalat Idulfitri akan aktif pada 1 Syawal."}
                </div>
                <div className="rounded-2xl border border-white/35 bg-white/10 p-3 text-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/90">
                    Countdown Menuju 1 Syawal
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                    {syawalCountdownRings.map((item) => (
                      <div key={item.label} className="flex justify-center">
                        <div
                          className="h-[66px] w-[66px] rounded-full p-[2px] sm:h-[92px] sm:w-[92px]"
                          style={{
                            background: `conic-gradient(#fbbf24 ${item.progress}%, #355b21 ${item.progress}% 100%)`,
                          }}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-900 text-white">
                            <p className="text-[8px] font-semibold tracking-[0.06em] text-amber-200/90 sm:text-[10px] sm:tracking-[0.08em]">
                              {item.label}
                            </p>
                            <p className="mt-0.5 text-[19px] font-extrabold leading-none sm:text-[27px]">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {missionDetails[activePilarMission.code]?.description ||
                  "Selesaikan aktivitas ini untuk menambah progress ibadah harian."}
              </p>
            )}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Reward +{missionXpValue(activePilarMission)} XP
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Status:{" "}
                {selected.includes(activePilarMission.id)
                  ? "Sudah selesai"
                  : "Belum selesai"}
              </p>
            </div>
            {activePilarMission.code === "CATATAN_PUASA_DAN_JAMAAH" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Laporan Shalat Harian
                </p>
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setHideReportedPrayers((prev) => !prev)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {hideReportedPrayers
                      ? "Tampilkan Shalat Terlapor"
                      : "Sembunyikan Shalat Terlapor"}
                  </button>
                </div>
                <div className="space-y-2">
                  {visiblePrayerReportRows.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.value}
                          {prayerReports[item.label]
                            ? ` • ${prayerReports[item.label]}`
                            : ""}
                        </p>
                        {prayerReportTimestamps[item.label] ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Dilapor:{" "}
                            {formatRecordedAt(
                              prayerReportTimestamps[item.label] || "",
                            )}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(prayerReports[item.label])}
                        onClick={() => {
                          setActivePrayerReport(item.label);
                          setPrayerModeDraft(
                            prayerReports[item.label] || "Berjamaah",
                          );
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                          prayerReports[item.label]
                            ? "cursor-not-allowed bg-slate-400 dark:bg-slate-600"
                            : "bg-brand-600 hover:bg-brand-700"
                        }`}
                      >
                        {prayerReports[item.label] ? "Sudah Dilapor" : "Lapor"}
                      </button>
                    </div>
                  ))}
                  {!visiblePrayerReportRows.length ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      Semua shalat pada daftar ini sudah terlapor.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {activePilarMission.code === "ZAKAT_FITRAH" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Form Laporan Zakat Fitrah
                </p>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    1. Dikumpulkan kepada/melalui
                    <input
                      type="text"
                      value={zakatForm.via}
                      onChange={(e) =>
                        setZakatForm((prev) => ({
                          ...prev,
                          via: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    2. Alamat
                    <input
                      type="text"
                      value={zakatForm.address}
                      onChange={(e) =>
                        setZakatForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    3. Pada hari/tanggal
                    <input
                      type="date"
                      value={zakatForm.date}
                      onChange={(e) =>
                        setZakatForm((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    4. Berupa
                    <select
                      value={zakatForm.form}
                      onChange={(e) =>
                        setZakatForm((prev) => ({
                          ...prev,
                          form: e.target.value === "Uang" ? "Uang" : "Beras",
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    >
                      <option value="Beras">Beras</option>
                      <option value="Uang">Uang</option>
                    </select>
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    5. Sebesar
                    <input
                      type="text"
                      value={zakatForm.amount}
                      onChange={(e) =>
                        setZakatForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="Contoh: 2,5 kg / Rp 45.000"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={submitZakatReport}
                  disabled={zakatSubmitting}
                  className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {zakatSubmitting ? "Mengirim..." : "Kirim"}
                </button>
                {zakatStatus ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {zakatStatus}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "SHALAT_IDULFITRI" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Form Laporan Shalat Idulfitri
                </p>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    1. Nama Masjid atau tempat sholat Idulfitri
                    <input
                      type="text"
                      value={idulfitriForm.place}
                      disabled={!isIdulfitriFormActive}
                      onChange={(e) =>
                        setIdulfitriForm((prev) => ({
                          ...prev,
                          place: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    2. Nama Imam/khotib
                    <input
                      type="text"
                      value={idulfitriForm.khatib}
                      disabled={!isIdulfitriFormActive}
                      onChange={(e) =>
                        setIdulfitriForm((prev) => ({
                          ...prev,
                          khatib: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    3. Ringkasan materi khutbah
                    <textarea
                      value={idulfitriForm.khutbahSummary}
                      disabled={!isIdulfitriFormActive}
                      onChange={(e) =>
                        setIdulfitriForm((prev) => ({
                          ...prev,
                          khutbahSummary: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={submitIdulfitriReport}
                  disabled={idulfitriSubmitting || !isIdulfitriFormActive}
                  className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
                >
                  {idulfitriSubmitting ? "Mengirim..." : "Kirim"}
                </button>
                {idulfitriStatus ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {idulfitriStatus}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "SILATURAHIM" ||
            activePilarMission.code === "SILATURRAHIM_RAMADAN" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Form Laporan Silaturahim
                </p>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    1. Nama guru yang dikunjungi
                    <input
                      type="text"
                      value={silaturahimForm.teacherName}
                      onChange={(e) =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          teacherName: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    2. Alamat/lokasi kunjungan
                    <input
                      type="text"
                      value={silaturahimForm.location}
                      onChange={(e) =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    3. Timestamp kunjungan
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(silaturahimForm.recordedAt)}
                      onChange={(e) =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          recordedAt:
                            fromDateTimeLocalValue(e.target.value) ||
                            prev.recordedAt,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    4. Tujuan kunjungan
                    <textarea
                      value={silaturahimForm.purpose}
                      onChange={(e) =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          purpose: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    5. Ringkasan adab/hal baik yang dipelajari
                    <textarea
                      value={silaturahimForm.lessonSummary}
                      onChange={(e) =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          lessonSummary: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    6. Unggah foto bukti kunjungan
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSilaturahimPhotoChange}
                      className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:font-semibold file:text-white hover:file:bg-brand-700"
                    />
                  </label>
                </div>
                {silaturahimForm.proofPhotoUrl ? (
                  <div className="mt-2 rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
                    <img
                      src={silaturahimForm.proofPhotoUrl}
                      alt="Bukti kunjungan silaturahim"
                      className="h-40 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSilaturahimForm((prev) => ({
                          ...prev,
                          proofPhotoUrl: "",
                          proofPhotoObjectKey: "",
                        }))
                      }
                      className="mt-2 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                      Hapus Foto
                    </button>
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                  <p>
                    Silaturahim ke{" "}
                    <b>{silaturahimForm.teacherName.trim() || "Ust. ..."}</b> –{" "}
                    {silaturahimForm.location.trim() || "Lokasi ..."}
                  </p>
                  <p className="mt-1">
                    Dicatat:{" "}
                    {silaturahimForm.recordedAt
                      ? formatRecordedAt(silaturahimForm.recordedAt)
                      : "-"}
                  </p>
                  <p className="mt-1">
                    Catatan:{" "}
                    {silaturahimForm.lessonSummary.trim() ||
                      "Belajar adab meminta doa orang tua"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={submitSilaturahimReport}
                  disabled={silaturahimSubmitting || silaturahimPhotoUploading}
                  className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
                >
                  {silaturahimPhotoUploading
                    ? "Mengunggah foto..."
                    : silaturahimSubmitting
                      ? "Mengirim..."
                      : "Kunjungan Selesai"}
                </button>
                {silaturahimStatus ? (
                  <p className="mt-2 text-xs text-brand-600 font-medium dark:text-brand-400">
                    {silaturahimStatus}
                  </p>
                ) : null}

                {silaturahimHistory.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    <p className="border-t border-slate-200 pt-4 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                      Daftar History Kunjungan
                    </p>
                    <div className="space-y-3">
                      {silaturahimHistory.map((item, idx) => (
                        <div
                          key={`${item.recordedAt}-${idx}`}
                          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase">
                                {item.teacherName}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                {formatRecordedAt(item.recordedAt)}
                              </p>
                            </div>
                            {item.proofPhotoUrl ? (
                              <img
                                src={item.proofPhotoUrl}
                                alt="Bukti"
                                className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            <p>
                              <span className="font-semibold">Lokasi:</span>{" "}
                              {item.location}
                            </p>
                            {item.purpose ? (
                              <p>
                                <span className="font-semibold">Tujuan:</span>{" "}
                                {item.purpose}
                              </p>
                            ) : null}
                            {item.lessonSummary ? (
                              <p className="italic">"{item.lessonSummary}"</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "REFLEKSI_DIRI" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Lembar Penilaian Diri (Refleksi)
                </label>
                <textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Tuliskan evaluasi ibadah, kendala hari ini, dan rencana perbaikan besok."
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                />
                <div className="mt-2 rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Ide isi refleksi:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reflectionIdeaOptions.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => addReflectionIdea(idea)}
                        className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Refleksi"}
                </button>
                {status ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {status}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "KULTUM_CERAMAH" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Catatan Ceramah Agama / Kultum Ramadan
                </p>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    1. Pilih video ceramah untuk disimak:
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {teacherVideos.map((video) => {
                      const isSelected =
                        kultumForm.teacherVideoId === String(video.id);
                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() =>
                            setKultumForm((prev) => ({
                              ...prev,
                              teacherVideoId: String(video.id),
                            }))
                          }
                          className={`group relative overflow-hidden rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-brand-600 bg-brand-50/50 ring-4 ring-brand-500/10 dark:border-brand-500 dark:bg-brand-900/20"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50"
                          }`}
                        >
                          <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img
                              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                              alt={video.title}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-video.png"; // Fallback
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-brand-600/20 backdrop-blur-[1px]">
                                <div className="rounded-full bg-brand-600 p-1.5 text-white shadow-lg">
                                  <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="line-clamp-2 text-[11px] font-bold leading-tight text-slate-800 dark:text-slate-100">
                              {video.title}
                            </p>
                            <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {video.ustadz || "Pemateri Ustadz"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedKultumVideo ? (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60">
                          <div className="aspect-video w-full">
                            <iframe
                              src={`https://www.youtube.com/embed/${encodeURIComponent(selectedKultumVideo.videoId)}?rel=0&modestbranding=1`}
                              title={selectedKultumVideo.title}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {selectedKultumVideo.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {selectedKultumVideo.ustadz || "Pemateri"}
                            </p>
                          </div>
                          <a
                            href={selectedKultumVideo.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-700"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                            </svg>
                            Buka di YouTube
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          2. Ringkasan isi ceramah (min. 120 karakter)
                          <textarea
                            value={kultumForm.ringkasan}
                            onChange={(e) =>
                              setKultumForm((prev) => ({
                                ...prev,
                                ringkasan: e.target.value,
                              }))
                            }
                            placeholder="Tuliskan apa yang kamu pelajari dari video tersebut..."
                            className="mt-1.5 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm ring-brand-500/20 transition focus:border-brand-500 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                          />
                        </label>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          3. Poin pelajaran (max. 3 baris)
                          <textarea
                            value={kultumForm.poinPelajaranText}
                            onChange={(e) =>
                              setKultumForm((prev) => ({
                                ...prev,
                                poinPelajaranText: e.target.value,
                              }))
                            }
                            placeholder="- Poin 1&#10;- Poin 2&#10;- Poin 3"
                            className="mt-1.5 min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm ring-brand-500/20 transition focus:border-brand-500 focus:ring-4 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={submitKultumReport}
                        disabled={kultumSubmitting}
                        className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-brand-900/20 transition hover:from-brand-700 hover:to-brand-800 disabled:opacity-60 active:scale-[0.98]"
                      >
                        {kultumSubmitting
                          ? "Mengirim Laporan..."
                          : "Simpan Catatan Kultum"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                        <svg
                          className="h-6 w-6 text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="2"
                            y="3"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          />
                          <path d="M8 21h8" />
                          <path d="M12 17v4" />
                          <path d="M10 8l5 4-5 4V8z" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Silakan pilih video di atas untuk mulai mengisi catatan.
                      </p>
                    </div>
                  )}
                </div>
                {kultumStatus ? (
                  <p className="mt-3 text-center text-xs font-medium text-brand-600 dark:text-brand-400">
                    {kultumStatus}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "TADARUS_RAMADAN" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Form Laporan Baca Al-Qur'an Harian
                </p>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    1. Nama surat
                    <input
                      type="text"
                      list="surah-name-options"
                      value={tadarusReportForm.surahName}
                      onChange={(e) =>
                        setTadarusReportForm((prev) => ({
                          ...prev,
                          surahName: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        const matched = autoCompleteSurahName(
                          tadarusReportForm.surahName,
                        );
                        if (!matched) return;
                        setTadarusReportForm((prev) => ({
                          ...prev,
                          surahName: matched,
                        }));
                      }}
                      placeholder="Contoh: Al-Baqarah"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                    <datalist id="surah-name-options">
                      {quranSurahNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-600 dark:text-slate-300">
                      2. Ayat dari
                      <input
                        type="number"
                        min={1}
                        value={tadarusReportForm.ayatFrom}
                        onChange={(e) =>
                          setTadarusReportForm((prev) => {
                            const next = {
                              ...prev,
                              ayatFrom: e.target.value,
                            };
                            if (!tadarusTotalManual) {
                              const computed = countAyatRange(
                                next.ayatFrom,
                                next.ayatTo,
                              );
                              next.totalAyatRead =
                                computed === null ? "" : String(computed);
                            }
                            return next;
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                      />
                    </label>
                    <label className="block text-xs text-slate-600 dark:text-slate-300">
                      3. Sampai ayat
                      <input
                        type="number"
                        min={1}
                        value={tadarusReportForm.ayatTo}
                        onChange={(e) =>
                          setTadarusReportForm((prev) => {
                            const next = {
                              ...prev,
                              ayatTo: e.target.value,
                            };
                            if (!tadarusTotalManual) {
                              const computed = countAyatRange(
                                next.ayatFrom,
                                next.ayatTo,
                              );
                              next.totalAyatRead =
                                computed === null ? "" : String(computed);
                            }
                            return next;
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                      />
                    </label>
                  </div>
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    4. Berapa ayat yang dibaca
                    <input
                      type="number"
                      min={1}
                      value={tadarusReportForm.totalAyatRead}
                      onChange={(e) => {
                        setTadarusTotalManual(true);
                        setTadarusReportForm((prev) => ({
                          ...prev,
                          totalAyatRead: e.target.value,
                        }));
                      }}
                      placeholder="Contoh: 20"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tadarusTotalManual
                          ? "Mode manual aktif."
                          : "Terhitung otomatis dari rentang ayat."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const computed = countAyatRange(
                            tadarusReportForm.ayatFrom,
                            tadarusReportForm.ayatTo,
                          );
                          setTadarusTotalManual(false);
                          setTadarusReportForm((prev) => ({
                            ...prev,
                            totalAyatRead:
                              computed === null
                                ? prev.totalAyatRead
                                : String(computed),
                          }));
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        Hitung Otomatis
                      </button>
                    </div>
                    {autoAyatCount !== null ? (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Rentang ayat: {autoAyatCount} ayat.
                      </p>
                    ) : null}
                  </label>
                </div>
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                  <p>
                    Saya membaca surat{" "}
                    <b>{tadarusReportForm.surahName.trim() || "..."}</b>, ayat{" "}
                    <b>{tadarusReportForm.ayatFrom || "-"}</b> sampai{" "}
                    <b>{tadarusReportForm.ayatTo || "-"}</b> (
                    <b>{tadarusReportForm.totalAyatRead || "-"}</b> ayat).
                  </p>
                  <p className="mt-1">
                    XP: 1 x jumlah ayat = <b>{tadarusXpPreview}</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={submitTadarusReport}
                  disabled={tadarusSubmitting}
                  className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
                >
                  {tadarusSubmitting ? "Mengirim..." : "Kirim Laporan"}
                </button>
                {tadarusStatus ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {tadarusStatus}
                  </p>
                ) : null}
              </div>
            ) : null}
            {activePilarMission.code === "SUNNAH_LAINNYA" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Ide Aktivitas Sunnah Lainnya
                </p>
                <div className="flex flex-wrap gap-2">
                  {sunnahOtherIdeaOptions.map((idea) => {
                    const active = selectedSunnahIdeas.has(idea);
                    return (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => addSunnahIdea(idea)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {active ? "Terpilih: " : ""}
                        {idea}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 block text-xs text-slate-600 dark:text-slate-300">
                  Aktivitas custom (boleh tulis sendiri)
                  <textarea
                    value={sunnahOtherNote}
                    onChange={(e) => setSunnahOtherNote(e.target.value)}
                    placeholder="Contoh: Membaca 100x shalawat, bantu bersih masjid, antar makanan berbuka."
                    className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100"
                  />
                </label>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Satu baris = satu aktivitas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSunnahOtherNote("")}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : null}
            {activePilarMission.code === "SHALAT_IDULFITRI" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
              </div>
            ) : activePilarMission.code === "ZAKAT_FITRAH" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
              </div>
            ) : activePilarMission.code === "SILATURAHIM" ||
              activePilarMission.code === "SILATURRAHIM_RAMADAN" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
              </div>
            ) : activePilarMission.code === "TADARUS_RAMADAN" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
              </div>
            ) : activePilarMission.code === "KULTUM_CERAMAH" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mission = activePilarMission;
                    const wasCompleted = selected.includes(mission.id);
                    if (!wasCompleted) {
                      toggleMission(mission.id);
                    }
                    if (!wasCompleted && mission.category === "IBADAH_SUNNAH") {
                      setSunnahRewardName(mission.title);
                      setSunnahRewardXp(missionXpValue(mission));
                      setShowSunnahReward(true);
                      window.setTimeout(() => setShowSunnahReward(false), 2400);
                    }
                    setPilarSheetOpen(false);
                    window.setTimeout(() => setActivePilarMission(null), 220);
                  }}
                  className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {selected.includes(activePilarMission.id)
                    ? "Sudah Selesai"
                    : "Selesai"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {activePrayerReport ? (
        <div className="fixed inset-0 z-[140] flex items-end bg-slate-950/45 p-0 sm:p-4">
          <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 transition-transform duration-300 sm:mx-auto sm:max-w-md sm:rounded-3xl dark:bg-slate-900 dark:ring-slate-800">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 sm:hidden" />
            <button
              type="button"
              onClick={() => setActivePrayerReport(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Lapor Shalat {activePrayerReport}
            </h4>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pilih pelaksanaan shalat untuk dicatat.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["Berjamaah", "Munfarid"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPrayerModeDraft(mode)}
                  className={`flex min-h-[118px] w-full flex-col items-center justify-center rounded-xl border px-3 py-3 text-sm ${
                    prayerModeDraft === mode
                      ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                      : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  {mode === "Berjamaah" ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="8" cy="8" r="2" strokeWidth="1.8" />
                      <circle cx="16" cy="8" r="2" strokeWidth="1.8" />
                      <path
                        d="M4.5 16c.6-2 2.1-3 3.5-3s2.9 1 3.5 3M12.5 16c.6-2 2.1-3 3.5-3s2.9 1 3.5 3"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="12" cy="8" r="2.2" strokeWidth="1.8" />
                      <path
                        d="M8.5 16c.8-2.2 2.1-3.2 3.5-3.2s2.7 1 3.5 3.2"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  <span className="mt-2 font-semibold">{mode}</span>
                  <span className="text-xs opacity-80">
                    +{prayerXpByMode[mode]} XP
                  </span>
                  {prayerModeDraft === mode ? (
                    <span className="mt-1 text-xs font-bold">Terpilih</span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {status && (
                <p className="mb-2 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {status}
                </p>
              )}
              <button
                type="button"
                onClick={submitPrayerReport}
                disabled={prayerReporting}
                className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {prayerReporting ? "Menyimpan..." : "Lapor"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showPrayerReward ? (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <lottie-player
              autoplay
              mode="normal"
              src="https://assets10.lottiefiles.com/packages/lf20_touohxv0.json"
              style={{ width: "100%", height: "130px" }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Alhamdulillah, saya sudah sholat {prayerRewardName}.
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              +{prayerRewardXp} XP
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mode {prayerRewardMode}
            </p>
          </div>
        </div>
      ) : null}
      {showZakatReward ? (
        <div className="fixed inset-0 z-[146] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <lottie-player
              autoplay
              mode="normal"
              src="https://assets7.lottiefiles.com/packages/lf20_h4th9ofg.json"
              style={{ width: "100%", height: "130px" }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Alhamdulillah, saya mengeluarkan zakat fitrah tahun ini
            </p>
          </div>
        </div>
      ) : null}
      {showSunnahReward ? (
        <div className="fixed inset-0 z-[147] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <lottie-player
              autoplay
              mode="normal"
              src="https://assets10.lottiefiles.com/packages/lf20_touohxv0.json"
              style={{ width: "100%", height: "130px" }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Alhamdulillah, saya sudah menyelesaikan {sunnahRewardName}.
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              +{sunnahRewardXp} XP
            </p>
          </div>
        </div>
      ) : null}
      {mounted ? createPortal(mobileBottomNav, document.body) : null}
    </>
  );
}
