import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function GuruDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "guru" && session.user.role !== "admin") {
    redirect("/dashboard");
  }
  redirect("/guru/beranda");
}
