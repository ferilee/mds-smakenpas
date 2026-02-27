import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  classroom: text("classroom"),
  gender: text("gender"),
  major: text("major"),
  role: text("role").notNull().default("siswa"),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  totalXp: integer("total_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  lastReportDate: date("last_report_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  xp: integer("xp").notNull(),
  requiresNarration: boolean("requires_narration").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teacherVideos = pgTable("teacher_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull().unique(),
  videoId: text("video_id").notNull().unique(),
  ustadz: text("ustadz"),
  active: boolean("active").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const dailyReports = pgTable(
  "daily_reports",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportDate: date("report_date").notNull(),
    answers: jsonb("answers")
      .$type<{
        fasting: boolean;
        selectedMissionIds: number[];
        sunnahBoost: number;
        prayerReports?: Partial<
          Record<
            "Subuh" | "Dzuhur" | "Ashar" | "Maghrib" | "Isya",
            "Berjamaah" | "Munfarid"
          >
        >;
        checklistTimestamps?: Record<string, string>;
        prayerReportTimestamps?: Partial<
          Record<"Subuh" | "Dzuhur" | "Ashar" | "Maghrib" | "Isya", string>
        >;
        murajaahXpBonus?: number;
        tadarusReport?: {
          surahName: string;
          ayatFrom: number;
          ayatTo: number;
          totalAyatRead: number;
        };
        idulfitriReport?: {
          place: string;
          khatib: string;
          khutbahSummary: string;
        };
        zakatFitrah?: {
          via: string;
          address: string;
          date: string;
          form: "Beras" | "Uang";
          amount: string;
        };
        silaturahimReport?: {
          teacherName: string;
          location: string;
          recordedAt: string;
          purpose?: string;
          lessonSummary?: string;
          proofPhotoDataUrl?: string;
          proofPhotoUrl?: string;
          proofPhotoObjectKey?: string;
        };
        kultumReport?: {
          teacherVideoId: number;
          videoId: string;
          youtubeUrl: string;
          title: string;
          ustadz?: string;
          ringkasan: string;
          poinPelajaran: string[];
          submittedAt: string;
        };
        silaturahimHistory?: {
          teacherName: string;
          location: string;
          recordedAt: string;
          purpose?: string;
          lessonSummary?: string;
          proofPhotoUrl?: string;
          proofPhotoObjectKey?: string;
        }[];
      }>()
      .notNull(),
    narration: text("narration"),
    xpGained: integer("xp_gained").notNull(),
    bonusXp: integer("bonus_xp").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userDateUnique: uniqueIndex("daily_reports_user_id_report_date_uq").on(
      table.userId,
      table.reportDate,
    ),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  reports: many(dailyReports),
}));

export const reportsRelations = relations(dailyReports, ({ one }) => ({
  user: one(users, {
    fields: [dailyReports.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type DailyReport = typeof dailyReports.$inferSelect;
export type TeacherVideo = typeof teacherVideos.$inferSelect;

export const sumXp = sql<number>`coalesce(sum(${dailyReports.xpGained}), 0)`;
