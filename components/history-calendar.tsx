"use client";

import { useEffect, useMemo, useState } from "react";

type Report = {
  id: number;
  reportDate: string;
  xpGained: number;
  narration: string | null;
  answers: {
    fasting: boolean;
  };
};

export function HistoryCalendar() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/reports/history?month=${month}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setReports(data.reports || []);
    };
    void load();
  }, [month]);

  const reportMap = useMemo(() => {
    const map = new Map<string, Report>();
    for (const report of reports) map.set(report.reportDate, report);
    return map;
  }, [reports]);

  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Kalender Ibadah Bulanan
        </h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none ring-brand-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-auto"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`;
          const r = reportMap.get(day);
          return (
            <article
              key={day}
              className={`rounded-lg border p-2 sm:p-3 ${
                r
                  ? "border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/30"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
              }`}
            >
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {i + 1}
              </p>
              {r ? (
                <>
                  <p className="mt-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                    +{r.xpGained} XP
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {r.answers?.fasting ? "Puasa: Ya" : "Puasa: Tidak"}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Belum isi
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
