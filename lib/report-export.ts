import type { DailyReport } from "@/db/schema";

export type ReportRowForExport = {
  id: number;
  userId: string;
  reportDate: string;
  xpGained: number;
  narration: string | null;
  createdAt: Date;
  updatedAt: Date;
  answers: DailyReport["answers"];
};

export type ReportSummary = {
  utama: {
    hafalan: string;
    shalatLimaWaktu: string;
    idulfitri: string;
    zakatFitrah: string;
  };
  sunnah: {
    tarawih: string;
    tahajjud: string;
    dhuha: string;
    infaqShadaqah: string;
    takziahZiarah: string;
    sunnahLainnya: string;
  };
  literasi: {
    tadarus: string;
    kultum: string;
    fikihRamadan: string;
  };
  akhlak: {
    silaturahim: string;
    refleksi: string;
  };
  tambahan: {
    statusPuasa: string;
    aktivitasChecklist: string;
    progresShalatWajib: string;
    waktuLaporTerakhir: string;
  };
  narrationOnly: string;
};

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function csvEscape(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatDateTime(value: string | Date | undefined) {
  if (!value) return "-";
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return "-";
  }
}

export function getLatestActivityAt(report: ReportRowForExport | undefined) {
  if (!report) return "-";
  const checklistTimestamps = Object.values(
    report.answers?.checklistTimestamps || {},
  ).filter((value): value is string => typeof value === "string");
  const prayerTimestamps = Object.values(
    report.answers?.prayerReportTimestamps || {},
  ).filter((value): value is string => typeof value === "string");
  const candidates = [
    ...checklistTimestamps,
    ...prayerTimestamps,
    report.updatedAt.toISOString(),
    report.createdAt.toISOString(),
  ];
  const latestMs = candidates.reduce((max, value) => {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return max;
    return Math.max(max, ms);
  }, 0);
  if (!latestMs) return "-";
  return formatDateTime(new Date(latestMs));
}

const SUNNAH_OTHER_SECTION_LABEL = "Sunnah Lainnya";
const JUZ30_SURAH_NAMES: Record<number, string> = {
  78: "An-Naba",
  79: "An-Nazi'at",
  80: "Abasa",
  81: "At-Takwir",
  82: "Al-Infitar",
  83: "Al-Mutaffifin",
  84: "Al-Insyiqaq",
  85: "Al-Buruj",
  86: "At-Tariq",
  87: "Al-A'la",
  88: "Al-Gasyiyah",
  89: "Al-Fajr",
  90: "Al-Balad",
  91: "Asy-Syams",
  92: "Al-Lail",
  93: "Ad-Duha",
  94: "Asy-Syarh",
  95: "At-Tin",
  96: "Al-'Alaq",
  97: "Al-Qadr",
  98: "Al-Bayyinah",
  99: "Az-Zalzalah",
  100: "Al-'Adiyat",
  101: "Al-Qari'ah",
  102: "At-Takasur",
  103: "Al-'Asr",
  104: "Al-Humazah",
  105: "Al-Fil",
  106: "Quraisy",
  107: "Al-Ma'un",
  108: "Al-Kausar",
  109: "Al-Kafirun",
  110: "An-Nasr",
  111: "Al-Lahab",
  112: "Al-Ikhlas",
  113: "Al-Falaq",
  114: "An-Nas",
};

function formatMurajaahSurahList(
  value: unknown,
  timestampMap?: Record<string, string>,
) {
  if (!Array.isArray(value)) return "";
  const numbers = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((num) => Number.isInteger(num) && num >= 78 && num <= 114),
    ),
  ).sort((a, b) => a - b);
  if (!numbers.length) return "";
  return numbers
    .map((num) => {
      const label = `QS. ${JUZ30_SURAH_NAMES[num] || num}`;
      const recordedAt = timestampMap?.[String(num)];
      if (!recordedAt) return label;
      return `${label} (${formatDateTime(recordedAt)})`;
    })
    .join(" | ");
}

