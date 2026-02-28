import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth";
export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const role = session.user.role;
    if (role === "admin") redirect("/admin/beranda" as Route);
    if (role === "guru") redirect("/guru/beranda" as Route);
    redirect("/dashboard");
  }
  redirect("/login");
}
