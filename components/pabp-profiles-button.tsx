"use client";

import { useEffect, useState } from "react";

type PabpProfile = {
  email: string;
  name: string;
  image: string | null;
  role: string;
};

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] || "?";
  const second = words[1]?.[0] || "";
  return `${first}${second}`.toUpperCase();
}

export function PabpProfilesButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<PabpProfile[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open || profiles.length) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/pabp/profiles", { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) {
          setStatus(payload.message || "Gagal memuat profil guru PABP.");
          return;
        }
        setProfiles(payload.profiles || []);
      } catch (error) {
        console.error(error);
        setStatus("Gagal memuat profil guru PABP.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, profiles.length]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-1.5a3.5 3.5 0 0 0-3.5-3.5H7.5A3.5 3.5 0 0 0 4 19.5V21M18 8a3 3 0 1 1 0 6M14.5 4.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
          />
        </svg>
        Profil Guru PABP
      </button>

      {open ? (
        <div className="fixed inset-0 z-[165] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                  Data Guru
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Profil Guru PABP
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>

            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Memuat profil...
                </p>
              ) : status ? (
                <p className="text-sm text-rose-600 dark:text-rose-300">{status}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                  {profiles.map((profile) => (
                    <article
                      key={profile.email}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3">
                        {profile.image ? (
                          <img
                            src={profile.image}
                            alt={profile.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                            {initials(profile.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {profile.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                            {profile.email}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-300">
                            {profile.role}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
