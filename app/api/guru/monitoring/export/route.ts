import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyReports, missions, users } from "@/db/schema";
import {
  STUDENT_REPORT_EXPORT_HEADERS,
  buildStudentReportExportRow,
  csvEscape,
  type ReportRowForExport,
} from "@/lib/report-export";

export const dynamic = "force-dynamic";

type ExportMode = "daily" | "all";

function csvResponse(args: { filename: string; csv: string }) {
  const bom = "\uFEFF"; // Excel-friendly UTF-8 BOM
  return new NextResponse(`${bom}${args.csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${args.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseMode(value: string | null): ExportMode | null {
  if (value === "daily" || value === "all") return value;
  return null;
}

function parseDate(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "guru" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const mode = parseMode(url.searchParams.get("mode"));
    if (!mode) {
      return NextResponse.json(
        { error: "Query param `mode` must be `daily` or `all`." },
        { status: 400 },
      );
    }

    const date = parseDate(url.searchParams.get("date"));
    if (mode === "daily" && !date) {
      return NextResponse.json(
        { error: "Query param `date` (YYYY-MM-DD) is required for mode=daily." },
        { status: 400 },
      );
    }

    const classroom = (url.searchParams.get("classroom") || "").trim();
    const major = (url.searchParams.get("major") || "").trim();
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const [activeMissions, allStudents] = await Promise.all([
      db
        .select({
          id: missions.id,
          code: missions.code,
          title: missions.title,
        })
        .from(missions)
        .where(eq(missions.active, true))
        .orderBy(asc(missions.category), asc(missions.id)),
      db
        .select({
          id: users.id,
          name: users.name,
          classroom: users.classroom,
          major: users.major,
          role: users.role,
        })
        .from(users)
        .orderBy(asc(users.classroom), asc(users.name)),
    ]);

    const students = allStudents.filter((row) => {
      const roleMatch = row.role === "siswa" || row.role === "user";
      const classMatch = !classroom || (row.classroom || "") === classroom;
      const majorMatch = !major || (row.major || "") === major;
      const nameMatch = !q || row.name.toLowerCase().includes(q);
      return roleMatch && classMatch && majorMatch && nameMatch;
    });

    const studentIds = students.map((s) => s.id);
    const userMetaById = new Map(
      students.map((s) => [
        s.id,
        {
          name: s.name,
          classroom: s.classroom || "Tanpa kelas",
          major: s.major || "Tanpa jurusan",
        },
      ]),
    );

    const missionTitleMap = new Map(activeMissions.map((m) => [m.id, m.title]));
    const missionIdByCode = new Map(activeMissions.map((m) => [m.code, m.id]));

    const headers = [
      "Nama",
      "Kelas",
      "Jurusan",
      ...STUDENT_REPORT_EXPORT_HEADERS,
    ];

    if (!studentIds.length) {
      const csv = [headers].map((line) => line.map(csvEscape).join(",")).join("\n");
      return csvResponse({
        filename:
          mode === "daily"
            ? `guru-monitoring-lengkap-harian-${date}.csv`
            : "guru-monitoring-lengkap-semua-hari.csv",
        csv,
      });
    }

    if (mode === "daily") {
      const reports = (await db
        .select({
          id: dailyReports.id,
          userId: dailyReports.userId,
          reportDate: dailyReports.reportDate,
          xpGained: dailyReports.xpGained,
          narration: dailyReports.narration,
          createdAt: dailyReports.createdAt,
          updatedAt: dailyReports.updatedAt,
          answers: dailyReports.answers,
        })
        .from(dailyReports)
        .where(
          and(
            eq(dailyReports.reportDate, date!),
            inArray(dailyReports.userId, studentIds),
          ),
        )) as ReportRowForExport[];

      const reportByUserId = new Map(reports.map((r) => [r.userId, r]));

      const rows = students.map((student) => {
        const meta = userMetaById.get(student.id)!;
        const report = reportByUserId.get(student.id);
        return [
          meta.name,
          meta.classroom,
          meta.major,
          ...buildStudentReportExportRow({
            day: date!,
            report,
            missionTitleMap,
            missionIdByCode,
          }),
        ];
      });

      const csv = [headers, ...rows]
        .map((line) => line.map(csvEscape).join(","))
        .join("\n");

      return csvResponse({
        filename: `guru-monitoring-lengkap-harian-${date}.csv`,
        csv,
      });
    }

    const reports = (await db
      .select({
        id: dailyReports.id,
        userId: dailyReports.userId,
        reportDate: dailyReports.reportDate,
        xpGained: dailyReports.xpGained,
        narration: dailyReports.narration,
        createdAt: dailyReports.createdAt,
        updatedAt: dailyReports.updatedAt,
        answers: dailyReports.answers,
      })
      .from(dailyReports)
      .where(inArray(dailyReports.userId, studentIds))
      .orderBy(desc(dailyReports.reportDate), asc(dailyReports.userId))) as ReportRowForExport[];

    const rows = reports
      .map((report) => {
        const meta = userMetaById.get(report.userId);
        if (!meta) return null;
        return [
          meta.name,
          meta.classroom,
          meta.major,
          ...buildStudentReportExportRow({
            day: report.reportDate,
            report,
            missionTitleMap,
            missionIdByCode,
          }),
        ];
      })
      .filter((row): row is string[] => Boolean(row));

    const csv = [headers, ...rows]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const suffixParts = [
      classroom ? `kelas-${classroom}` : "",
      major ? `jurusan-${major}` : "",
      q ? "q" : "",
    ].filter(Boolean);
    const suffix = suffixParts.length ? `-${suffixParts.join("-")}` : "";
    return csvResponse({
      filename: `guru-monitoring-lengkap-semua-hari${suffix}.csv`,
      csv,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
