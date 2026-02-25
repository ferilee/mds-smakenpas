import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { DailyChecklist } from "@/components/daily-checklist";
import { FastingConfirmationIndicator } from "@/components/fasting-confirmation-indicator";
import { ProfileInfoModal } from "@/components/profile-info-modal";
import { AccountLockModal } from "@/components/account-lock-modal";
import { ProgressCards } from "@/components/progress-cards";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeLevel } from "@/lib/xp";

type DashboardPageProps = {
  searchParams?: Promise<{
    panel?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPrayerPanelOpen = resolvedSearchParams?.panel === "prayer";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  if (role === "admin") redirect("/admin/dashboard" as Route);
  if (role === "guru") redirect("/guru/dashboard" as Route);

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
            Leaderboard
          </Link>
          <Link
            href={isPrayerPanelOpen ? "/dashboard" : "/dashboard?panel=prayer"}
            className={`grid h-10 w-10 place-items-center rounded-xl border ${isPrayerPanelOpen
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
          <article className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Materi Fikih Ramadan
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Taharah, wudlu, dan mandi wajib.</li>
              <li>Tata cara shalat wajib dan tarawih.</li>
              <li>Puasa Ramadan: rukun, adab, dan evaluasi.</li>
            </ul>
            <Link
              href="/materi-ramadan"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 dark:text-brand-300"
            >
              Buka halaman materi →
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
