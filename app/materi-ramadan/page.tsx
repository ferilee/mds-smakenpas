import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { ProfileInfoModal } from "@/components/profile-info-modal";
import { ProgressCards } from "@/components/progress-cards";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { FastingConfirmationIndicator } from "@/components/fasting-confirmation-indicator";
import { GlobalBottomNav } from "@/components/global-bottom-nav";
import { users } from "@/db/schema";
import { db } from "@/lib/db";
import { computeLevel } from "@/lib/xp";

const topics = [
  {
    title: "Taharah",
    points: [
      "Makna bersuci sebagai syarat utama ibadah.",
      "Najis, hadas kecil, hadas besar, dan cara mensucikannya.",
      "Pembiasaan kebersihan pribadi selama Ramadan.",
    ],
  },
  {
    title: "Wudlu",
    points: [
      "Rukun, sunnah, dan hal-hal yang membatalkan wudlu.",
      "Praktik wudlu yang tertib dan hemat air.",
      "Koreksi kesalahan wudlu yang sering terjadi.",
    ],
  },
  {
    title: "Mandi Wajib",
    points: [
      "Sebab-sebab mandi wajib dan niatnya.",
      "Tata cara mandi wajib sesuai tuntunan.",
      "Keterkaitan mandi wajib dengan sahnya ibadah.",
    ],
  },
  {
    title: "Shalat",
    points: [
      "Penguatan rukun, wajib, dan sunnah shalat.",
      "Shalat berjamaah: adab makmum dan imam.",
      "Muhasabah kualitas shalat harian peserta didik.",
    ],
  },
  {
    title: "Puasa",
    points: [
      "Rukun puasa, hal yang membatalkan, dan adab puasa.",
      "Amalan pendukung: sahur, berbuka, dan doa.",
      "Strategi menjaga semangat puasa di lingkungan sekolah.",
    ],
  },
  {
    title: "Shalat Tarawih",
    points: [
      "Keutamaan qiyam Ramadan (tarawih).",
      "Adab tarawih berjamaah di masjid/mushala.",
      "Konsistensi tarawih hingga akhir Ramadan.",
    ],
  },
];

export default async function MateriRamadanPage() {
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
            href="/materi-ramadan"
            className="grid h-10 w-10 place-items-center rounded-xl border border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
            aria-label="Materi Ramadan"
            title="Materi Ramadan"
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
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5v-14Z"
              />
              <path strokeWidth="1.8" strokeLinecap="round" d="M8 8h8M8 12h8" />
            </svg>
          </Link>
          <Link
            href="/leaderboard"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 dark:border-slate-700 dark:text-slate-200"
            aria-label="Leaderboard"
            title="Leaderboard"
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
          <SignOutButton />
        </div>
      </header>

      <ProgressCards
        totalXp={user.totalXp}
        level={levelInfo.level}
        streak={user.currentStreak}
      />

      <div className="mt-5 sm:mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          Modul Pembinaan
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Materi Ramadan
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Referensi singkat untuk mendampingi checklist ibadah peserta didik
          selama Ramadan.
        </p>
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {topics.map((topic) => (
          <article
            key={topic.title}
            className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm dark:border-brand-900/40 dark:bg-slate-900/60"
          >
            <h3 className="text-lg font-semibold text-brand-800 dark:text-brand-300">
              {topic.title}
            </h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {topic.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <GlobalBottomNav />
    </main>
  );
}
