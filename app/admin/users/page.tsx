import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { and, asc, eq, ilike, or, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UserManagementContent } from "./user-management-content";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    role?: string;
    classroom?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const resolvedParams = searchParams ? await searchParams : {};
  const query = resolvedParams.q || "";
  const page = Number(resolvedParams.page) || 1;
  const roleFilter = resolvedParams.role || "";
  const classroomFilter = resolvedParams.classroom || "";
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (query) {
    conditions.push(
      or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)),
    );
  }
  if (roleFilter) {
    conditions.push(eq(users.role, roleFilter as any));
  }
  if (classroomFilter) {
    conditions.push(eq(users.classroom, classroomFilter));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [allUsers, totalCountRes] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        classroom: users.classroom,
        major: users.major,
        gender: users.gender,
        isLocked: users.isLocked,
        role: users.role as any,
      })
      .from(users)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(asc(users.name)),
    db.select({ count: count() }).from(users).where(whereClause),
  ]);

  const totalCount = totalCountRes[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/admin/beranda"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Manajemen User
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Kelola data akun siswa dan guru dalam sistem.
              </p>
            </div>
          </div>
        </header>

        <UserManagementContent
          initialUsers={allUsers}
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
}
