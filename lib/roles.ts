import { isPabpEmail } from "./pabp";

export type AppRole = "siswa" | "guru" | "admin";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseEmailList(raw: string | undefined) {
  return new Set(
    (raw || "")
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

const adminEmails = parseEmailList(
  process.env.ADMIN_EMAILS || "the.real.ferilee@gmail.com",
);
const guruEmailDomain = (process.env.GURU_EMAIL_DOMAIN || "guru.smk.belajar.id")
  .trim()
  .toLowerCase()
  .replace(/^@/, "");

export function isGuruDomainEmail(email: string | null | undefined) {
  if (!email) return false;
  return normalizeEmail(email).endsWith(`@${guruEmailDomain}`);
}

export function getRoleFromEmail(email: string | null | undefined): AppRole {
  if (!email) return "siswa";
  const normalized = normalizeEmail(email);
  if (adminEmails.has(normalized)) return "admin";
  if (isPabpEmail(normalized)) return "guru";
  if (isGuruDomainEmail(normalized)) return "guru";
  return "siswa";
}
