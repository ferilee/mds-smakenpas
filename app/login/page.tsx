import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { auth } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const isAccessDenied = params.error === "AccessDenied";
  const isNoEmail = params.error === "NoEmail";
  const isConfiguration = params.error === "Configuration";
  const rawError = params.error;

  const errorMessage = isAccessDenied
    ? "Akses ditolak. Periksa konfigurasi Google OAuth lalu coba lagi."
    : isNoEmail
      ? "Google tidak mengirim email akun. Coba akun Google lain."
      : isConfiguration
        ? "Konfigurasi OAuth belum valid. Cek AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, dan redirect URI di Google Console."
        : rawError
          ? `Login gagal dengan kode: ${rawError}`
          : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(119,180,77,0.24),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(68,118,38,0.2),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(158,204,117,0.2),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(53,91,33,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(53,91,33,0.1)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_34%,transparent_86%)] dark:[background-image:linear-gradient(rgba(68,118,38,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(68,118,38,0.12)_1px,transparent_1px)]" />

      <section className="relative w-full max-w-md animate-[islamicFadeIn_700ms_ease-out] rounded-3xl border border-brand-200/60 bg-white/85 p-7 shadow-[0_20px_70px_-35px_rgba(26,63,32,0.65)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75 dark:shadow-[0_22px_75px_-35px_rgba(2,8,23,0.9)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/35 via-white/10 to-transparent dark:from-brand-900/25 dark:via-transparent dark:to-transparent" />
        <div className="mb-4 flex items-center justify-between text-brand-900 dark:text-brand-100">
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            Majelis Digital
          </p>
          <span className="h-2 w-2 animate-[pulseGlow_2.8s_ease-in-out_infinite] rounded-full bg-brand-500" />
        </div>

        <p className="relative text-center text-3xl text-brand-700 [font-family:ui-serif,Georgia,'Times_New_Roman',serif] dark:text-brand-300">
          السلام عليكم ورحمة الله
        </p>

        <h1 className="relative mt-3 text-center text-3xl font-bold text-slate-900 dark:text-white">
          SMKN Pasirian
        </h1>

        <p className="relative mt-9 text-center text-sm leading-6 text-slate-700 dark:text-slate-200">
          Masuk dengan akun Google untuk memulai checklist ibadah harian,
          menjaga istiqomah, dan menaikkan XP kebaikan.
        </p>

        {errorMessage ? (
          <p className="relative mt-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-800">
            {errorMessage}
          </p>
        ) : null}

        <div className="relative mt-6">
          <GoogleSignInButton />
        </div>

        <div className="relative mt-5 flex items-center justify-center gap-2 text-[11px] text-brand-700/95 dark:text-brand-200">
          <span className="h-px w-8 bg-brand-300/80 dark:bg-brand-700/80" />
          <span>Ikhtiar Hari Ini, Berkah Esok Hari</span>
          <span className="h-px w-8 bg-brand-300/80 dark:bg-brand-700/80" />
        </div>
      </section>
    </main>
  );
}
