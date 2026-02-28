import { redirect } from "next/navigation";
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { VideoManagement } from "@/components/video-management";
import { auth } from "@/lib/auth";

export default async function GuruKultumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "guru" && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const sidebarGroups = [
    {
      title: "Ringkasan",
      items: [
        { label: "Beranda", href: "/guru/beranda" },
        { label: "Monitoring", href: "/guru/monitoring" },
        { label: "Analitik", href: "/guru/analytics" },
      ],
    },
    {
      title: "Manajemen",
      items: [{ label: "Kultum", href: "/guru/kultum" }],
    },
    {
      title: "Akses",
      items: [
        { label: "Peringkat", href: "/leaderboard" },
        ...(session.user.role === "admin"
          ? [{ label: "Admin Dashboard", href: "/admin/beranda" }]
          : []),
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-24 sm:px-5 sm:py-6 sm:pb-6">
      <div className="lg:flex lg:items-start lg:gap-6">
        <DashboardSidebar
          panelLabel="Guru Dashboard"
          heading="Manajemen Kultum"
          subheading={session.user.name || ""}
          currentPath="/guru/kultum"
          groups={sidebarGroups}
        />
        <div className="min-w-0 flex-1">
          <header className="mb-5">
            <DashboardBreadcrumbs
              items={[
                { label: "Guru", href: "/guru/beranda" },
                { label: "Kultum" },
              ]}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
              Guru Kultum
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Manajemen Video Kultum
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Tambah, aktifkan, dan review video kultum untuk siswa.
            </p>
          </header>

          <VideoManagement />
        </div>
      </div>
    </main>
  );
}
