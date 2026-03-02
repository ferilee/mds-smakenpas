import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { DailyChecklist } from "@/components/daily-checklist";
import { FastingConfirmationIndicator } from "@/components/fasting-confirmation-indicator";
import { ProfileInfoModal } from "@/components/profile-info-modal";
import { AccountLockModal } from "@/components/account-lock-modal";
import { DeveloperInfoButton } from "@/components/developer-info-button";
import { PabpProfilesButton } from "@/components/pabp-profiles-button";
import { ProgressCards } from "@/components/progress-cards";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyReports, users } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { computeLevel } from "@/lib/xp";

type DashboardPageProps = {
  searchParams?: Promise<{
    panel?: string;
  }>;
};

function toDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPrayerPanelOpen = resolvedSearchParams?.panel === "prayer";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  if (role === "admin") redirect("/admin/beranda" as Route);
  if (role === "guru") redirect("/guru/beranda" as Route);

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  if (role === "siswa" && !user.isProfileComplete) {
    redirect("/profiling");
  }

  if (user.isLocked) {
    return <AccountLockModal />;
  }

  const levelInfo = computeLevel(user.totalXp);
  const profileImage = user.image ?? session.user.image ?? null;
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayIndex = todayLocal.getDay();
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  const monday = addDays(todayLocal, mondayOffset);
  const sunday = addDays(monday, 6);
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const date = addDays(monday, idx);
    const dayName =
      idx === 0
        ? "S"
        : idx === 1
          ? "S"
          : idx === 2
            ? "R"
            : idx === 3
              ? "K"
              : idx === 4
                ? "J"
                : idx === 5
                  ? "S"
                  : "M";
    return {
      dateKey: toDateKey(date),
      dayName,
    };
  });

  const weeklyReports = await db
    .select({
      reportDate: dailyReports.reportDate,
      answers: dailyReports.answers,
    })
    .from(dailyReports)
    .where(
      and(
        eq(dailyReports.userId, user.id),
        gte(dailyReports.reportDate, toDateKey(monday)),
        lte(dailyReports.reportDate, toDateKey(sunday)),
      ),
    );
  const weeklyReportByDate = new Map(
    weeklyReports.map((item) => [item.reportDate, item]),
  );
  const weeklyFastingHistory = weekDays.map((day) => {
    const report = weeklyReportByDate.get(day.dateKey);
    const fasting =
      typeof report?.answers?.fasting === "boolean"
        ? report.answers.fasting
        : false;
    return {
      ...day,
      fasting,
    };
  });
  const weeklyFastingCount = weeklyFastingHistory.filter(
    (item) => item.fasting,
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-6">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Assalamualaikum,
          </p>
          <div className="mt-1 flex items-center gap-2">
            <UserAvatar
              name={user.name}
              image={profileImage}
              className="h-9 w-9"
              textClassName="text-xs"
            />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {user.name}
            </h1>
            <FastingConfirmationIndicator />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProfileInfoModal
            name={user.name}
            email={user.email}
            classroom={user.classroom}
            image={profileImage}
            totalXp={user.totalXp}
            level={levelInfo.level}
            streak={user.currentStreak}
          />
          <ThemeToggle />
          <Link
            href="/leaderboard"
            className="hidden h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.8"
                strokeLinejoin="round"
                d="M4 19h16M7 19V9h3v10m4 0V5h3v14"
              />
            </svg>
            Peringkat
          </Link>
          <Link
            href={isPrayerPanelOpen ? "/dashboard" : "/dashboard?panel=prayer"}
            className={`grid h-10 w-10 place-items-center rounded-xl border ${
              isPrayerPanelOpen
                ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-slate-300 dark:border-slate-700 dark:text-slate-200"
            }`}
            aria-label="Waktu Ibadah"
            title="Waktu Ibadah"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
              <path
                strokeWidth="1.8"
                strokeLinecap="round"
                d="M12 8v4l2.5 2.5"
              />
            </svg>
          </Link>
          <Link
            href="/history"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 dark:border-slate-700 dark:text-slate-200"
            aria-label="History"
            title="History"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <rect
                x="4"
                y="5"
                width="16"
                height="15"
                rx="2"
                strokeWidth="1.8"
              />
              <path
                strokeWidth="1.8"
                strokeLinecap="round"
                d="M8 3v4m8-4v4M4 10h16"
              />
            </svg>
          </Link>
          <Link
            href="/badges"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 dark:border-slate-700 dark:text-slate-200"
            aria-label="Badges"
            title="Badges"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="9" r="4" strokeWidth="1.8" />
              <path
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 13.5 8 21l4-2.2L16 21l-2-7.5"
              />
            </svg>
          </Link>
          <PwaInstallButton />
          <PabpProfilesButton />
          <DeveloperInfoButton />
          <SignOutButton />
        </div>
      </header>

      <ProgressCards
        totalXp={user.totalXp}
        level={levelInfo.level}
        streak={user.currentStreak}
      />

      <section className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <article className="mb-4 overflow-hidden rounded-3xl border border-orange-300/55 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-500 p-4 text-white shadow-lg shadow-orange-900/20 sm:mb-5 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-orange-50/95">
                  Streaks Puasa Minggu Ini
                </p>
                <p className="mt-1 text-4xl font-black leading-none">
                  {weeklyFastingCount} Streaks
                </p>
                <p className="mt-2 text-sm text-orange-50/95">
                  {weeklyFastingCount === 7
                    ? "MasyaAllah, penuh Senin sampai Minggu."
                    : "Jangan sampai bolong, lanjutkan puasa harianmu."}
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-orange-50/95">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="currentColor"
                >
                  <path d="M12.1 2.3c.4 2.2-.5 3.8-1.6 5.2-1.2 1.6-2.5 3.2-2.5 5.4 0 2.4 1.8 4.2 4 4.2s4-1.8 4-4.2c0-1.7-.8-3-1.8-4.2-.7-.9-1.3-1.8-1.3-3.1 1.9 1 3.6 3.2 3.6 6.2 0 3.9-3 7-7 7s-7-3.1-7-7c0-4.7 3.5-7.8 6.6-9.5z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 border-t border-white/25 pt-3">
              <div className="grid grid-cols-7 gap-1.5">
                {weeklyFastingHistory.map((day) => (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center justify-center"
                    title={`${day.dateKey}: ${day.fasting ? "Puasa" : "Belum puasa"}`}
                  >
                    <span className="text-sm font-semibold text-orange-50/95">
                      {day.dayName}
                    </span>
                    <span
                      className={`mt-1.5 h-5 w-5 rounded-full border-2 ${
                        day.fasting
                          ? "border-emerald-200 bg-emerald-300"
                          : "border-orange-100/90 bg-transparent"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </article>
          <DailyChecklist initialShowPrayerPanel={isPrayerPanelOpen} />
        </div>

        <div className="hidden space-y-4 lg:block">
          <article className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Fokus Ramadan Peserta Didik
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Monitoring meliputi hafalan surat pendek, puasa dan jamaah, ibadah
              sunnah, tadarus, kultum, hingga refleksi diri untuk evaluasi
              akhlak dan ibadah.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
