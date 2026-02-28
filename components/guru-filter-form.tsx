import Link from "next/link";
import type { Route } from "next";

type GuruFilterFormProps = {
  selectedClassroom: string;
  selectedMajor: string;
  selectedDate: string;
  classroomOptions: string[];
  majorOptions: string[];
  actionHref?: Route;
};

export function GuruFilterForm({
  selectedClassroom,
  selectedMajor,
  selectedDate,
  classroomOptions,
  majorOptions,
  actionHref,
}: GuruFilterFormProps) {
  return (
    <form className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-slate-600 dark:text-slate-300">
        Kelas
        <select
          name="classroom"
          defaultValue={selectedClassroom}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Semua Kelas</option>
          {classroomOptions.map((classroom) => (
            <option key={classroom} value={classroom}>
              {classroom}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600 dark:text-slate-300">
        Jurusan
        <select
          name="major"
          defaultValue={selectedMajor}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Semua Jurusan</option>
          {majorOptions.map((major) => (
            <option key={major} value={major}>
              {major}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600 dark:text-slate-300">
        Tanggal
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <div className="flex items-end gap-2 sm:col-span-3">
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Terapkan Filter
        </button>
        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}
