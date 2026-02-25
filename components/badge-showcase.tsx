"use client";

import { useMemo, useState } from "react";
import type { BadgeCategory, BadgeView } from "@/lib/badges";

type Props = {
  userName: string;
  badges: BadgeView[];
};

export function BadgeShowcase({ userName, badges }: Props) {
  const [tab, setTab] = useState<BadgeCategory>("Achievement");

  const filtered = useMemo(
    () => badges.filter((badge) => badge.category === tab),
    [badges, tab],
  );
  const completed = badges.filter((badge) => badge.unlocked).length;

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-brand-200 bg-white shadow-[0_18px_42px_rgba(53,91,33,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_20px_48px_rgba(2,8,23,0.55)]">
      <header className="bg-gradient-to-b from-brand-600 to-brand-700 px-5 pb-5 pt-6 text-white dark:from-brand-800 dark:to-brand-900">
        <p className="text-sm text-brand-100">My Honor</p>
        <h1 className="text-4xl font-extrabold leading-tight">{userName}</h1>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs text-brand-100 dark:bg-slate-950/30 dark:text-brand-200">
          Award {completed}/{badges.length}
        </p>

        <div className="mt-4 rounded-2xl bg-white/20 p-1.5 dark:bg-slate-950/30">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setTab("Achievement")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === "Achievement"
                  ? "bg-white text-brand-800"
                  : "text-brand-100 hover:text-white"
              }`}
            >
              Achievement
            </button>
            <button
              type="button"
              onClick={() => setTab("Award")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === "Award"
                  ? "bg-white text-brand-800"
                  : "text-brand-100 hover:text-white"
              }`}
            >
              Award
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 dark:bg-slate-900">
        {filtered.map((badge) => {
          return (
            <article
              key={badge.id}
              className={`rounded-xl border p-3 transition ${
                badge.unlocked
                  ? "border-brand-300 bg-white dark:border-brand-700 dark:bg-brand-900/30"
                  : "border-slate-200 bg-slate-100 opacity-80 dark:border-slate-700 dark:bg-slate-800/70"
              }`}
            >
              <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {badge.title}
              </p>
              <div
                className={`mt-3 grid h-16 w-16 place-items-center rounded-full text-lg font-black ${
                  badge.unlocked
                    ? "bg-gradient-to-br from-brand-300 to-brand-600 text-white dark:from-brand-500 dark:to-brand-700"
                    : "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700 dark:from-slate-700 dark:to-slate-800 dark:text-slate-300"
                }`}
              >
                {badge.unlocked ? badge.icon : "LOCK"}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                {badge.subtitle}
              </p>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full ${badge.unlocked ? "bg-brand-500 dark:bg-brand-400" : "bg-amber-400 dark:bg-amber-300"}`}
                  style={{ width: `${badge.progress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {Math.min(badge.current, badge.target)}/{badge.target}
                </span>
                <span>{badge.progress}%</span>
              </div>

              <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-300">
                {badge.unlocked ? "Active" : "Nonaktif"}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
