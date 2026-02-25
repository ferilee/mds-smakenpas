"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  name: string;
  classroom: string | null;
  totalXp: number;
  currentStreak: number;
};

type Me = {
  id: string;
};

type TabMode = "weekly" | "all_time";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] || "?";
  const second = words[1]?.[0] || "";
  return `${first}${second}`.toUpperCase();
}

function rankBadgeColor(rank: number) {
  if (rank === 1) return "from-amber-200 to-amber-400";
  if (rank === 2) return "from-slate-200 to-slate-400";
  if (rank === 3) return "from-orange-200 to-orange-400";
  return "from-brand-200 to-brand-400 dark:from-brand-500 dark:to-brand-700";
}

export function LeaderboardTable() {
  const [mode, setMode] = useState<TabMode>("weekly");
  const [data, setData] = useState<Entry[]>([]);
  const [meId, setMeId] = useState("");

  useEffect(() => {
    const load = async () => {
      const scope = mode === "weekly" ? "classroom" : "school";
      const [rankRes, meRes] = await Promise.all([
        fetch(`/api/leaderboard?scope=${scope}`, { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
      ]);

      if (rankRes.ok) {
        const payload = await rankRes.json();
        setData(payload.ranking || []);
      }
      if (meRes.ok) {
        const payload = await meRes.json();
        const user = payload.user as Me | undefined;
        setMeId(user?.id || "");
      }
    };

    void load();
  }, [mode]);

  const top3 = useMemo(() => {
    if (!data.length) return [] as Entry[];
    const first = data[0];
    const second = data[1];
    const third = data[2];
    return [second, first, third].filter(Boolean) as Entry[];
  }, [data]);

  const myRank = useMemo(() => {
    if (!meId) return -1;
    return data.findIndex((item) => item.id === meId) + 1;
  }, [data, meId]);

  const betterThanPercent = useMemo(() => {
    if (myRank <= 0 || !data.length) return 0;
    return Math.max(
      0,
      Math.round(((data.length - myRank) / data.length) * 100),
    );
  }, [data.length, myRank]);

  const rest = data.slice(3);

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-brand-200 bg-white shadow-[0_18px_42px_rgba(53,91,33,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_20px_48px_rgba(2,8,23,0.55)]">
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pb-5 pt-5 text-white dark:from-brand-800 dark:to-brand-900 sm:px-5">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Leaderboard
        </h2>

        <div className="mt-4 rounded-2xl bg-white/20 p-1.5 dark:bg-slate-950/30">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode("weekly")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mode === "weekly"
                  ? "bg-white text-brand-800"
                  : "text-brand-100 hover:text-white"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setMode("all_time")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                mode === "all_time"
                  ? "bg-white text-brand-800"
                  : "text-brand-100 hover:text-white"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        <article className="mt-4 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-brand-900 dark:border-brand-700 dark:bg-brand-900/50 dark:text-brand-100">
          <p className="text-2xl font-black">#{myRank > 0 ? myRank : "-"}</p>
          <p className="-mt-0.5 text-lg font-semibold">
            You are doing better than
          </p>
          <p className="text-2xl font-black">
            {betterThanPercent}% of other players!
          </p>
        </article>

        <div className="mt-5">
          <div className="grid grid-cols-3 items-end gap-2">
            {top3.map((item, index) => {
              const rank = index === 1 ? 1 : index === 0 ? 2 : 3;
              const podiumHeight = rank === 1 ? "h-36" : "h-28";
              return (
                <div key={item.id} className="text-center">
                  <div
                    className={`mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br ${rankBadgeColor(rank)} text-lg font-bold text-slate-800 shadow-lg shadow-black/15 dark:text-slate-100`}
                  >
                    {initials(item.name)}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[18px] font-semibold leading-tight">
                    {item.name}
                  </p>
                  <p className="text-xs text-brand-100 dark:text-brand-200">
                    {item.totalXp.toLocaleString()} XP
                  </p>
                  <div
                    className={`mt-2 ${podiumHeight} rounded-t-2xl bg-brand-400 px-2 pt-4 text-6xl font-black text-white/90 dark:bg-brand-600`}
                  >
                    {rank}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-t-[28px] bg-slate-50 px-4 pb-6 pt-4 text-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:px-5">
        <div className="space-y-3">
          {rest.map((row, idx) => {
            const rank = idx + 4;
            return (
              <article
                key={row.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-200">
                    {rank}
                  </div>
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${rankBadgeColor(rank)} text-sm font-bold text-slate-800 dark:text-slate-100`}
                  >
                    {initials(row.name)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100">
                      {row.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {row.totalXp.toLocaleString()} XP
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          {!rest.length ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              Belum ada peserta lain di papan peringkat.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
