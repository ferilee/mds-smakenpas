import { and, desc, eq, gte } from "drizzle-orm";
import { addDays, formatISO, parseISO, subDays } from "date-fns";
import { db } from "@/lib/db";
import { dailyReports, missions, users } from "@/db/schema";

const PRIMARY_CODES = [
  "HAFALAN_SURAT_PENDEK",
  "CATATAN_PUASA_DAN_JAMAAH",
  "TADARUS_RAMADAN",
];
const PERFECT_DAY_BONUS = 20;
const PRAYER_XP_BY_MODE = {
  Berjamaah: 27,
  Munfarid: 20,
} as const;
const TADARUS_XP_PER_AYAT = 1;
const PRAYER_KEYS = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"] as const;
type PrayerMode = keyof typeof PRAYER_XP_BY_MODE;
type PrayerReports = Partial<Record<(typeof PRAYER_KEYS)[number], PrayerMode>>;
type TadarusReport = {
  surahName: string;
  ayatFrom: number;
  ayatTo: number;
  totalAyatRead: number;
};

function sanitizeNonNegativeInt(value: number | undefined, max = 10000) {
  if (!Number.isInteger(value) || (value || 0) < 0) return 0;
  return Math.min(max, value || 0);
}

function calculateTadarusXp(report?: TadarusReport) {
  if (!report) return 0;
  return (
    sanitizeNonNegativeInt(report.totalAyatRead, 5000) * TADARUS_XP_PER_AYAT
  );
}

export function computeLevel(totalXp: number): {
  level: number;
  nextLevelXp: number;
} {
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);
  return {
    level,
    nextLevelXp: level * 100,
  };
}

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function calculateDailyXp(params: {
  selectedMissionIds: number[];
  fasting: boolean;
  sunnahBoost: number;
  prayerReports?: PrayerReports;
  murajaahXpBonus?: number;
  tadarusReport?: TadarusReport;
}) {
  const selected = params.selectedMissionIds.length
    ? await db
      .select({
        id: missions.id,
        xp: missions.xp,
        code: missions.code,
      })
      .from(missions)
      .where(and(eq(missions.active, true)))
    : [];

  const chosen = selected.filter((m) =>
    params.selectedMissionIds.includes(m.id),
  );
  const tadarusXp = calculateTadarusXp(params.tadarusReport);
  const baseXp = chosen.reduce((acc, item) => {
    if (item.code === "SILATURAHIM") return acc + 20;
    if (item.code === "SILATURRAHIM_RAMADAN") return acc + 20;
    if (item.code === "REFLEKSI_DIRI") return acc + 15;
    if (item.code === "TADARUS_RAMADAN") return acc + tadarusXp;
    return acc + item.xp;
  }, 0);
  const hasAllPrimary = PRIMARY_CODES.every((code) =>
    chosen.some((m) => m.code === code),
  );
  const bonusXp = params.fasting && hasAllPrimary ? PERFECT_DAY_BONUS : 0;
  const sunnahBoost = Math.max(0, Math.min(100, params.sunnahBoost || 0));
  const prayerReports = params.prayerReports || {};
  const prayerXp = PRAYER_KEYS.reduce((acc, key) => {
    const mode = prayerReports[key];
    if (!mode) return acc;
    return acc + PRAYER_XP_BY_MODE[mode];
  }, 0);
  const murajaahXpBonus = Math.max(
    0,
    Math.min(500, params.murajaahXpBonus || 0),
  );

  return {
    xpGained: baseXp + bonusXp + sunnahBoost + prayerXp + murajaahXpBonus,
    bonusXp,
    prayerXp,
    tadarusXp,
    selectedCodes: chosen.map((m) => m.code),
  };
}

export async function recomputeUserProgress(userId: string) {
  const reports = await db
    .select({
      reportDate: dailyReports.reportDate,
      xpGained: dailyReports.xpGained,
      answers: dailyReports.answers,
    })
    .from(dailyReports)
    .where(eq(dailyReports.userId, userId))
    .orderBy(desc(dailyReports.reportDate));

  const totalXp = reports.reduce((acc: number, row) => acc + row.xpGained, 0);
  let streak = 0;
  let dayCursor = new Date(todayDateString());

  for (const report of reports) {
    const answers = report.answers as { fasting?: boolean };
    const reportDate = parseISO(report.reportDate);
    if (
      formatISO(reportDate, { representation: "date" }) !==
      formatISO(dayCursor, { representation: "date" })
    ) {
      if (reportDate < dayCursor) {
        break;
      }
      continue;
    }
    if (!answers.fasting) {
      break;
    }
    streak += 1;
    dayCursor = addDays(dayCursor, -1);
  }

  await db
    .update(users)
    .set({
      totalXp,
      currentStreak: streak,
      lastReportDate: reports[0]?.reportDate || null,
    })
    .where(eq(users.id, userId));

  return {
    totalXp,
    currentStreak: streak,
    level: computeLevel(totalXp).level,
  };
}
