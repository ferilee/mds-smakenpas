type Props = {
  totalXp: number;
  level: number;
  streak: number;
};

export function ProgressCards({ totalXp, level, streak }: Props) {
  return (
    <section className="grid grid-cols-3 gap-2 md:gap-4">
      <article className="rounded-2xl bg-white p-3 shadow-sm md:p-5 dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 md:text-sm">Total XP</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 md:mt-2 md:text-3xl">
          {totalXp}
        </h2>
      </article>
      <article className="rounded-2xl bg-white p-3 shadow-sm md:p-5 dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 md:text-sm">Sholeh Level</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 md:mt-2 md:text-3xl">
          Lv. {level}
        </h2>
      </article>
      <article className="rounded-2xl bg-white p-3 shadow-sm md:p-5 dark:bg-slate-900/60 dark:ring-1 dark:ring-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 md:text-sm">Streak Puasa</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 md:mt-2 md:text-3xl">
          {streak} hari
        </h2>
      </article>
    </section>
  );
}
