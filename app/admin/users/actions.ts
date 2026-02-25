"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getRoleFromEmail } from "@/lib/roles";

async function ensureAdmin() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    // Trust session role which is synced from DB in lib/auth.ts
    if (session.user.role !== "admin") throw new Error("Forbidden");
    return session;
}

export async function createUser(data: {
    email: string;
    name: string;
    classroom?: string;
    major?: string;
    gender?: "L" | "P";
    role?: "siswa" | "guru" | "admin";
}) {
    await ensureAdmin();

    const email = data.email.toLowerCase().trim();
    const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existing) {
        throw new Error("Email sudah terdaftar.");
    }

    await db.insert(users).values({
        id: crypto.randomUUID(),
        email,
        name: data.name,
        classroom: data.classroom || null,
        major: data.major || null,
        gender: data.gender || null,
        role: data.role || "siswa",
        isProfileComplete: !!(data.classroom && data.major && data.gender),
    });

    revalidatePath("/admin/users");
}

export async function updateUser(
    id: string,
    data: {
        name: string;
        classroom?: string;
        major?: string;
        gender?: "L" | "P";
        role?: "siswa" | "guru" | "admin";
    }
) {
    await ensureAdmin();

    await db
        .update(users)
        .set({
            name: data.name,
            classroom: data.classroom || null,
            major: data.major || null,
            gender: data.gender || null,
            role: data.role,
            updatedAt: new Date(),
        })
        .where(eq(users.id, id));

    revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
    const session = await ensureAdmin();

    if (id === session.user?.id) {
        throw new Error("Anda tidak bisa menghapus diri sendiri.");
    }

    await db.delete(users).where(eq(users.id, id));

    revalidatePath("/admin/users");
}

export async function toggleUserLock(id: string, lock: boolean) {
    const session = await ensureAdmin();

    if (id === session.user?.id) {
        throw new Error("Anda tidak bisa mengunci diri sendiri.");
    }

    await db
        .update(users)
        .set({
            isLocked: lock,
            updatedAt: new Date(),
        })
        .where(eq(users.id, id));

    revalidatePath("/admin/users");
}
