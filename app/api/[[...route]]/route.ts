import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { endOfMonth, startOfMonth } from "date-fns";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { z } from "zod";
import { dailyReports, missions, teacherVideos, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  getSholatScheduleByDate,
  getTodaySholatSchedule,
  searchSholatCities,
} from "@/lib/apimuslim";
import { db } from "@/lib/db";
import {
  calculateDailyXp,
  computeLevel,
  recomputeUserProgress,
  todayDateString,
} from "@/lib/xp";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

function isIdulfitriWindow(reportDate: string) {
  const allowedDates = (process.env.IDULFITRI_DATES || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (allowedDates.length > 0) {
    return allowedDates.includes(reportDate);
  }

  try {
    const d = new Date(`${reportDate}T00:00:00+07:00`);
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "long",
    }).formatToParts(d);
    const dayPart = parts.find((p) => p.type === "day")?.value || "";
    const monthPart = (
      parts.find((p) => p.type === "month")?.value || ""
    ).toLowerCase();
    const day = Number(dayPart);
    const isSyawal =
      monthPart.includes("shawwal") ||
      monthPart.includes("syawal") ||
      monthPart.includes("syawwal");
    return isSyawal && day === 1;
  } catch {
    return false;
  }
}

const app = new Hono<{ Variables: { user: SessionUser } }>().basePath("/api");

app.use("*", async (c, next) => {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  await next();
});

app.get("/me", async (c) => {
  const me = c.get("user");
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, me.id),
  });
  if (!dbUser) return c.json({ message: "User not found" }, 404);

  return c.json({
    user: dbUser,
    levelInfo: computeLevel(dbUser.totalXp),
  });
});

app.get("/missions", async (c) => {
  const data = await db
    .select()
    .from(missions)
    .where(eq(missions.active, true))
    .orderBy(missions.category, missions.id);

  return c.json({
    missions: data,
  });
});

app.get("/teacher-videos", async (c) => {
  const videos = await db
    .select({
      id: teacherVideos.id,
      title: teacherVideos.title,
      youtubeUrl: teacherVideos.youtubeUrl,
      videoId: teacherVideos.videoId,
      ustadz: teacherVideos.ustadz,
      publishedAt: teacherVideos.publishedAt,
    })
    .from(teacherVideos)
    .where(eq(teacherVideos.active, true))
    .orderBy(desc(teacherVideos.publishedAt), desc(teacherVideos.id));

  return c.json({ videos });
});

app.get(
  "/sholat/cities",
  zValidator(
    "query",
    z.object({
      keyword: z.string().trim().min(2).max(80).optional(),
    }),
  ),
  async (c) => {
    const { keyword } = c.req.valid("query");
    const searchKeyword = keyword ?? "lumajang";

    try {
      const cities = await searchSholatCities(searchKeyword);
      return c.json({
        keyword: searchKeyword,
        cities: cities.slice(0, 30),
      });
    } catch (error) {
      return c.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Gagal mengambil daftar kota.",
        },
        502,
      );
    }
  },
);

app.get(
  "/sholat/schedule",
  zValidator(
    "query",
    z.object({
      cityId: z.string().min(8),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      tz: z.string().optional(),
    }),
  ),
  async (c) => {
    const { cityId, date, tz } = c.req.valid("query");

    try {
      const schedule = date
        ? await getSholatScheduleByDate({ cityId, date })
        : await getTodaySholatSchedule({ cityId, tz });
      return c.json({
        schedule,
      });
    } catch (error) {
      return c.json(
        {
          message:
            error instanceof Error ? error.message : "Gagal mengambil jadwal.",
        },
        502,
      );
    }
  },
);

