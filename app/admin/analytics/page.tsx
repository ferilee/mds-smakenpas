import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { AdminFilterForm } from "@/components/admin-filter-form";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PDFExportButton } from "@/components/pdf-export-button";
import { dailyReports, missions, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGuruDomainEmail } from "@/lib/roles";
import { todayDateString } from "@/lib/xp";

type AdminAnalyticsPageProps = {
  searchParams?: Promise<{
    classroom?: string;
    date?: string;
  }>;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  classroom: string | null;
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
  return date.toISOString().slice(0, 10);
}

function shiftDate(dateString: string, deltaDays: number) {
  const base = new Date(`${dateString}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return toDateString(base);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
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
  const range14Start = shiftDate(selectedDate, -13);
  const range30Start = shiftDate(selectedDate, -29);
  const range7Start = shiftDate(selectedDate, -6);

  const [me, allUsers, activeMissions, reportsRange] = await Promise.all([
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
        id: missions.id,
        code: missions.code,
        title: missions.title,
        category: missions.category,
      })
      .from(missions)
      .where(eq(missions.active, true))
      .orderBy(asc(missions.category), asc(missions.id)),
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

  const studentUsers: UserRow[] = allUsers.filter(
    (user) => user.role === "siswa" || user.role === "user",
  );
  const teacherUsers: UserRow[] = allUsers.filter(
    (user) => user.role === "guru" || isGuruDomainEmail(user.email),
  );
  const adminUsers: UserRow[] = allUsers.filter(
    (user) => user.role === "admin",
  );

  const classroomOptions = Array.from(
    new Set(studentUsers.map((row) => row.classroom || "").filter(Boolean)),
  ) as string[];

  const students = selectedClassroom
    ? studentUsers.filter((row) => (row.classroom || "") === selectedClassroom)
    : studentUsers;
  const studentIds = new Set(students.map((row) => row.id));
  const userById = new Map(students.map((row) => [row.id, row]));

  const scopedReports: ReportRow[] = reportsRange.filter((row) =>
    studentIds.has(row.userId),
  );
  const reportsToday = scopedReports.filter(
    (row) => row.reportDate === selectedDate,
  );
  const reportsPrevious = scopedReports.filter(
    (row) => row.reportDate === previousDate,
  );
  const reports14 = scopedReports.filter(
    (row) => row.reportDate >= range14Start,
  );
  const reports7 = scopedReports.filter((row) => row.reportDate >= range7Start);

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

  const classStudentsMap = students.reduce<Record<string, UserRow[]>>(
    (acc, user) => {
      const key = user.classroom || "Tanpa kelas";
      acc[key] = acc[key] || [];
      acc[key].push(user);
      return acc;
    },
    {},
  );

  const heatmapRows = Object.entries(classStudentsMap)
    .map(([classroom, classroomStudents]) => {
      const classStudentIds = new Set(classroomStudents.map((s) => s.id));
      const classReportsToday = reportsToday.filter((r) =>
        classStudentIds.has(r.userId),
      );
      const missionCells = activeMissions.map((mission) => {
        const completed = classReportsToday.filter((r) =>
          asArray(r.answers?.selectedMissionIds).includes(mission.id),
        ).length;
        const percent = classroomStudents.length
          ? Math.round((completed / classroomStudents.length) * 100)
          : 0;
        return { missionId: mission.id, completed, percent };
      });
      return {
        classroom,
        studentCount: classroomStudents.length,
        missionCells,
      };
    })
    .sort((a, b) => b.studentCount - a.studentCount);

  const classRanking = Object.entries(classStudentsMap)
    .map(([classroom, classroomStudents]) => {
      const classStudentIds = new Set(classroomStudents.map((s) => s.id));
      const classTodayReports = reportsToday.filter((r) =>
        classStudentIds.has(r.userId),
      );
      const classWeekReports = reports7.filter((r) =>
        classStudentIds.has(r.userId),
      );
      const completionToday = classroomStudents.length
        ? Math.round(
            (classTodayReports.length / classroomStudents.length) * 100,
          )
        : 0;
      const consistencyWeek = classroomStudents.length
        ? Math.round(
            (classWeekReports.length / (classroomStudents.length * 7)) * 100,
          )
        : 0;
      const avgClassXp = classroomStudents.length
        ? Math.round(
            classroomStudents.reduce((sum, row) => sum + row.totalXp, 0) /
              classroomStudents.length,
          )
        : 0;
      return {
        classroom,
        students: classroomStudents.length,
        completionToday,
        consistencyWeek,
        avgClassXp,
      };
    })
    .sort((a, b) => {
      if (b.completionToday !== a.completionToday) {
        return b.completionToday - a.completionToday;
      }
      if (b.consistencyWeek !== a.consistencyWeek) {
        return b.consistencyWeek - a.consistencyWeek;
      }
      return b.avgClassXp - a.avgClassXp;
    });

  const trendDays = Array.from({ length: 14 }).map((_, idx) =>
    shiftDate(selectedDate, -(13 - idx)),
  );
  const trendRows = trendDays.map((day) => {
    const dayReports = reports14.filter((r) => r.reportDate === day);
    const avgXp = dayReports.length
      ? Math.round(
          dayReports.reduce((sum, row) => sum + row.xpGained, 0) /
            dayReports.length,
        )
      : 0;
    const completion = totalStudents
      ? Math.round((dayReports.length / totalStudents) * 100)
      : 0;
    return { day, reports: dayReports.length, avgXp, completion };
  });

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

  const anomalies = reportsToday
    .map((report) => {
      const student = userById.get(report.userId);
      if (!student) return null;
      const issues: string[] = [];
      const totalAyat = Number(
        report.answers?.tadarusReport?.totalAyatRead || 0,
      );
      if (totalAyat > 300) issues.push(`Tadarus tinggi (${totalAyat} ayat)`);
      const selectedMissionIds = asArray(report.answers?.selectedMissionIds);
      const checklistTs = asRecord(report.answers?.checklistTimestamps);
      const missingTs = selectedMissionIds.some(
        (id) => !checklistTs[String(id)],
      );
      if (missingTs) issues.push("Timestamp checklist ada yang kosong");
      const kultumRingkasan = asString(
        report.answers?.kultumReport?.ringkasan,
      ).trim();
      if (kultumRingkasan && kultumRingkasan.length < 120) {
        issues.push("Ringkasan kultum terlalu pendek");
      }
      if (!issues.length) return null;
      return {
        reportId: report.id,
        studentName: student.name,
        classroom: student.classroom || "Tanpa kelas",
        issues,
      };
    })
    .filter(Boolean)
    .slice(0, 12) as Array<{
    reportId: number;
    studentName: string;
    classroom: string;
    issues: string[];
  }>;

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
        { label: "Leaderboard", href: "/leaderboard" },
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
          heading="Analitik"
          subheading={me.name}
          currentPath="/admin/analytics"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DashboardBreadcrumbs
                items={[
                  { label: "Admin", href: "/admin/beranda" },
                  { label: "Analitik" },
                ]}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Admin Analitik
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Analitik Aktivitas Kelas
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {me.name} • Ringkasan kinerja kelas dan kualitas laporan.
              </p>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <AdminFilterForm
              selectedClassroom={selectedClassroom}
              selectedDate={selectedDate}
              classroomOptions={classroomOptions}
              actionHref="/admin/analytics"
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

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Heatmap Kelas (Hari Ini)
              </h2>
              <PDFExportButton
                title="Heatmap Kelas"
                subtitle={`${selectedDate} | ${selectedClassroom || "Semua Kelas"}`}
                filename={`heatmap-kepatuhan-${selectedDate}.pdf`}
                headers={["Kelas", ...activeMissions.map((m) => m.title)]}
                data={heatmapRows.map((row) => [
                  row.classroom,
                  ...row.missionCells.map((cell) => `${cell.percent}%`),
                ])}
                buttonLabel="Export PDF Heatmap"
                orientation="landscape"
                verticalHeader={true}
                columnStyles={Object.fromEntries([
                  [0, { cellWidth: 30, halign: "left" }],
                  ...activeMissions.map((_, i) => [i + 1, { cellWidth: 13.2 }]),
                ])}
                margin={{ top: 40, left: 40, right: 30, bottom: 30 }}
              />
            </div>
            <div className="overflow-x-auto">
              {heatmapRows.length > 0 ? (
                <table className="w-full min-w-[780px] text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="pb-2 pr-2">Kelas</th>
                      {activeMissions.map((mission) => (
                        <th key={mission.id} className="pb-2 pr-2">
                          {mission.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapRows.map((row) => (
                      <tr
                        key={row.classroom}
                        className="border-t border-slate-200 dark:border-slate-700"
                      >
                        <td className="py-2 pr-2 font-semibold text-slate-700 dark:text-slate-200">
                          {row.classroom}
                        </td>
                        {row.missionCells.map((cell) => (
                          <td key={cell.missionId} className="py-2 pr-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                                cell.percent >= 80
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : cell.percent >= 50
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              }`}
                            >
                              {cell.percent}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tidak ada data misi untuk ditampilkan.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Ranking Kelas
              </h2>
              <div className="mt-3 space-y-2">
                {classRanking.length > 0 ? (
                  classRanking.map((row, idx) => (
                    <div
                      key={row.classroom}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        #{idx + 1} {row.classroom}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.students} siswa • completion {row.completionToday}%
                        • consistency 7 hari {row.consistencyWeek}%
                      </p>
                      <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                        Avg XP kelas: {row.avgClassXp}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Peringkat kelas belum tersedia.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tren 14 Hari
              </h2>
              <div className="mt-3 space-y-1">
                {trendRows.map((row) => (
                  <div
                    key={row.day}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {row.day}
                    </span>
                    <span className="text-slate-700 dark:text-slate-200">
                      {row.reports} laporan • {row.completion}% • avg{" "}
                      {row.avgXp} XP
                    </span>
                  </div>
                ))}
              </div>
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
                Audit Anomali Data
              </h2>
              <div className="mt-3 space-y-2">
                {anomalies.length ? (
                  anomalies.map((item) => (
                    <div
                      key={item.reportId}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200"
                    >
                      <p className="font-semibold">
                        {item.studentName} • {item.classroom}
                      </p>
                      <p>{item.issues.join(", ")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tidak ada anomali pada tanggal ini.
                  </p>
                )}
              </div>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
