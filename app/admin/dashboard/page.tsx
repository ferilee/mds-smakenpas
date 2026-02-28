import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  redirect("/admin/beranda");
}
