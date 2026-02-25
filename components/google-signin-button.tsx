"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton() {
  async function handleSignIn() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-800/20 transition hover:scale-[1.01] hover:from-brand-800 hover:to-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-brand-700 transition group-hover:bg-brand-50">
        G
      </span>
      Masuk dengan Google
    </button>
  );
}
