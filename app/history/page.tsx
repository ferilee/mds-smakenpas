import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryCalendar } from "@/components/history-calendar";
import { auth } from "@/lib/auth";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-5 sm:py-6">
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>
      <HistoryCalendar />
    </main>
  );
}
