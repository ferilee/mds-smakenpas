"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const gender = formData.get("gender") as string;
  const classroom = formData.get("classroom") as string;
  const major = formData.get("major") as string;

  if (!name || !gender || !classroom || !major) {
    throw new Error("Semua field wajib diisi.");
  }

  console.log(
    `[Profiling] Updating user ${session.user.id}: ${name}, ${classroom}, ${major}`,
  );

  await db
    .update(users)
    .set({
      name,
      gender,
      classroom,
      major,
      isProfileComplete: true,
      isLocked: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard");
  revalidatePath("/profiling");
  redirect("/dashboard");
}
