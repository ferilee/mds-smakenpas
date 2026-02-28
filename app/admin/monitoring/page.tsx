import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Pagination } from "@/components/pagination";
import { ExportCSVButton } from "@/components/export-csv-button";
import { PDFExportButton } from "@/components/pdf-export-button";
import { dailyReports, missions, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGuruDomainEmail } from "@/lib/roles";
import { todayDateString } from "@/lib/xp";

type AdminMonitoringPageProps = {
  searchParams?: Promise<{
    classroom?: string;
    date?: string;
    page?: string;
    studentId?: string;
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

function buildHref(input: {
  classroom?: string;
  date?: string;
  page?: string;
  studentId?: string;
}) {
  const params = new URLSearchParams();
  if (input.classroom) params.set("classroom", input.classroom);
  if (input.date) params.set("date", input.date);
  if (input.page) params.set("page", input.page);
  if (input.studentId) params.set("studentId", input.studentId);
  const query = params.toString();
  return query
    ? (`/admin/monitoring?${query}` as Route)
    : ("/admin/monitoring" as Route);
}

export default async function AdminMonitoringPage({
  searchParams,
}: AdminMonitoringPageProps) {
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
  const range14Start = shiftDate(selectedDate, -13);
  const range30Start = shiftDate(selectedDate, -29);

  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  const selectedStudentId = resolvedSearchParams?.studentId || "";

  const [
    me,
    allUsers,
    activeMissions,
    reportsRange,
    selectedStudent,
    selectedStudentReports,
  ] = await Promise.all([
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
    selectedStudentId
      ? db.query.users.findFirst({ where: eq(users.id, selectedStudentId) })
      : Promise.resolve(null),
    selectedStudentId
      ? db
          .select()
          .from(dailyReports)
          .where(
            and(
              eq(dailyReports.userId, selectedStudentId),
              gte(dailyReports.reportDate, range14Start),
              lte(dailyReports.reportDate, selectedDate),
            ),
          )
          .orderBy(asc(dailyReports.reportDate))
      : Promise.resolve([]),
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
  const reportByUserId = new Map(reportsToday.map((r) => [r.userId, r]));
  const missionTitleMap = new Map(activeMissions.map((m) => [m.id, m.title]));

  const totalStudents = students.length;
  const totalTeachers = teacherUsers.length;
  const totalAdmins = adminUsers.length;
  const todaySubmitted = reportsToday.length;

  const recentReports = scopedReports
    .slice()
    .sort((a, b) => {
      if (a.reportDate === b.reportDate) return b.id - a.id;
      return a.reportDate < b.reportDate ? 1 : -1;
    })
    .slice(offset, offset + pageSize)
    .map((report) => ({
      ...report,
      studentName: userById.get(report.userId)?.name || "Unknown",
      classroom: userById.get(report.userId)?.classroom || "Tanpa kelas",
    }));

  const totalPages = Math.ceil(scopedReports.length / pageSize);
  const baseUrlForPagination = `/admin/monitoring?${new URLSearchParams(
    Object.entries({
      classroom: selectedClassroom,
      date: selectedDate,
      studentId: selectedStudentId,
    }).filter(([_, v]) => v),
  ).toString()}`;

  const timelineDays = Array.from({ length: 14 }).map((_, idx) =>
    shiftDate(selectedDate, -(13 - idx)),
  );
  const selectedStudentReportByDate = new Map(
    selectedStudentReports.map((r) => [r.reportDate, r]),
  );

  const exportData = scopedReports.map((report) => ({
    ID: report.id,
    Tanggal: report.reportDate,
    Nama: userById.get(report.userId)?.name || "Unknown",
    Kelas: userById.get(report.userId)?.classroom || "Tanpa kelas",
    XP: report.xpGained,
    Misi: asArray(report.answers?.selectedMissionIds).length,
    Narasi: report.narration || "",
  }));

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
          heading="Monitoring"
          subheading={me.name}
          currentPath="/admin/monitoring"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DashboardBreadcrumbs
                items={[
                  { label: "Admin", href: "/admin/beranda" },
                  { label: "Monitoring" },
                ]}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                Admin Monitoring
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                Monitoring Sekolah Terhubung Checklist
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {me.name} • Pantau performa checklist siswa lintas kelas.
              </p>
            </div>
          </header>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <form className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Kelas
                <select
                  name="classroom"
                  defaultValue={selectedClassroom}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Semua Kelas</option>
                  {classroomOptions.map((classroom) => (
                    <option key={classroom} value={classroom}>
                      {classroom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Tanggal
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Terapkan Filter
                </button>
                <Link
                  href={buildHref({ date: selectedDate })}
                  className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Reset Kelas
                </Link>
                <ExportCSVButton
                  data={exportData}
                  filename="laporan_harian"
                  label="Export Laporan"
                />
                <PDFExportButton
                  title="Laporan Monitoring Admin"
                  subtitle={`${selectedDate} | ${selectedClassroom || "Semua Kelas"}`}
                  filename={`monitoring-admin-${selectedDate}.pdf`}
                  headers={["ID", "Tanggal", "Nama", "Kelas", "XP", "Misi"]}
                  data={scopedReports.map((row) => {
                    const selectedIds = asArray(
                      row.answers?.selectedMissionIds,
                    );
                    const missionNames = selectedIds
                      .map((id) => missionTitleMap.get(id))
                      .filter(Boolean)
                      .join(", ");
                    return [
                      String(row.id),
                      row.reportDate,
                      userById.get(row.userId)?.name || "Unknown",
                      userById.get(row.userId)?.classroom || "Tanpa kelas",
                      String(row.xpGained),
                      missionNames || "-",
                    ];
                  })}
                  buttonLabel="Export PDF"
                />
              </div>
            </form>
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
                Total Kelas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {classroomOptions.length}
              </p>
            </article>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Daftar Siswa
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="pb-2 font-semibold">Nama Siswa</th>
                    <th className="pb-2 font-semibold">Kelas</th>
                    <th className="pb-2 font-semibold">Aktivitas Ramadan</th>
                    <th className="pb-2 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(offset, offset + pageSize).map((student) => {
                    const report = reportByUserId.get(student.id);
                    const missionsToday = asArray(
                      report?.answers?.selectedMissionIds,
                    )
                      .map((id) => missionTitleMap.get(id))
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <tr
                        key={student.id}
                        className="border-t border-slate-200 dark:border-slate-700"
                      >
                        <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {student.name}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">
                          {student.classroom || "Tanpa Kelas"}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {missionsToday || (
                            <span className="text-slate-400 italic font-normal text-xs">
                              Belum ada aktivitas hari ini
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={buildHref({
                                classroom: selectedClassroom,
                                date: selectedDate,
                                studentId: student.id,
                                page: String(currentPage),
                              })}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Preview Detail"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={baseUrlForPagination}
                />
              </div>
            </div>
          </section>

          {selectedStudent && (
            <section className="mt-5">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Detail Aktivitas: {selectedStudent.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedStudent.classroom || "Tanpa Kelas"} • Total{" "}
                      {selectedStudent.totalXp} XP • Streak{" "}
                      {selectedStudent.currentStreak} hari
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={buildHref({
                        classroom: selectedClassroom,
                        date: selectedDate,
                      })}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Tutup
                    </Link>
                    <PDFExportButton
                      title={`Laporan Detail: ${selectedStudent.name}`}
                      subtitle={`${selectedStudent.classroom || "Tanpa Kelas"} | s/d ${selectedDate}`}
                      filename={`laporan-detail-${selectedStudent.name.toLowerCase().replace(/\s+/g, "-")}.pdf`}
                      headers={["Tanggal", "Misi", "XP", "Narasi/Refleksi"]}
                      data={timelineDays.map((day) => {
                        const report = selectedStudentReportByDate.get(day);
                        const selectedIds = asArray(
                          report?.answers?.selectedMissionIds,
                        );
                        const missionNames = selectedIds
                          .map((id) => missionTitleMap.get(id))
                          .filter(Boolean)
                          .join(", ");
                        return [
                          day,
                          missionNames || "-",
                          String(report?.xpGained || 0),
                          report?.narration || "-",
                        ];
                      })}
                      buttonLabel="Export PDF"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {timelineDays.map((day) => {
                    const report = selectedStudentReportByDate.get(day);
                    return (
                      <div
                        key={day}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {day}
                          </p>
                          {report && (
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                              +{report.xpGained} XP
                            </span>
                          )}
                        </div>
                        {report ? (
                          <div className="mt-1">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {
                                asArray(report.answers?.selectedMissionIds)
                                  .length
                              }{" "}
                              misi diselesaikan
                            </p>
                            {report.narration && (
                              <p className="mt-1 line-clamp-2 text-[10px] text-slate-600 dark:text-slate-300 italic">
                                &quot;{report.narration}&quot;
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] italic text-slate-400 dark:text-slate-500">
                            Tidak ada laporan
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Laporan Terbaru
            </h2>
            <div className="mt-3 space-y-2">
              {recentReports.length > 0 ? (
                <>
                  {recentReports.map((row) => (
                    <Link
                      key={row.id}
                      href={buildHref({
                        classroom: selectedClassroom,
                        date: selectedDate,
                        studentId: row.userId,
                        page: String(currentPage),
                      })}
                      className={`block rounded-xl border transition ${
                        selectedStudentId === row.userId
                          ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                      } px-3 py-2`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {row.studentName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {row.classroom} • {row.reportDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                            +{row.xpGained} XP
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {asArray(row.answers?.selectedMissionIds).length}{" "}
                            misi
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    baseUrl={baseUrlForPagination}
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum ada laporan terbaru untuk kriteria ini.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
