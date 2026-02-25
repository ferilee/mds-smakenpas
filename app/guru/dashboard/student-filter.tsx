"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
    currentSearch: string;
    currentClassroom: string;
    classroomOptions: string[];
    currentMajor: string;
    currentDate: string;
};

export function StudentFilter({
    currentSearch,
    currentClassroom,
    classroomOptions,
    currentMajor,
    currentDate,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleFilterChange = (formData: FormData) => {
        const params = new URLSearchParams(window.location.search);
        const q = formData.get("q") as string;
        const classroom = formData.get("classroom") as string;

        if (q) params.set("q", q);
        else params.delete("q");

        if (classroom) params.set("classroom", classroom);
        else params.delete("classroom");

        params.set("studentPage", "1");

        startTransition(() => {
            router.push(`/guru/dashboard?${params.toString()}`);
        });
    };

    return (
        <form
            action={handleFilterChange}
            className="flex flex-wrap items-center gap-2"
        >
            <div className="relative">
                <input
                    type="text"
                    name="q"
                    defaultValue={currentSearch}
                    placeholder="Cari nama..."
                    className="h-8 w-40 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <svg
                    className="absolute left-2.5 top-2 h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>

            <select
                name="classroom"
                defaultValue={currentClassroom}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 py-0 text-xs text-slate-700 focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
                <option value="">Semua Kelas</option>
                {classroomOptions.map((cls) => (
                    <option key={cls} value={cls}>
                        {cls}
                    </option>
                ))}
            </select>

            <button type="submit" className="hidden">Filter</button>

            {/* Maintain other global filters */}
            <input type="hidden" name="major" value={currentMajor} />
            <input type="hidden" name="date" value={currentDate} />

            {isPending && (
                <span className="text-[10px] text-slate-400 animate-pulse">Memperbarui...</span>
            )}
        </form>
    );
}
