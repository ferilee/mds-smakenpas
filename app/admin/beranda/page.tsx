import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { AdminFilterForm } from "@/components/admin-filter-form";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { dailyReports, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGuruDomainEmail } from "@/lib/roles";
import { todayDateString } from "@/lib/xp";

type AdminBerandaProps = {
  searchParams?: Promise<{
    classroom?: string;
    date?: string;
  }>;
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
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateString: string, deltaDays: number) {
  const base = new Date(`${dateString}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return toDateString(base);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function AdminBerandaPage({
  searchParams,
}: AdminBerandaProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = todayDateString();
  const selectedDate =
    resolvedSearchParams?.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date)
      ? resolvedSearchParams.date
      : today;
  const selectedClassroom = resolvedSearchParams?.classroom || "";
  const previousDate = shiftDate(selectedDate, -1);
  const range30Start = shiftDate(selectedDate, -29);

  const [me, allUsers, reportsRange] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    }),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        classroom: users.classroom,
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
          gte(dailyReports.reportDate, range30Start),
          lte(dailyReports.reportDate, selectedDate),
        ),
      ),
  ]);

  if (!me) redirect("/login");

  const studentUsers = allUsers.filter(
    (user) => user.role === "siswa" || user.role === "user",
  );
  const teacherUsers = allUsers.filter(
    (user) => user.role === "guru" || isGuruDomainEmail(user.email),
  );
  const adminUsers = allUsers.filter((user) => user.role === "admin");

  const classroomOptions = Array.from(
    new Set(studentUsers.map((row) => row.classroom || "").filter(Boolean)),
  ) as string[];

  const students = selectedClassroom
    ? studentUsers.filter((row) => (row.classroom || "") === selectedClassroom)
    : studentUsers;
  const studentIds = new Set(students.map((row) => row.id));

  const scopedReports: ReportRow[] = reportsRange.filter((row) =>
    studentIds.has(row.userId),
  );
  const reportsToday = scopedReports.filter(
    (row) => row.reportDate === selectedDate,
  );
  const reportsPrevious = scopedReports.filter(
    (row) => row.reportDate === previousDate,
  );

  const totalStudents = students.length;
  const totalTeachers = teacherUsers.length;
  const totalAdmins = adminUsers.length;
  const todaySubmitted = reportsToday.length;
  const completionRate = totalStudents
    ? Math.round((todaySubmitted / totalStudents) * 100)
    : 0;
  const previousCompletion = totalStudents
    ? Math.round((reportsPrevious.length / totalStudents) * 100)
    : 0;
  const completionTrend = completionRate - previousCompletion;
  const avgXpToday = todaySubmitted
    ? Math.round(
        reportsToday.reduce((sum, row) => sum + (row.xpGained || 0), 0) /
          todaySubmitted,
      )
    : 0;

  const qualityToday = reportsToday.reduce(
    (acc, row) => {
      const tadarusComplete =
        Number(row.answers?.tadarusReport?.totalAyatRead || 0) > 0;
      const kultumComplete = Boolean(
        asString(row.answers?.kultumReport?.ringkasan).trim(),
      );
      const silaturahimComplete = Boolean(
        asString(row.answers?.silaturahimReport?.location).trim(),
      );
      const refleksiComplete = Boolean(row.narration?.trim());
      if (tadarusComplete) acc.tadarus += 1;
      if (kultumComplete) acc.kultum += 1;
      if (silaturahimComplete) acc.silaturahim += 1;
      if (refleksiComplete) acc.refleksi += 1;
      return acc;
    },
    { tadarus: 0, kultum: 0, silaturahim: 0, refleksi: 0 },
  );

  const qualityPercent = {
    tadarus: todaySubmitted
      ? Math.round((qualityToday.tadarus / todaySubmitted) * 100)
      : 0,
    kultum: todaySubmitted
      ? Math.round((qualityToday.kultum / todaySubmitted) * 100)
      : 0,
    silaturahim: todaySubmitted
      ? Math.round((qualityToday.silaturahim / todaySubmitted) * 100)
      : 0,
    refleksi: todaySubmitted
      ? Math.round((qualityToday.refleksi / todaySubmitted) * 100)
      : 0,
  };

  const sidebarGroups = [
    {
      title: "Ringkasan",
      items: [
        { label: "Beranda", href: "/admin/beranda" },
        { label: "Monitoring", href: "/admin/monitoring" },
        { label: "Analitik", href: "/admin/analytics" },
      ],
    },
    {
      title: "Manajemen",
      items: [
        { label: "Manajemen User", href: "/admin/users" },
        { label: "Peringkat", href: "/leaderboard" },
      ],
    },
    {
      title: "Akses",
      items: [{ label: "Guru Dashboard", href: "/guru/beranda" }],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-6">
      <div className="lg:flex lg:items-start lg:gap-6">
        <DashboardSidebar
          panelLabel="Admin Dashboard"
          heading="Beranda"
          subheading={me.name}
          currentPath="/admin/beranda"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DashboardBreadcrumbs
                items={[
                  { label: "Admin", href: "/admin/beranda" },
                  { label: "Beranda" },
                ]}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Admin Beranda
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Statistik Aktivitas Siswa
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Ringkasan aktivitas siswa lintas kelas untuk {selectedDate}.
              </p>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <AdminFilterForm
              selectedClassroom={selectedClassroom}
              selectedDate={selectedDate}
              classroomOptions={classroomOptions}
              actionHref="/admin/beranda"
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Siswa
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalStudents}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Guru
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalTeachers}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akun Admin
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalAdmins}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan Hari Ini
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">
                {todaySubmitted}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Completion Rate
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {completionRate}%
              </p>
              <p
                className={`text-xs font-semibold ${
                  completionTrend >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {completionTrend >= 0 ? `+${completionTrend}` : completionTrend}
                % vs kemarin
              </p>
            </article>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Kualitas Pelaporan (Hari Ini)
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  {
                    label: "Tadarus",
                    value: qualityPercent.tadarus,
                    count: qualityToday.tadarus,
                  },
                  {
                    label: "Kultum",
                    value: qualityPercent.kultum,
                    count: qualityToday.kultum,
                  },
                  {
                    label: "Silaturahim",
                    value: qualityPercent.silaturahim,
                    count: qualityToday.silaturahim,
                  },
                  {
                    label: "Refleksi",
                    value: qualityPercent.refleksi,
                    count: qualityToday.refleksi,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {item.value}%
                    </p>
                    <p className="text-xs text-brand-700 dark:text-brand-300">
                      {item.count}/{todaySubmitted || 0} laporan
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Rata-rata XP hari ini: {avgXpToday}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Ringkasan Aktivitas
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Gunakan menu samping untuk masuk ke monitoring detail, analitik
                kelas, dan manajemen user.
              </p>
            </article>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Quick Actions
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Monitoring Siswa", href: "/admin/monitoring" },
                { label: "Analitik Kelas", href: "/admin/analytics" },
                { label: "Manajemen User", href: "/admin/users" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
