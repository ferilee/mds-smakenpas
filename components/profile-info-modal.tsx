"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/user-avatar";

type Props = {
  name: string;
  email: string;
  classroom: string | null;
  image: string | null;
  totalXp: number;
  level: number;
  streak: number;
};

export function ProfileInfoModal({
  name,
  email,
  classroom,
  image,
  totalXp,
  level,
  streak,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
      >
        Profil
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={name}
                image={image}
                className="h-12 w-12"
                textClassName="text-sm"
              />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="grid grid-cols-[110px_10px_1fr] gap-y-1">
                <span className="font-semibold">Kelas</span>
                <span>:</span>
                <span>{classroom || "Belum diatur"}</span>

                <span className="font-semibold">Total XP</span>
                <span>:</span>
                <span>{totalXp}</span>

                <span className="font-semibold">Sholeh Level</span>
                <span>:</span>
                <span>Lv. {level}</span>

                <span className="font-semibold">Streak Puasa</span>
                <span>:</span>
                <span>{streak} hari</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
