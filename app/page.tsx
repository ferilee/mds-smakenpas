import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth";
import { getRoleFromEmail } from "@/lib/roles";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const role = getRoleFromEmail(session.user.email);
    if (role === "admin") redirect("/admin/dashboard" as Route);
    if (role === "guru") redirect("/guru/dashboard" as Route);
    redirect("/dashboard");
  }
  redirect("/login");
}
