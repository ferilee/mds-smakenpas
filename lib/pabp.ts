export const pabpEmails = [
  "sriastuti79@guru.smk.belajar.id",
  "emsikhugunawan32@guru.smk.belajar.id",
  "nurzaini42@guru.smk.belajar.id",
  "anggasari75@guru.smk.belajar.id",
  "muhammadfauzun15@guru.smk.belajar.id",
  "siti211676@guru.sma.belajar.id",
] as const;

const pabpEmailSet = new Set(pabpEmails.map((email) => email.toLowerCase()));

export function isPabpEmail(email: string | null | undefined) {
  if (!email) return false;
  return pabpEmailSet.has(email.trim().toLowerCase());
}

export function inferNameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "";
  const withoutDigits = localPart.replace(/\d+/g, " ").replace(/\.+/g, " ");
  return withoutDigits
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
