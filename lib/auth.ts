import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getRoleFromEmail } from "./roles";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const authSecret = process.env.AUTH_SECRET;

async function upsertUser(input: {
  email: string;
  name: string | null | undefined;
  image: string | null | undefined;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!existing) {
    const initialRole = getRoleFromEmail(email);
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      name: input.name || email,
      image: input.image || null,
      role: initialRole,
    });
    return;
  }

  const staticRole = getRoleFromEmail(email);
  const updateData: any = {
    name: input.name || existing.name,
    image: input.image || existing.image,
  };

  // Promote to admin/guru if currently a student and in the static list
  if (existing.role === "siswa" && staticRole !== "siswa") {
    updateData.role = staticRole;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, existing.id));
}

function pickProfileImage(input: {
  user?: { image?: string | null } | null;
  profile?: Record<string, unknown> | null;
  token?: Record<string, unknown> | null;
}) {
  const profilePicture =
    typeof input.profile?.picture === "string" ? input.profile.picture : null;
  const profileImage =
    typeof input.profile?.image === "string" ? input.profile.image : null;
  const tokenPicture =
    typeof input.token?.picture === "string" ? input.token.picture : null;
  const tokenImage =
    typeof input.token?.image === "string" ? input.token.image : null;

  return (
    input.user?.image ??
    profilePicture ??
    profileImage ??
    tokenPicture ??
    tokenImage ??
    null
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code, ...message) {
      console.error("[auth][error]", code, ...message);
    },
    warn(code, ...message) {
      console.warn("[auth][warn]", code, ...message);
    },
  },
  providers: [
    Google({
      clientId: googleClientId ?? "",
      clientSecret: googleClientSecret ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.toLowerCase().trim();
      if (email) {
        await upsertUser({
          email,
          name: user.name,
          image: pickProfileImage({
            user,
            profile: profile as Record<string, unknown>,
          }),
        });
      }
      return true;
    },
    async jwt({ token, user, profile }) {
      const profileEmail =
        typeof profile?.email === "string" ? profile.email : null;
      const email = (user?.email ?? profileEmail ?? token.email)
        ?.toLowerCase()
        .trim();
      const image = pickProfileImage({
        user,
        profile: (profile as Record<string, unknown>) || null,
        token: token as Record<string, unknown>,
      });
      const name =
        user?.name ?? (typeof profile?.name === "string" ? profile.name : null);

      if (email) {
        try {
          await upsertUser({ email, name, image });
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, email),
          });
          token.uid = dbUser?.id;
          token.role = dbUser?.role;
        } catch (error) {
          console.error("Auth sync user failed:", error);
        }
      }

      if (email) token.email = email;
      if (name) token.name = name;
      if (image) {
        token.picture = image;
        token.image = image;
      }
      return token;
    },
    async session({ session, token }) {
      const tokenPicture =
        typeof token.picture === "string" ? token.picture : null;
      const tokenImage = typeof token.image === "string" ? token.image : null;
      if (session.user) {
        session.user.id = (token.uid as string) || "";
        session.user.role = (token.role as string) || "siswa";
        session.user.email = typeof token.email === "string" ? token.email : "";
        session.user.name = typeof token.name === "string" ? token.name : "";
        session.user.image = tokenPicture ?? tokenImage;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
