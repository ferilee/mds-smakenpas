import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@/lib/auth";
export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    const role = session.user.role;
    if (role === "admin") redirect("/admin/dashboard" as Route);
    if (role === "guru") redirect("/guru/dashboard" as Route);
    redirect("/dashboard");
  }
  redirect("/login");
}
