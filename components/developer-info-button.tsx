"use client";

import { useState } from "react";

export function DeveloperInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Informasi Pengembang"
        title="Informasi Pengembang"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
          <path
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8h.01M11 12h1v4h1m-9 0h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1Z"
          />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[166] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                  Tentang
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Informasi Pengembang
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

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <img
                src="https://i.ibb.co.com/x82PbSjy/IMG-20250927-210909.png"
                alt="Avatar Feri Lee"
                className="h-14 w-14 rounded-full object-cover"
              />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Nama Pengembang
                </p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Feri Lee
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
