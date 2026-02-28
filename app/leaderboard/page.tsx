import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { GlobalBottomNav } from "@/components/global-bottom-nav";
import { ProfileInfoModal } from "@/components/profile-info-modal";
import { ProgressCards } from "@/components/progress-cards";
import { DeveloperInfoButton } from "@/components/developer-info-button";
import { PabpProfilesButton } from "@/components/pabp-profiles-button";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { FastingConfirmationIndicator } from "@/components/fasting-confirmation-indicator";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeLevel } from "@/lib/xp";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) redirect("/login");
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
            href="/dashboard"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 dark:border-slate-700 dark:text-slate-200"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.8"
                strokeLinejoin="round"
                d="M12 3 4 9v11h16V9l-8-6Z"
              />
            </svg>
          </Link>
          <Link
            href="/leaderboard"
            className="grid h-10 w-10 place-items-center rounded-xl border border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
            aria-label="Peringkat"
            title="Peringkat"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.8"
                strokeLinejoin="round"
                d="M4 19h16M7 19V9h3v10m4 0V5h3v14"
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

      <div className="mt-5 sm:mt-6">
        <LeaderboardTable />
      </div>
      <GlobalBottomNav />
    </main>
  );
}
