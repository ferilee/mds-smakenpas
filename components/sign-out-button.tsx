"use client";

import { signOut } from "next-auth/react";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function SignOutButton({ className, children }: Props) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className || "grid h-10 w-10 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"}
      aria-label="Keluar"
      title="Keluar"
    >
      {children || (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M9 12h12m0 0-3-3m3 3-3 3"
          />
        </svg>
      )}
    </button>
  );
}