const reportSchema = z.object({
  selectedMissionIds: z.array(z.number()).default([]),
  fasting: z.boolean(),
  narration: z.string().max(400).optional(),
  sunnahBoost: z.number().int().min(0).max(100).default(0),
  prayerReports: z
    .object({
      Subuh: z.enum(["Berjamaah", "Munfarid"]).optional(),
      Dzuhur: z.enum(["Berjamaah", "Munfarid"]).optional(),
      Ashar: z.enum(["Berjamaah", "Munfarid"]).optional(),
      Maghrib: z.enum(["Berjamaah", "Munfarid"]).optional(),
      Isya: z.enum(["Berjamaah", "Munfarid"]).optional(),
    })
    .default({}),
  checklistTimestamps: z.record(z.string()).default({}),
  prayerReportTimestamps: z
    .object({
      Subuh: z.string().optional(),
      Dzuhur: z.string().optional(),
      Ashar: z.string().optional(),
      Maghrib: z.string().optional(),
      Isya: z.string().optional(),
    })
    .default({}),
  murajaahXpBonus: z.number().int().min(0).max(500).default(0),
  tadarusReport: z
    .object({
      surahName: z.string().trim().min(1).max(140),
      ayatFrom: z.number().int().min(1).max(1000),
      ayatTo: z.number().int().min(1).max(1000),
      totalAyatRead: z.number().int().min(1).max(1000),
    })
    .refine((data) => data.ayatTo >= data.ayatFrom, {
      message: "Ayat akhir tidak boleh lebih kecil dari ayat awal.",
    })
    .optional(),
  idulfitriReport: z
    .object({
      place: z.string().max(180),
      khatib: z.string().max(140),
      khutbahSummary: z.string().max(1000),
    })
    .optional(),
  zakatFitrah: z
    .object({
      via: z.string().max(120),
      address: z.string().max(220),
      date: z.string().max(30),
      form: z.enum(["Beras", "Uang"]),
      amount: z.string().max(120),
    })
    .optional(),
  silaturahimReport: z
    .object({
      teacherName: z.string().trim().min(1).max(160),
      location: z.string().trim().min(1).max(220),
      recordedAt: z.string().trim().min(1).max(40),
      purpose: z.string().trim().max(500).optional(),
      lessonSummary: z.string().trim().max(800).optional(),
      proofPhotoDataUrl: z.string().trim().max(2500000).optional(),
    })
    .optional(),
  kultumReport: z
    .object({
      teacherVideoId: z.number().int().positive(),
      ringkasan: z.string().trim().min(120).max(2000),
      poinPelajaran: z.array(z.string().trim().min(3).max(240)).min(1).max(3),
    })
    .optional(),
});

app.get("/reports/today", async (c) => {
  const me = c.get("user");
  const reportDate = todayDateString();
  const report = await db.query.dailyReports.findFirst({
    where: and(
      eq(dailyReports.userId, me.id),
      eq(dailyReports.reportDate, reportDate),
    ),
  });
  return c.json({
    reportDate,
    report,
  });
});

app.post("/reports/today", zValidator("json", reportSchema), async (c) => {
  const me = c.get("user");
  const payload = c.req.valid("json");
  const reportDate = todayDateString();
  const allMissions = await db
    .select({
      id: missions.id,
      code: missions.code,
    })
    .from(missions)
    .where(eq(missions.active, true));
  const idulfitriMission = allMissions.find(
    (m) => m.code === "SHALAT_IDULFITRI",
  );
  const kultumMission = allMissions.find((m) => m.code === "KULTUM_CERAMAH");

  let selectedMissionIds = payload.selectedMissionIds;
  let idulfitriIgnoredReason: string | null = null;
  if (idulfitriMission && selectedMissionIds.includes(idulfitriMission.id)) {
    const inWindow = isIdulfitriWindow(reportDate);
    if (!inWindow) {
      selectedMissionIds = selectedMissionIds.filter(
        (id) => id !== idulfitriMission.id,
      );
      idulfitriIgnoredReason =
        "Shalat Idulfitri hanya aktif pada tanggal 1 Syawal.";
    } else {
      const previousIdulfitri = await db
        .select({
          reportDate: dailyReports.reportDate,
          answers: dailyReports.answers,
        })
        .from(dailyReports)
        .where(eq(dailyReports.userId, me.id));
      const alreadyCompleted = previousIdulfitri.some((row) => {
        const ids = row.answers?.selectedMissionIds || [];
        return (
          Array.isArray(ids) &&
          ids.includes(idulfitriMission.id) &&
          row.reportDate !== reportDate
        );
      });
      if (alreadyCompleted) {
        selectedMissionIds = selectedMissionIds.filter(
          (id) => id !== idulfitriMission.id,
        );
        idulfitriIgnoredReason =
          "Shalat Idulfitri hanya dapat dihitung satu kali.";
      }
    }
  }

  let normalizedKultumReport:
    | {
        teacherVideoId: number;
        videoId: string;
        youtubeUrl: string;
        title: string;
        ustadz?: string;
        ringkasan: string;
        poinPelajaran: string[];
        submittedAt: string;
      }
    | undefined;
  if (payload.kultumReport) {
    const selectedVideo = await db.query.teacherVideos.findFirst({
      where: and(
        eq(teacherVideos.id, payload.kultumReport.teacherVideoId),
        eq(teacherVideos.active, true),
      ),
    });
    if (!selectedVideo) {
      return c.json(
        { message: "Video kultum tidak valid atau sudah tidak aktif." },
        400,
      );
    }
    if (kultumMission && !selectedMissionIds.includes(kultumMission.id)) {
      selectedMissionIds = [...selectedMissionIds, kultumMission.id];
    }
    normalizedKultumReport = {
      teacherVideoId: selectedVideo.id,
      videoId: selectedVideo.videoId,
      youtubeUrl: selectedVideo.youtubeUrl,
      title: selectedVideo.title,
      ustadz: selectedVideo.ustadz || undefined,
      ringkasan: payload.kultumReport.ringkasan.trim(),
      poinPelajaran: payload.kultumReport.poinPelajaran
        .map((p) => p.trim())
        .filter(Boolean),
      submittedAt: new Date().toISOString(),
    };
  }

  selectedMissionIds = Array.from(new Set(selectedMissionIds));
  const nowIso = new Date().toISOString();
  const normalizedChecklistTimestamps = selectedMissionIds.reduce<
    Record<string, string>
  >((acc, missionId) => {
    const key = String(missionId);
    const existingValue = payload.checklistTimestamps[key];
    acc[key] =
      typeof existingValue === "string" && existingValue.trim().length > 0
        ? existingValue
        : nowIso;
    return acc;
  }, {});

  const calc = await calculateDailyXp({
    ...payload,
    selectedMissionIds,
  });

  await db
    .insert(dailyReports)
    .values({
      userId: me.id,
      reportDate,
      narration: payload.narration || null,
      xpGained: calc.xpGained,
      bonusXp: calc.bonusXp,
      answers: {
        fasting: payload.fasting,
        selectedMissionIds,
        sunnahBoost: payload.sunnahBoost,
        prayerReports: payload.prayerReports,
        checklistTimestamps: normalizedChecklistTimestamps,
        prayerReportTimestamps: payload.prayerReportTimestamps,
        murajaahXpBonus: payload.murajaahXpBonus,
        tadarusReport: payload.tadarusReport,
        idulfitriReport: payload.idulfitriReport,
        zakatFitrah: payload.zakatFitrah,
        silaturahimReport: payload.silaturahimReport,
        kultumReport: normalizedKultumReport,
      },
    })
    .onConflictDoUpdate({
      target: [dailyReports.userId, dailyReports.reportDate],
      set: {
        narration: payload.narration || null,
        xpGained: calc.xpGained,
        bonusXp: calc.bonusXp,
        answers: {
          fasting: payload.fasting,
          selectedMissionIds,
          sunnahBoost: payload.sunnahBoost,
          prayerReports: payload.prayerReports,
          checklistTimestamps: normalizedChecklistTimestamps,
          prayerReportTimestamps: payload.prayerReportTimestamps,
          murajaahXpBonus: payload.murajaahXpBonus,
          tadarusReport: payload.tadarusReport,
          idulfitriReport: payload.idulfitriReport,
          zakatFitrah: payload.zakatFitrah,
          silaturahimReport: payload.silaturahimReport,
          kultumReport: normalizedKultumReport,
        },
        updatedAt: new Date(),
      },
    });

  const progress = await recomputeUserProgress(me.id);

  return c.json({
    message: "Report submitted",
    reportDate,
    xp: calc,
    progress,
    meta: {
      idulfitriIgnored: Boolean(idulfitriIgnoredReason),
      idulfitriIgnoredReason,
    },
  });
});

