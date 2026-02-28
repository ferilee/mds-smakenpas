import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { GuruFilterForm } from "@/components/guru-filter-form";
import { dailyReports, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayDateString } from "@/lib/xp";

type GuruBerandaPageProps = {
  searchParams?: Promise<{
    classroom?: string;
    major?: string;
    date?: string;
  }>;
};

type StudentRow = {
  id: string;
  name: string;
  classroom: string | null;
  major: string | null;
  totalXp: number;
  currentStreak: number;
  role: string;
};

type ReportRow = {
  id: number;
  userId: string;
  reportDate: string;
  xpGained: number;
  narration: string | null;
  answers: DailyReport["answers"];
};

function toDateString(date: Date) {
  try {
    if (isNaN(date.getTime())) return todayDateString();
    return date.toISOString().slice(0, 10);
  } catch {
    return todayDateString();
  }
}

function shiftDate(dateString: string, deltaDays: number) {
  try {
    const base = new Date(`${dateString}T00:00:00.000Z`);
    if (isNaN(base.getTime())) return dateString;
    base.setUTCDate(base.getUTCDate() + deltaDays);
    return toDateString(base);
  } catch {
    return dateString;
  }
}

export default async function GuruBerandaPage({
  searchParams,
}: GuruBerandaPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "guru" && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = todayDateString();
  const selectedDate =
    resolvedSearchParams?.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date)
      ? resolvedSearchParams.date
      : today;
  const weekStart = shiftDate(selectedDate, -6);
  const selectedClassroom = resolvedSearchParams?.classroom || "";
  const selectedMajor = resolvedSearchParams?.major || "";

  const [me, allStudents, reportsRange] = await Promise.all([
    db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, session.user.id),
    }),
    db
      .select({
        id: users.id,
        name: users.name,
        classroom: users.classroom,
        major: users.major,
        totalXp: users.totalXp,
        currentStreak: users.currentStreak,
        role: users.role,
      })
      .from(users)
      .orderBy(asc(users.classroom), asc(users.name)),
    db
      .select({
        id: dailyReports.id,
        userId: dailyReports.userId,
        reportDate: dailyReports.reportDate,
        xpGained: dailyReports.xpGained,
        narration: dailyReports.narration,
        answers: dailyReports.answers,
      })
      .from(dailyReports)
      .where(
        and(
          gte(dailyReports.reportDate, weekStart),
          lte(dailyReports.reportDate, selectedDate),
        ),
      ),
  ]);

  if (!me) redirect("/login");

  const students: StudentRow[] = allStudents.filter((row) => {
    const roleMatch = row.role === "siswa" || row.role === "user";
    const classMatch =
      !selectedClassroom || (row.classroom || "") === selectedClassroom;
    const majorMatch = !selectedMajor || (row.major || "") === selectedMajor;
    return roleMatch && classMatch && majorMatch;
  });

  const studentIds = new Set(students.map((row) => row.id));
  const scopedReports: ReportRow[] = reportsRange.filter((row) =>
    studentIds.has(row.userId),
  );

  const reportsToday = scopedReports.filter(
    (row) => row.reportDate === selectedDate,
  );

  const totalStudents = students.length;
  const submittedStudents = reportsToday.length;
  const completionPercent = totalStudents
    ? Math.round((submittedStudents / totalStudents) * 100)
    : 0;
  const avgXpPerSubmit = submittedStudents
    ? Math.round(
        reportsToday.reduce((sum, row) => sum + (row.xpGained || 0), 0) /
          submittedStudents,
      )
    : 0;

  const shalatSummary = reportsToday.reduce(
    (acc, row) => {
      const prayerReports = row.answers?.prayerReports || {};
      Object.values(prayerReports).forEach((mode) => {
        if (mode === "Berjamaah") acc.berjamaah += 1;
        if (mode === "Munfarid") acc.munfarid += 1;
      });
      return acc;
    },
    { berjamaah: 0, munfarid: 0 },
  );

  const tadarusSummary = reportsToday.reduce(
    (acc, row) => {
      const answers = row.answers;
      const totalAyat = Number(answers?.tadarusReport?.totalAyatRead || 0);
      if (totalAyat > 0) {
        acc.peserta += 1;
        acc.ayat += totalAyat;
      }
      return acc;
    },
    { peserta: 0, ayat: 0 },
  );

  const kultumSummary = reportsToday.reduce(
    (acc, row) => {
      const ringkasan = row.answers?.kultumReport?.ringkasan || "";
      if (ringkasan.trim()) {
        acc.peserta += 1;
        acc.totalChar += ringkasan.trim().length;
      }
      return acc;
    },
    { peserta: 0, totalChar: 0 },
  );

  const classroomOptions = Array.from(
    new Set(students.map((row) => row.classroom || "").filter(Boolean)),
  ) as string[];
  const majorOptions = Array.from(
    new Set(students.map((row) => row.major || "").filter(Boolean)),
  ) as string[];

  const sidebarGroups = [
    {
      title: "Ringkasan",
      items: [
        { label: "Beranda", href: "/guru/beranda" },
        { label: "Monitoring", href: "/guru/monitoring" },
        { label: "Analitik", href: "/guru/analytics" },
      ],
    },
    {
      title: "Manajemen",
      items: [{ label: "Kultum", href: "/guru/kultum" }, { label: "Materi Fikih", href: "/guru/fikih" }],
    },
    {
      title: "Akses",
      items: [
        { label: "Peringkat", href: "/leaderboard" },
        ...(session.user.role === "admin"
          ? [{ label: "Admin Dashboard", href: "/admin/beranda" }]
          : []),
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-6">
      <div className="lg:flex lg:items-start lg:gap-6">
        <DashboardSidebar
          panelLabel="Guru Dashboard"
          heading="Beranda"
          subheading={me.name}
          currentPath="/guru/beranda"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DashboardBreadcrumbs
                items={[
                  { label: "Guru", href: "/guru/beranda" },
                  { label: "Beranda" },
                ]}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Guru Beranda
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Statistik Aktivitas Siswa
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Ringkasan aktivitas checklist untuk {selectedDate}.
              </p>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <GuruFilterForm
              selectedClassroom={selectedClassroom}
              selectedMajor={selectedMajor}
              selectedDate={selectedDate}
              classroomOptions={classroomOptions}
              majorOptions={majorOptions}
              actionHref="/guru/beranda"
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Siswa Aktif
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalStudents}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sudah Isi Checklist
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">
                {submittedStudents}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Completion Rate
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {completionPercent}%
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rata-rata XP Harian
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {avgXpPerSubmit}
              </p>
            </article>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-3">
            {(
              [
                {
                  title: "Monitoring Kelas",
                  description: "Pantau aktivitas harian dan detail siswa.",
                  href: "/guru/monitoring",
                },
                {
                  title: "Analitik & Risiko",
                  description: "Lihat tren dan siswa yang perlu perhatian.",
                  href: "/guru/analytics",
                },
                {
                  title: "Video Kultum",
                  description: "Kelola video kultum untuk siswa.",
                  href: "/guru/kultum",
                },
              ] as const
            ).map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {item.description}
                </p>
              </Link>
            ))}
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Analisis Shalat
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Berjamaah:{" "}
                <span className="font-semibold">{shalatSummary.berjamaah}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Munfarid:{" "}
                <span className="font-semibold">{shalatSummary.munfarid}</span>
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Analisis Tadarus
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Peserta:{" "}
                <span className="font-semibold">{tadarusSummary.peserta}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Total ayat:{" "}
                <span className="font-semibold">{tadarusSummary.ayat}</span>
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Analisis Kultum
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                Peserta:{" "}
                <span className="font-semibold">{kultumSummary.peserta}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Rata-rata panjang ringkasan:{" "}
                <span className="font-semibold">
                  {kultumSummary.peserta
                    ? Math.round(
                        kultumSummary.totalChar / kultumSummary.peserta,
                      )
                    : 0}{" "}
                  karakter
                </span>
              </p>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
