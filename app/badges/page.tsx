import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { BadgeShowcase } from "@/components/badge-showcase";
import { buildBadges } from "@/lib/badges";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyReports, users } from "@/db/schema";

export default async function BadgesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  const reports = await db
    .select({
      answers: dailyReports.answers,
      narration: dailyReports.narration,
      bonusXp: dailyReports.bonusXp,
    })
    .from(dailyReports)
    .where(and(eq(dailyReports.userId, user.id)));

  const fastingDays = reports.filter((r) => Boolean(r.answers?.fasting)).length;
  const narratedDays = reports.filter((r) =>
    Boolean(r.narration?.trim()),
  ).length;
  const perfectDays = reports.filter((r) => (r.bonusXp || 0) > 0).length;
  const highSunnahDays = reports.filter(
    (r) => (r.answers?.sunnahBoost || 0) >= 50,
  ).length;

  const uniqueMissionIds = new Set<number>();
  for (const report of reports) {
    for (const missionId of report.answers?.selectedMissionIds || []) {
      uniqueMissionIds.add(missionId);
    }
  }

  const schoolRanking = await db
    .select({
      id: users.id,
      totalXp: users.totalXp,
    })
    .from(users)
    .orderBy(desc(users.totalXp));

  const schoolRank =
    schoolRanking.findIndex((entry) => entry.id === user.id) + 1;
  const totalUsers = schoolRanking.length;

  const classRanking = user.classroom
    ? await db
        .select({
          id: users.id,
          totalXp: users.totalXp,
        })
        .from(users)
        .where(eq(users.classroom, user.classroom))
        .orderBy(desc(users.totalXp))
    : [];

  const classRank = classRanking.findIndex((entry) => entry.id === user.id) + 1;
  const classSize = classRanking.length;

  const badges = buildBadges({
    totalXp: user.totalXp,
    currentStreak: user.currentStreak,
    totalReports: reports.length,
    fastingDays,
    narratedDays,
    uniqueMissionCount: uniqueMissionIds.size,
    perfectDays,
    highSunnahDays,
    schoolRank,
    totalUsers,
    classRank,
    classSize,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto mb-4 w-full max-w-md">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
      <BadgeShowcase userName={user.name} badges={badges} />
    </main>
  );
}
