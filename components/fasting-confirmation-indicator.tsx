"use client";

import { useEffect, useState } from "react";

const FASTING_CONFIRMATION_KEY = "fasting_confirmation_latest";
const FASTING_CONFIRMATION_UPDATED_EVENT = "fasting-confirmation-updated";

type FastingStatus = "fasting" | "not_fasting" | null;

function localDateKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FastingConfirmationIndicator() {
  const [status, setStatus] = useState<FastingStatus>(null);

  useEffect(() => {
    const readStatusFromStorage = () => {
      const raw = window.localStorage.getItem(FASTING_CONFIRMATION_KEY);
      if (!raw) {
        setStatus(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as {
          date: string;
          status: "fasting" | "not_fasting";
        };
        const localToday = localDateKey();
        const utcToday = utcDateKey();
        if (parsed.date !== localToday && parsed.date !== utcToday) {
          setStatus(null);
          return;
        }
        setStatus(parsed.status);
      } catch {
        setStatus(null);
      }
    };

    const syncFromApi = async () => {
      try {
        const res = await fetch("/api/reports/today", { cache: "no-store" });
        if (!res.ok) {
          readStatusFromStorage();
          return;
        }
        const data = (await res.json()) as {
          reportDate?: string;
          report?: { answers?: { fasting?: boolean } };
        };
        const fasting = data?.report?.answers?.fasting;
        const reportDate =
          typeof data?.reportDate === "string" && data.reportDate
            ? data.reportDate
            : utcDateKey();
        if (typeof fasting === "boolean") {
          const nextStatus: FastingStatus = fasting ? "fasting" : "not_fasting";
          setStatus(nextStatus);
          window.localStorage.setItem(
            FASTING_CONFIRMATION_KEY,
            JSON.stringify({ date: reportDate, status: nextStatus }),
          );
          return;
        }
        readStatusFromStorage();
      } catch {
        readStatusFromStorage();
      }
    };

    const onStorage = () => readStatusFromStorage();
    const onUpdated = () => syncFromApi();

    void syncFromApi();
    window.addEventListener("storage", onStorage);
    window.addEventListener(FASTING_CONFIRMATION_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FASTING_CONFIRMATION_UPDATED_EVENT, onUpdated);
    };
  }, []);

  if (!status) return null;

  return (
    <span className="relative inline-flex items-center">
      <span
        className={`group inline-flex h-3 w-3 rounded-full ring-2 ring-white/65 dark:ring-slate-900/55 ${
          status === "fasting" ? "bg-blue-500" : "bg-red-500"
        }`}
        tabIndex={0}
        title={
          status === "fasting"
            ? "Konfirmasi hari ini: Berpuasa"
            : "Konfirmasi hari ini: Tidak berpuasa"
        }
        aria-label={
          status === "fasting"
            ? "Konfirmasi hari ini berpuasa"
            : "Konfirmasi hari ini tidak berpuasa"
        }
      >
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-lg bg-slate-900/95 px-2.5 py-2 text-[11px] text-white opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-800/95">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Biru: Sudah konfirmasi berpuasa
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Merah: Sudah konfirmasi tidak berpuasa
          </span>
        </span>
      </span>
    </span>
  );
}