app.get(
  "/reports/history",
  zValidator(
    "query",
    z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  ),
  async (c) => {
    const me = c.get("user");
    const { month } = c.req.valid("query");
    const monthStart = startOfMonth(new Date(`${month}-01`))
      .toISOString()
      .slice(0, 10);
    const monthEnd = endOfMonth(new Date(`${month}-01`))
      .toISOString()
      .slice(0, 10);

    const reports = await db
      .select()
      .from(dailyReports)
      .where(
        and(
          eq(dailyReports.userId, me.id),
          gte(dailyReports.reportDate, monthStart),
          lte(dailyReports.reportDate, monthEnd),
        ),
      )
      .orderBy(desc(dailyReports.reportDate));

    return c.json({
      month,
      reports,
    });
  },
);

app.get(
  "/leaderboard",
  zValidator(
    "query",
    z.object({
      scope: z.enum(["school", "classroom"]).default("school"),
    }),
  ),
  async (c) => {
    const me = c.get("user");
    const { scope } = c.req.valid("query");
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, me.id),
    });
    if (!currentUser) return c.json({ message: "User not found" }, 404);

    const ranking =
      scope === "classroom" && currentUser.classroom
        ? await db
            .select({
              id: users.id,
              name: users.name,
              image: users.image,
              classroom: users.classroom,
              totalXp: users.totalXp,
              currentStreak: users.currentStreak,
            })
            .from(users)
            .where(eq(users.classroom, currentUser.classroom))
            .orderBy(desc(users.totalXp))
            .limit(50)
        : await db
            .select({
              id: users.id,
              name: users.name,
              image: users.image,
              classroom: users.classroom,
              totalXp: users.totalXp,
              currentStreak: users.currentStreak,
            })
            .from(users)
            .orderBy(desc(users.totalXp))
            .limit(50);

    return c.json({
      scope,
      ranking,
    });
  },
);

export const runtime = "nodejs";
const handler = handle(app);
export { handler as GET, handler as POST, handler as PUT, handler as PATCH };
