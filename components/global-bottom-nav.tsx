"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = {
  label: "UTAMA" | "SUNNAH" | "LITERASI" | "AKHLAK" | "LEADERBOARD";
  href:
    | "/dashboard?category=pilar"
    | "/dashboard?category=sunnah"
    | "/dashboard?category=literasi"
    | "/dashboard?category=akhlak"
    | "/leaderboard";
};

const navItems: NavItem[] = [
  { label: "UTAMA", href: "/dashboard?category=pilar" },
  { label: "SUNNAH", href: "/dashboard?category=sunnah" },
  { label: "LITERASI", href: "/dashboard?category=literasi" },
  { label: "AKHLAK", href: "/dashboard?category=akhlak" },
  { label: "LEADERBOARD", href: "/leaderboard" },
];

function BottomNavIcon({ label }: { label: NavItem["label"] }) {
  const cls = "h-6 w-6";
  switch (label) {
    case "UTAMA":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 2 5 8v2h14V8l-7-6Z" />
          <path d="M6 11h12v10H6z" />
          <rect x="10" y="14" width="4" height="7" rx="1" fill="currentColor" />
        </svg>
      );
    case "SUNNAH":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 12a8 8 0 1 1-8-8 6.5 6.5 0 0 0 0 13 8 8 0 0 0 8-5Z M15.5 5.5l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7.7-1.4Z"
          />
        </svg>
      );
    case "LITERASI":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M6 3h9l3 3v15H6z" />
          <rect
            x="9"
            y="10"
            width="6"
            height="1.8"
            rx=".9"
            fill="currentColor"
          />
          <rect
            x="9"
            y="14"
            width="6"
            height="1.8"
            rx=".9"
            fill="currentColor"
          />
        </svg>
      );
    case "AKHLAK":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinecap="round"
            d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"
          />
          <circle cx="9.5" cy="8" r="3" strokeWidth="2.4" />
          <path strokeWidth="2.4" strokeLinecap="round" d="M15 8h6m-3-3v6" />
        </svg>
      );
    case "LEADERBOARD":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={cls}
        >
          <path
            strokeWidth="2.4"
            strokeLinejoin="round"
            d="M4 19h16M7 19V9h3v10m4 0V5h3v14"
          />
        </svg>
      );
  }
}

export function GlobalBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardCategory = searchParams.get("category") ?? "pilar";

  const activeLabel: NavItem["label"] =
    pathname === "/leaderboard"
      ? "LEADERBOARD"
      : pathname === "/dashboard"
        ? dashboardCategory === "sunnah"
          ? "SUNNAH"
          : dashboardCategory === "literasi"
            ? "LITERASI"
            : dashboardCategory === "akhlak"
              ? "AKHLAK"
              : "UTAMA"
        : "UTAMA";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-brand-300/70 bg-gradient-to-b from-brand-800 to-brand-900 px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.42)] backdrop-blur dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 sm:hidden">
      <div className="mb-2 flex justify-center">
        <span className="h-1 w-12 rounded-full bg-brand-200/50 dark:bg-slate-500/60" />
      </div>
      <div className="mx-auto grid w-full max-w-lg grid-cols-5 gap-1.5">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={`flex h-[62px] flex-col items-center justify-center gap-1 rounded-xl px-1 ${
              activeLabel === item.label
                ? "border border-brand-200/80 bg-white/15 text-white dark:border-brand-500/50 dark:bg-brand-900/40 dark:text-brand-200"
                : "text-brand-100/85 hover:text-white dark:text-slate-300 dark:hover:text-slate-100"
            }`}
          >
            <BottomNavIcon label={item.label} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
