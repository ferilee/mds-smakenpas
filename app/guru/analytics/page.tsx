import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { GuruFilterForm } from "@/components/guru-filter-form";
import { dailyReports, missions, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayDateString } from "@/lib/xp";

type GuruAnalyticsPageProps = {
  searchParams?: Promise<{
    classroom?: string;
    major?: string;
    date?: string;
    riskPage?: string;
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

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function parsePage(value: string | undefined, fallback = 1) {
  const num = Number(value || "");
  if (!Number.isInteger(num) || num < 1) return fallback;
  return num;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}

function buildHref(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query
    ? (`/guru/analytics?${query}` as Route)
    : ("/guru/analytics" as Route);
}

export default async function GuruAnalyticsPage({
  searchParams,
}: GuruAnalyticsPageProps) {
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
  const riskPage = parsePage(resolvedSearchParams?.riskPage, 1);

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

  const classroomOptions = Array.from(
    new Set(allStudents.map((row) => row.classroom || "").filter(Boolean)),
  ).sort() as string[];

  const majorOptions = Array.from(
    new Set(allStudents.map((row) => row.major || "").filter(Boolean)),
  ).sort() as string[];

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
  const reportsByUserToday = new Map(
    reportsToday.map((row) => [row.userId, row]),
  );

  const totalStudents = students.length;
  const submittedStudents = reportsToday.length;
  const completionPercent = totalStudents
    ? Math.round((submittedStudents / totalStudents) * 100)
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

  const missionCompletionTarget = Math.max(1, Math.ceil(Math.max(1, 6) * 0.6));

  const siswaMonitoringRows = students.map((student) => {
    const report = reportsByUserToday.get(student.id);
    const selectedMissionCount = report
      ? asArray(report.answers?.selectedMissionIds).length
      : 0;
    const status = !report
      ? "Belum Isi"
      : selectedMissionCount >= missionCompletionTarget
        ? "Lengkap"
        : "Sebagian";
    return {
      ...student,
      status,
      todayXp: report?.xpGained || 0,
      selectedMissionCount,
    };
  });

  const classAvgXp = students.length
    ? students.reduce((sum, row) => sum + row.totalXp, 0) / students.length
    : 0;
  const atRiskStudents = siswaMonitoringRows
    .map((row) => {
      let riskScore = 0;
      if (row.status === "Belum Isi") riskScore += 2;
      if (row.currentStreak <= 1) riskScore += 1;
      if (row.totalXp < classAvgXp * 0.65) riskScore += 1;
      return { ...row, riskScore };
    })
    .filter((row) => row.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore || a.totalXp - b.totalXp)
    .slice(0, 50);
  const riskPagination = paginate(atRiskStudents, riskPage, 8);

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
      items: [{ label: "Kultum", href: "/guru/kultum" }],
    },
    {
      title: "Akses",
      items: [
        { label: "Leaderboard", href: "/leaderboard" },
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
          heading="Analitik"
          subheading={me.name}
          currentPath="/guru/analytics"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DashboardBreadcrumbs
                items={[
                  { label: "Guru", href: "/guru/beranda" },
                  { label: "Analitik" },
                ]}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Guru Analitik
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Analitik Kelas
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Statistik aktivitas siswa dan daftar siswa berisiko.
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
              actionHref="/guru/analytics"
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
                Rata-rata Ringkasan Kultum
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {kultumSummary.peserta
                  ? Math.round(kultumSummary.totalChar / kultumSummary.peserta)
                  : 0}
              </p>
            </article>
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

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Siswa Butuh Pendampingan
            </h2>
            <div className="mt-3 space-y-2">
              {riskPagination.items.length ? (
                riskPagination.items.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {row.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.classroom || "Tanpa kelas"} • status {row.status} •
                        streak {row.currentStreak}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Risk {row.riskScore}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tidak ada siswa berisiko tinggi pada filter ini.
                </p>
              )}
            </div>
            {riskPagination.totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between text-xs">
                <Link
                  href={buildHref({
                    classroom: selectedClassroom || undefined,
                    date: selectedDate,
                    riskPage: String(Math.max(1, riskPagination.page - 1)),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Sebelumnya
                </Link>
                <span className="text-slate-500 dark:text-slate-400">
                  Halaman {riskPagination.page}/{riskPagination.totalPages}
                </span>
                <Link
                  href={buildHref({
                    classroom: selectedClassroom || undefined,
                    date: selectedDate,
                    riskPage: String(
                      Math.min(
                        riskPagination.totalPages,
                        riskPagination.page + 1,
                      ),
                    ),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Berikutnya
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