function splitNarrationSections(raw: string | null | undefined) {
  const source = (raw || "").trim();
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

export function hasMissionCode(
  report: ReportRowForExport | undefined,
  missionIdByCode: Map<string, number>,
  code: string,
) {
  if (!report) return false;
  const missionId = missionIdByCode.get(code);
  if (!missionId) return false;
  return asArray(report.answers?.selectedMissionIds).includes(missionId);
}

export function summarizeReport(
  report: ReportRowForExport | undefined,
  missionIdByCode: Map<string, number>,
): ReportSummary {
  const noData = "-";
  if (!report) {
    return {
      utama: {
        hafalan: noData,
        shalatLimaWaktu: noData,
        idulfitri: noData,
        zakatFitrah: noData,
      },
      sunnah: {
        tarawih: noData,
        tahajjud: noData,
        dhuha: noData,
        infaqShadaqah: noData,
        takziahZiarah: noData,
        sunnahLainnya: noData,
      },
      literasi: {
        tadarus: noData,
        kultum: noData,
        fikihRamadan: noData,
      },
      akhlak: {
        silaturahim: noData,
        refleksi: noData,
      },
      tambahan: {
        statusPuasa: noData,
        aktivitasChecklist: noData,
        progresShalatWajib: noData,
        waktuLaporTerakhir: noData,
      },
      narrationOnly: "",
    };
  }

  const answers = report.answers || {};
  const prayerEntries = Object.entries(answers.prayerReports || {});
  const shalatLimaWaktu = prayerEntries.length
    ? prayerEntries.map(([name, mode]) => `${name} (${mode})`).join(", ")
    : noData;
  const idulfitri = answers.idulfitriReport
    ? `Ya (${answers.idulfitriReport.place || "Lokasi belum diisi"})`
    : hasMissionCode(report, missionIdByCode, "SHALAT_IDULFITRI")
      ? "Ya"
      : noData;
  const zakatFitrah = answers.zakatFitrah
    ? `${answers.zakatFitrah.form} ${answers.zakatFitrah.amount || "-"} via ${answers.zakatFitrah.via || "-"}`
    : hasMissionCode(report, missionIdByCode, "ZAKAT_FITRAH")
      ? "Ya"
      : noData;
  const murajaahXpBonus = Number(answers.murajaahXpBonus || 0);
  const murajaahSurahTimestamps =
    answers.murajaahSurahTimestamps &&
    typeof answers.murajaahSurahTimestamps === "object"
      ? (answers.murajaahSurahTimestamps as Record<string, string>)
      : undefined;
  const murajaahSurahList = formatMurajaahSurahList(
    answers.murajaahSurahNumbers,
    murajaahSurahTimestamps,
  );
  const hasMurajaahActivity =
    hasMissionCode(report, missionIdByCode, "HAFALAN_SURAT_PENDEK") ||
    Boolean(murajaahSurahList) ||
    murajaahXpBonus > 0;
  const hafalan = hasMurajaahActivity
    ? murajaahSurahList
      ? `${murajaahSurahList} (+${murajaahXpBonus} XP)`
      : murajaahXpBonus > 0
        ? `Progres hafalan (+${murajaahXpBonus} XP, surat belum dipilih)`
        : "Selesai (surat belum dipilih)"
    : noData;

  const { narrationOnly, sunnahNote } = splitNarrationSections(
    report.narration,
  );
  const sunnahLines = sunnahNote
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const infaqShadaqah = answers.infaqShadaqahReport?.amount
    ? `Rp ${answers.infaqShadaqahReport.amount}`
    : hasMissionCode(report, missionIdByCode, "INFAQ_SHADAQAH")
      ? "Ya"
      : noData;
  const takziahZiarah = answers.takziahZiarahReport?.purpose
    ? answers.takziahZiarahReport.purpose
    : hasMissionCode(report, missionIdByCode, "TAKZIAH_ZIARAH")
      ? "Ya"
      : noData;
  const sunnahLainnya = sunnahLines.length
    ? sunnahLines.join(" | ")
    : hasMissionCode(report, missionIdByCode, "SUNNAH_LAINNYA")
      ? "Dipilih"
      : noData;

  const tadarus = answers.tadarusReport
    ? `${answers.tadarusReport.surahName || "-"} (${answers.tadarusReport.ayatFrom}-${answers.tadarusReport.ayatTo}), ${answers.tadarusReport.totalAyatRead} ayat`
    : hasMissionCode(report, missionIdByCode, "TADARUS_RAMADAN")
      ? "Dipilih"
      : noData;
  const kultum = answers.kultumReport?.ringkasan
    ? answers.kultumReport.title || "Ringkasan kultum terisi"
    : hasMissionCode(report, missionIdByCode, "KULTUM_CERAMAH")
      ? "Dipilih"
      : noData;
  const fikihBonus = Number(answers.fikihXpBonus || 0);
  const fikihRamadan = fikihBonus > 0 ? `Terlapor (+${fikihBonus} XP)` : noData;

  const silaturahim = answers.silaturahimReport
    ? `${answers.silaturahimReport.teacherName || "-"} @ ${answers.silaturahimReport.location || "-"}`
    : hasMissionCode(report, missionIdByCode, "SILATURAHIM") ||
        hasMissionCode(report, missionIdByCode, "SILATURRAHIM_RAMADAN")
      ? "Ya"
      : noData;
  const refleksi = narrationOnly || noData;
  const selectedMissionCount = asArray(answers.selectedMissionIds).length;
  const statusPuasa =
    typeof answers.fasting === "boolean"
      ? answers.fasting
        ? "Berpuasa"
        : "Tidak berpuasa"
      : noData;
  const aktivitasChecklist = `${selectedMissionCount} misi`;
  const progresShalatWajib = `${prayerEntries.length}/5 waktu`;
  const waktuLaporTerakhir = getLatestActivityAt(report);

  return {
    utama: {
      hafalan,
      shalatLimaWaktu,
      idulfitri,
      zakatFitrah,
    },
    sunnah: {
      tarawih: hasMissionCode(report, missionIdByCode, "SHALAT_TARAWIH")
        ? "Ya"
        : noData,
      tahajjud: hasMissionCode(report, missionIdByCode, "SHALAT_TAHAJJUD")
        ? "Ya"
        : noData,
      dhuha: hasMissionCode(report, missionIdByCode, "SHALAT_DHUHA")
        ? "Ya"
        : noData,
      infaqShadaqah,
      takziahZiarah,
      sunnahLainnya,
    },
    literasi: {
      tadarus,
      kultum,
      fikihRamadan,
    },
    akhlak: {
      silaturahim,
      refleksi,
    },
    tambahan: {
      statusPuasa,
      aktivitasChecklist,
      progresShalatWajib,
      waktuLaporTerakhir,
    },
    narrationOnly,
  };
}

export const STUDENT_REPORT_EXPORT_HEADERS = [
  "Tanggal",
  "Misi",
  "XP",
  "Utama: Hafalan Surat Pendek",
  "Utama: Shalat Lima Waktu",
  "Utama: Shalat Idulfitri",
  "Utama: Zakat Fitrah",
  "Sunnah: Tarawih",
  "Sunnah: Tahajjud",
  "Sunnah: Dhuha",
  "Sunnah: Infaq/Shadaqah",
  "Sunnah: Takziah/Ziarah",
  "Sunnah: Aktivitas Lain",
  "Literasi: Tadarus",
  "Literasi: Kultum",
  "Literasi: Materi Fikih",
  "Akhlak: Silaturahim",
  "Akhlak: Refleksi",
  "Tambahan: Status Puasa",
  "Tambahan: Aktivitas Checklist",
  "Tambahan: Progres Shalat Wajib",
  "Tambahan: Waktu Lapor Terakhir",
  "Narasi/Refleksi",
];

export function buildStudentReportExportRow(args: {
  day: string;
  report?: ReportRowForExport;
  missionTitleMap: Map<number, string>;
  missionIdByCode: Map<string, number>;
}) {
  const selectedIds = asArray(args.report?.answers?.selectedMissionIds);
  const missionNames = selectedIds
    .map((id) => args.missionTitleMap.get(id))
    .filter(Boolean)
    .join(", ");
  const summary = summarizeReport(args.report, args.missionIdByCode);
  return [
    args.day,
    missionNames || "-",
    String(args.report?.xpGained || 0),
    summary.utama.hafalan,
    summary.utama.shalatLimaWaktu,
    summary.utama.idulfitri,
    summary.utama.zakatFitrah,
    summary.sunnah.tarawih,
    summary.sunnah.tahajjud,
    summary.sunnah.dhuha,
    summary.sunnah.infaqShadaqah,
    summary.sunnah.takziahZiarah,
    summary.sunnah.sunnahLainnya,
    summary.literasi.tadarus,
    summary.literasi.kultum,
    summary.literasi.fikihRamadan,
    summary.akhlak.silaturahim,
    summary.akhlak.refleksi,
    summary.tambahan.statusPuasa,
    summary.tambahan.aktivitasChecklist,
    summary.tambahan.progresShalatWajib,
    summary.tambahan.waktuLaporTerakhir,
    args.report?.narration || "-",
  ];
}
