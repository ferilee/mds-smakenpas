import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

type SidebarItem = {
  label: string;
  href: string;
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

type DashboardSidebarProps = {
  panelLabel: string;
  heading: string;
  subheading?: string;
  currentPath: string;
  groups: SidebarGroup[];
};

export function DashboardSidebar({
  panelLabel,
  heading,
  subheading,
  currentPath,
  groups,
}: DashboardSidebarProps) {
  const mobileItems = groups.flatMap((group) => group.items).slice(0, 4);
  return (
    <>
      <aside className="mb-4 hidden w-full lg:sticky lg:top-4 lg:mb-0 lg:block lg:w-72 lg:flex-shrink-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
            {panelLabel}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {heading}
          </h2>
          {subheading ? (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {subheading}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {groups.map((group) => (
              <section key={group.title}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {group.title}
                </p>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const baseHref = item.href.split("#")[0] || item.href;
                    const isActive =
                      baseHref === currentPath ||
                      (baseHref !== "/" && currentPath.startsWith(baseHref));
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {item.label}
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-2 px-3 py-2">
          {mobileItems.map((item) => {
            const baseHref = item.href.split("#")[0] || item.href;
            const isActive =
              baseHref === currentPath ||
              (baseHref !== "/" && currentPath.startsWith(baseHref));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex-1 rounded-xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
