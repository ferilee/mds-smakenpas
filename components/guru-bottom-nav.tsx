"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";

type GuruNavItem = {
  label: string;
  href:
    | "/guru/beranda"
    | "/guru/monitoring"
    | "/guru/analytics"
    | "/dashboard?preview=siswa"
    | "/leaderboard";
  key: "home" | "monitoring" | "analytics" | "siswa_preview" | "leaderboard";
};

const items: GuruNavItem[] = [
  { key: "home", label: "Home", href: "/guru/beranda" },
  { key: "monitoring", label: "Monitoring", href: "/guru/monitoring" },
  { key: "analytics", label: "Analitik", href: "/guru/analytics" },
  {
    key: "siswa_preview",
    label: "Dashboard",
    href: "/dashboard?preview=siswa",
  },
  { key: "leaderboard", label: "Peringkat", href: "/leaderboard" },
];

function Icon({ itemKey }: { itemKey: GuruNavItem["key"] }) {
  const cls = "h-6 w-6";
  if (itemKey === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
        <path d="M12 2 4 9h2v10h5v-6h2v6h5V9h2L12 2Z" />
      </svg>
    );
  }
  if (itemKey === "monitoring") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={cls}
      >
        <path strokeWidth="2" strokeLinecap="round" d="M4 19h16" />
        <path strokeWidth="2" strokeLinecap="round" d="M7 16V9m5 7V5m5 11v-8" />
      </svg>
    );
  }
  if (itemKey === "analytics") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={cls}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
      </svg>
    );
  }
  if (itemKey === "siswa_preview") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={cls}
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" strokeWidth="2" />
        <circle cx="9" cy="12" r="1.6" fill="currentColor" />
        <path strokeWidth="2" strokeLinecap="round" d="M13 12h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={cls}>
      <path
        strokeWidth="2"
        strokeLinejoin="round"
        d="M4 19h16M7 19V9h3v10m4 0V5h3v14"
      />
    </svg>
  );
}

export function GuruBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview");
  const activeKey: GuruNavItem["key"] =
    pathname === "/guru/monitoring"
      ? "monitoring"
      : pathname === "/guru/analytics"
        ? "analytics"
        : pathname === "/dashboard" && preview === "siswa"
          ? "siswa_preview"
          : pathname === "/leaderboard"
            ? "leaderboard"
            : "home";

  return (
    <nav className="fixed inset-x-0 bottom-3 z-[95] px-4 sm:hidden">
      <div className="mx-auto max-w-xl rounded-3xl border border-brand-500/30 bg-slate-950/90 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const active = activeKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href as Route}
                className={`relative flex h-16 flex-col items-center justify-center rounded-2xl transition ${
                  active
                    ? "bg-brand-500/15 text-brand-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                aria-label={item.label}
                title={item.label}
              >
                {active ? (
                  <span className="absolute left-3 right-3 top-0 h-1 rounded-full bg-brand-400" />
                ) : null}
                <Icon itemKey={item.key} />
                <span className="mt-1 text-[11px] font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
