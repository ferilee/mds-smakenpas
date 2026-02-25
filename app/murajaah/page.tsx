import Link from "next/link";
import { redirect } from "next/navigation";
import { MurajaahJuz30List } from "@/components/murajaah-juz30-list";
import { auth } from "@/lib/auth";

export default async function MurajaahPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-6">
      <div className="mb-4">
        <Link
          href="/dashboard?category=pilar"
          className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
        >
          ← Kembali ke Utama
        </Link>
      </div>

      <section className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          Pilar Utama
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Murajaah Hafalan Surat Pendek
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Daftar surat-surat pendek Juz 30 untuk membantu murajaah hafalan
          harian.
        </p>
      </section>

      <MurajaahJuz30List />
    </main>
  );
}
