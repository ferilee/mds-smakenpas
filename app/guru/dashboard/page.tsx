import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PDFExportButton } from "@/components/pdf-export-button";
import { dailyReports, missions, users, type DailyReport } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoleFromEmail } from "@/lib/roles";
import { todayDateString } from "@/lib/xp";

type GuruDashboardPageProps = {
  searchParams?: Promise<{
    classroom?: string;
    major?: string;
    date?: string;
    studentId?: string;
    studentPage?: string;
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

function csvEscape(value: string | number) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildHref(input: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query
    ? (`/guru/dashboard?${query}` as Route)
    : ("/guru/dashboard" as Route);
}

export default async function GuruDashboardPage({
  searchParams,
}: GuruDashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = getRoleFromEmail(session.user.email);
  if (role !== "guru" && role !== "admin") redirect("/dashboard");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = todayDateString();
  const selectedDate =
    resolvedSearchParams?.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.date)
      ? resolvedSearchParams.date
      : today;
  const previousDate = shiftDate(selectedDate, -1);
  const weekStart = shiftDate(selectedDate, -6);
  const selectedClassroom = resolvedSearchParams?.classroom || "";
  const selectedMajor = resolvedSearchParams?.major || "";
  const selectedStudentFromQuery = resolvedSearchParams?.studentId || "";
  const studentPage = parsePage(resolvedSearchParams?.studentPage, 1);
  const riskPage = parsePage(resolvedSearchParams?.riskPage, 1);

  const [me, allStudents, activeMissions, reportsRange] = await Promise.all([
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
    const classMatch = !selectedClassroom || (row.classroom || "") === selectedClassroom;
    const majorMatch = !selectedMajor || (row.major || "") === selectedMajor;
    return classMatch && majorMatch;
  });
  const studentIds = new Set(students.map((row) => row.id));
  const scopedReports: ReportRow[] = reportsRange.filter((row) =>
    studentIds.has(row.userId),
  );

  const reportsToday = scopedReports.filter((row) => row.reportDate === selectedDate);
  const reportByUserId = new Map(reportsToday.map((r) => [r.userId, r]));
  const missionTitleMap = new Map(activeMissions.map((m) => [m.id, m.title]));
  const reportsPrevious = scopedReports.filter(
    (row) => row.reportDate === previousDate,
  );
  const reportsByUserToday = new Map(reportsToday.map((row) => [row.userId, row]));

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

  const missionCompletionTarget = Math.max(
    1,
    Math.ceil(Math.max(1, activeMissions.length) * 0.6),
  );
  const missionProgress = activeMissions.map((mission) => {
    const todayCount = reportsToday.filter((row) =>
      asArray(row.answers?.selectedMissionIds).includes(mission.id),
    ).length;
    const previousCount = reportsPrevious.filter((row) =>
      asArray(row.answers?.selectedMissionIds).includes(mission.id),
    ).length;
    const trend = todayCount - previousCount;
    const percent = totalStudents
      ? Math.round((todayCount / totalStudents) * 100)
      : 0;
    return {
      ...mission,
      todayCount,
      previousCount,
      trend,
      percent,
    };
  });

  const selectedStudent =
    students.find((row) => row.id === selectedStudentFromQuery) || students[0];

  const timelineDays = Array.from({ length: 7 }).map((_, idx) =>
    shiftDate(selectedDate, -(6 - idx)),
  );
  const selectedStudentReports = selectedStudent
    ? scopedReports.filter((row) => row.userId === selectedStudent.id)
    : [];
  const selectedStudentReportByDate = new Map(
    selectedStudentReports.map((row) => [row.reportDate, row]),
  );
  const selectedStudentTodayReport = selectedStudent
    ? reportsByUserToday.get(selectedStudent.id)
    : undefined;

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
      const totalAyat = Number(row.answers?.tadarusReport?.totalAyatRead || 0);
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

  const sortedMonitoringRows = siswaMonitoringRows.sort((a, b) => {
    const statusOrder = { "Belum Isi": 0, Sebagian: 1, Lengkap: 2 } as const;
    const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name, "id");
  });
  const monitoringPagination = paginate(sortedMonitoringRows, studentPage, 12);

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

  const monitoringCsv = [
    ["Nama", "Kelas", "Jurusan", "Status", "Misi Selesai", "XP Hari Ini", "Streak"],
    ...sortedMonitoringRows.map((row) => [
      row.name,
      row.classroom || "Tanpa kelas",
      row.major || "Tanpa jurusan",
      row.status,
      String(row.selectedMissionCount),
      String(row.todayXp),
      String(row.currentStreak),
    ]),
  ]
    .map((line) => line.map(csvEscape).join(","))
    .join("\n");
  const monitoringCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(monitoringCsv)}`;

  const missionCsv = [
    ["Misi", "Selesai Hari Ini", "Total Siswa", "Persentase", "Trend vs Kemarin"],
    ...missionProgress.map((row) => [
      row.title,
      String(row.todayCount),
      String(totalStudents),
      `${row.percent}%`,
      String(row.trend),
    ]),
  ]
    .map((line) => line.map(csvEscape).join(","))
    .join("\n");
  const missionCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(missionCsv)}`;

  const selectedStudentCsv = selectedStudent
    ? [
      ["Tanggal", "Misi Selesai", "XP Didapat", "Narasi/Refleksi"],
      ...timelineDays.map((day) => {
        const report = selectedStudentReportByDate.get(day);
        const missionCount = report ? asArray(report.answers?.selectedMissionIds).length : 0;
        return [
          day,
          String(missionCount),
          String(report?.xpGained || 0),
          report?.narration || "-",
        ];
      }),
    ]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n")
    : "";
  const selectedStudentCsvHref = selectedStudent
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(selectedStudentCsv)}`
    : "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-5 sm:py-6">
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
            Guru Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Monitoring Checklist Kelas
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {me.name} • Progres checklist siswa terhubung ke data laporan harian.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Link
            href="/leaderboard"
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Buka Leaderboard
          </Link>
          {role === "admin" ? (
            <Link
              href={"/admin/dashboard" as Route}
              className="inline-flex h-10 items-center rounded-xl border border-brand-300 px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
            >
              Admin Dashboard
            </Link>
          ) : null}
          <SignOutButton />
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
            Jurusan
            <select
              name="major"
              defaultValue={selectedMajor}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Semua Jurusan</option>
              {majorOptions.map((major) => (
                <option key={major} value={major}>
                  {major}
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
          <input type="hidden" name="studentId" value={selectedStudent?.id || ""} />
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
              Reset Filter
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Siswa Aktif</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalStudents}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sudah Isi Checklist</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">
            {submittedStudents}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {completionPercent}%
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rata-rata XP Harian</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {avgXpPerSubmit}
          </p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Progress Misi Checklist
          </h2>
          <a
            href={missionCsvHref}
            download={`guru-progress-misi-${selectedDate}.csv`}
            className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Export CSV
          </a>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-2">Misi</th>
                <th className="pb-2">Selesai</th>
                <th className="pb-2">Persentase</th>
                <th className="pb-2">Trend vs Kemarin</th>
              </tr>
            </thead>
            <tbody>
              {missionProgress.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2 text-slate-800 dark:text-slate-100">{row.title}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {row.todayCount}/{totalStudents}
                  </td>
                  <td className="py-2">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                      {row.percent}%
                    </span>
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-semibold ${row.trend > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : row.trend < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                      {row.trend > 0 ? `+${row.trend}` : row.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!missionProgress.length ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Belum ada misi aktif untuk dianalisis.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Daftar Siswa
            </h2>
            <div className="flex items-center gap-2">
              <a
                href={monitoringCsvHref}
                download={`guru-monitoring-siswa-${selectedDate}.csv`}
                className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                CSV
              </a>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pb-2 font-semibold">Nama Siswa</th>
                  <th className="pb-2 font-semibold">Kelas</th>
                  <th className="pb-2 font-semibold">Aktivitas Ramadan</th>
                  <th className="pb-2 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {monitoringPagination.items.map((row) => {
                  const report = reportsByUserToday.get(row.id);
                  const missionsToday = asArray(report?.answers?.selectedMissionIds)
                    .map((id) => missionTitleMap.get(id))
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{row.classroom || "Tanpa Kelas"}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                        {missionsToday || <span className="text-slate-400 italic font-normal text-xs">Belum ada</span>}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={buildHref({
                              classroom: selectedClassroom || undefined,
                              date: selectedDate,
                              studentId: row.id,
                              studentPage: String(monitoringPagination.page),
                              riskPage: String(riskPagination.page),
                            })}
                            className={`p-1.5 rounded-lg transition ${selectedStudent?.id === row.id
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              }`}
                            title="Preview"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <PDFExportButton
                            title={`Laporan Detail: ${row.name}`}
                            subtitle={`${row.classroom || "Tanpa Kelas"} | s/d ${selectedDate}`}
                            filename={`laporan-detail-${row.name.toLowerCase().replace(/\s+/g, "-")}.pdf`}
                            headers={["Tanggal", "Misi", "XP", "Narasi/Refleksi"]}
                            data={timelineDays.map((day) => {
                              const studentReports = scopedReports.filter(r => r.userId === row.id);
                              const r = studentReports.find(sr => sr.reportDate === day);
                              const selectedIds = asArray(r?.answers?.selectedMissionIds);
                              const mNames = selectedIds
                                .map((id) => missionTitleMap.get(id))
                                .filter(Boolean)
                                .join(", ");
                              return [
                                day,
                                mNames || "-",
                                String(r?.xpGained || 0),
                                r?.narration || "-",
                              ];
                            })}
                            buttonLabel=""
                            orientation="landscape"
                            margin={{ top: 20, left: 20, right: 20, bottom: 20 }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {
            monitoringPagination.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-xs">
                <Link
                  href={buildHref({
                    classroom: selectedClassroom || undefined,
                    date: selectedDate,
                    studentId: selectedStudent?.id,
                    studentPage: String(Math.max(1, monitoringPagination.page - 1)),
                    riskPage: String(riskPagination.page),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Sebelumnya
                </Link>
                <span className="text-slate-500 dark:text-slate-400">
                  Halaman {monitoringPagination.page}/{monitoringPagination.totalPages}
                </span>
                <Link
                  href={buildHref({
                    classroom: selectedClassroom || undefined,
                    date: selectedDate,
                    studentId: selectedStudent?.id,
                    studentPage: String(
                      Math.min(monitoringPagination.totalPages, monitoringPagination.page + 1),
                    ),
                    riskPage: String(riskPagination.page),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Berikutnya
                </Link>
              </div>
            ) : null
          }
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Detail Siswa Terpilih</h2>
            <div className="flex items-center gap-2">
              {selectedStudent && (
                <>
                  <a
                    href={selectedStudentCsvHref}
                    download={`laporan-${selectedStudent.name.toLowerCase().replace(/\s+/g, "-")}-${selectedDate}.csv`}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    CSV
                  </a>
                  <PDFExportButton
                    title={`Laporan Detail: ${selectedStudent.name}`}
                    subtitle={`${selectedStudent.classroom || "Tanpa Kelas"} | ${selectedStudent.major || "Tanpa Jurusan"} | s/d ${selectedDate}`}
                    filename={`laporan-detail-${selectedStudent.name.toLowerCase().replace(/\s+/g, "-")}.pdf`}
                    headers={["Tanggal", "Misi", "XP", "Narasi/Refleksi"]}
                    data={timelineDays.map((day) => {
                      const report = selectedStudentReportByDate.get(day);
                      const selectedIds = asArray(report?.answers?.selectedMissionIds);
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
                    buttonLabel="PDF"
                  />
                </>
              )}
            </div>
          </div>
          {selectedStudent ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedStudent.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedStudent.classroom || "Tanpa kelas"} • total {selectedStudent.totalXp} XP • streak {selectedStudent.currentStreak} hari
                </p>
              </div>
              <div className="space-y-1">
                {timelineDays.map((day) => {
                  const report = selectedStudentReportByDate.get(day);
                  const selectedMissionCount = report ? asArray(report.answers?.selectedMissionIds).length : 0;
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                    >
                      <span className="text-slate-600 dark:text-slate-300">{day}</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {report ? `${selectedMissionCount} misi • +${report.xpGained} XP` : "Belum isi"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                <p>
                  Shalat terlapor: {Object.keys(selectedStudentTodayReport?.answers?.prayerReports || {}).length}
                </p>
                <p>
                  Tadarus hari ini: {selectedStudentTodayReport?.answers?.tadarusReport?.totalAyatRead || 0} ayat
                </p>
                <p>
                  Kultum: {selectedStudentTodayReport?.answers?.kultumReport?.ringkasan ? "Sudah" : "Belum"}
                </p>
                <p>
                  Refleksi: {selectedStudentTodayReport?.narration?.trim() ? "Sudah" : "Belum"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Tidak ada siswa pada filter ini.</p>
          )}
        </article>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Analisis Shalat</h3>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Berjamaah: <span className="font-semibold">{shalatSummary.berjamaah}</span></p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Munfarid: <span className="font-semibold">{shalatSummary.munfarid}</span></p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Analisis Tadarus</h3>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Peserta: <span className="font-semibold">{tadarusSummary.peserta}</span></p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Total ayat: <span className="font-semibold">{tadarusSummary.ayat}</span></p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Analisis Kultum</h3>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Peserta: <span className="font-semibold">{kultumSummary.peserta}</span></p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Rata-rata panjang ringkasan: <span className="font-semibold">{kultumSummary.peserta ? Math.round(kultumSummary.totalChar / kultumSummary.peserta) : 0} karakter</span>
          </p>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Siswa Butuh Pendampingan</h2>
        <div className="mt-3 space-y-2">
          {riskPagination.items.length ? (
            riskPagination.items.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {row.classroom || "Tanpa kelas"} • status {row.status} • streak {row.currentStreak}
                  </p>
                </div>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Risk {row.riskScore}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada siswa berisiko tinggi pada filter ini.</p>
          )}
        </div>
        {riskPagination.totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between text-xs">
            <Link
              href={buildHref({
                classroom: selectedClassroom || undefined,
                date: selectedDate,
                studentId: selectedStudent?.id,
                studentPage: String(monitoringPagination.page),
                riskPage: String(Math.max(1, riskPagination.page - 1)),
              })}
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sebelumnya
            </Link>
            <span className="text-slate-500 dark:text-slate-400">Halaman {riskPagination.page}/{riskPagination.totalPages}</span>
            <Link
              href={buildHref({
                classroom: selectedClassroom || undefined,
                date: selectedDate,
                studentId: selectedStudent?.id,
                studentPage: String(monitoringPagination.page),
                riskPage: String(Math.min(riskPagination.totalPages, riskPagination.page + 1)),
              })}
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Berikutnya
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
