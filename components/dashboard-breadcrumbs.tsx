import Link from "next/link";
import type { Route } from "next";

export type BreadcrumbItem = {
  label: string;
  href?: Route;
};

type DashboardBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function DashboardBreadcrumbs({ items }: DashboardBreadcrumbsProps) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span
            key={`${item.label}-${idx}`}
            className="flex items-center gap-1"
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-md px-1 py-0.5 font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-1 py-0.5 font-semibold text-slate-700 dark:text-slate-200">
                {item.label}
              </span>
            )}
            {!isLast ? <span className="text-slate-400">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
