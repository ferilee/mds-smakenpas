import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateProfile } from "./actions";

export default async function ProfilingPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (session.user.role !== "siswa") {
        redirect("/dashboard");
    }

    if (user?.isProfileComplete) {
        redirect("/dashboard");
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lengkapi Profil</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Silakan lengkapi data diri Anda sebelum melanjutkan ke dashboard.
                    </p>
                </header>

                <form action={updateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nama Lengkap
                        </label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={user?.name || ""}
                            required
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Jenis Kelamin
                        </label>
                        <select
                            name="gender"
                            required
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Pilih Jenis Kelamin</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Kelas
                        </label>
                        <select
                            name="classroom"
                            required
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Pilih Kelas</option>
                            {[
                                "X AK A", "X AK B", "X BD A", "X BD B", "X DKV A", "X DKV B", "X DPIB", "X DTF", "X KKKR", "X PSPT", "X RPL", "X TKJ A", "X TKJ B", "X TKR A", "X TKR B",
                                "XI AK A", "XI AK B", "XI BD A", "XI BD B", "XI DKV A", "XI DKV B", "XI DPIB", "XI DTF", "XI KKKR", "XI PSPT", "XI RPL", "XI TKJ A", "XI TKJ B", "XI TKR A", "XI TKR B",
                                "XII AK A", "XII AK B", "XII BD A", "XII BD B", "XII DKV A", "XII DKV B", "XII DPIB", "XII DTF", "XII KKKR", "XII PSPT", "XII RPL", "XII TKJ A", "XII TKJ B", "XII TKR A", "XII TKR B", "XII TKR C"
                            ].map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Jurusan
                        </label>
                        <select
                            name="major"
                            required
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Pilih Jurusan</option>
                            <option value="DPIB">DPIB</option>
                            <option value="DTF">DTF</option>
                            <option value="TKR">TKR</option>
                            <option value="RPL">RPL</option>
                            <option value="TKJ">TKJ</option>
                            <option value="BD">BD</option>
                            <option value="AK">AK</option>
                            <option value="DKV">DKV</option>
                            <option value="KKKR">KKKR</option>
                            <option value="PSPT">PSPT</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700 shadow-lg shadow-brand-500/20"
                    >
                        Simpan Profil
                    </button>
                </form>
            </div>
        </main>
    );
}
