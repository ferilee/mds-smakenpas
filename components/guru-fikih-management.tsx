"use client";

import { useEffect, useMemo, useState } from "react";
import type { FikihTopic } from "@/lib/fikih-materials";

type ApiTopic = FikihTopic;

export function GuruFikihManagement() {
  const [materials, setMaterials] = useState<ApiTopic[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/fikih/materials", { cache: "no-store" });
        const payload = await res.json();
        const next = (payload.materials || []) as ApiTopic[];
        setMaterials(next);
        setActiveKey(next[0]?.key || "");
      } catch (error) {
        console.error(error);
        setStatus("Gagal memuat materi fikih.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const activeIndex = useMemo(
    () => materials.findIndex((item) => item.key === activeKey),
    [activeKey, materials],
  );
  const activeTopic = activeIndex >= 0 ? materials[activeIndex] : null;

  const updateTopic = (next: ApiTopic) => {
    setMaterials((prev) => prev.map((item) => (item.key === next.key ? next : item)));
  };

  const saveTopic = async () => {
    if (!activeTopic) return;
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch(`/api/fikih/materials/${activeTopic.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeTopic),
      });
      const payload = await res.json();
      if (!res.ok) {
        setStatus(payload.message || "Gagal menyimpan materi.");
        return;
      }
      setStatus("Materi berhasil disimpan.");
    } catch (error) {
      console.error(error);
      setStatus("Terjadi kesalahan saat menyimpan materi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Memuat materi fikih...
        </p>
      </section>
    );
  }

  if (!activeTopic) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Materi belum tersedia.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap gap-2">
          {materials.map((topic) => (
            <button
              key={topic.key}
              type="button"
              onClick={() => {
                setActiveKey(topic.key);
                setStatus("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                topic.key === activeTopic.key
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {topic.title}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Judul Materi
          <input
            value={activeTopic.title}
            onChange={(event) =>
              updateTopic({
                ...activeTopic,
                title: event.target.value,
              })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

        <div className="mt-4 space-y-4">
          {activeTopic.sections.map((section, sectionIndex) => (
            <article
              key={`${activeTopic.key}-${sectionIndex}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
            >
              <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Sub Materi
                <input
                  value={section.title}
                  onChange={(event) => {
                    const nextSections = activeTopic.sections.map((item, idx) =>
                      idx === sectionIndex
                        ? { ...item, title: event.target.value }
                        : item,
                    );
                    updateTopic({ ...activeTopic, sections: nextSections });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Poin (satu baris satu poin)
                <textarea
                  value={section.points.join("\n")}
                  onChange={(event) => {
                    const nextPoints = event.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean);
                    const nextSections = activeTopic.sections.map((item, idx) =>
                      idx === sectionIndex ? { ...item, points: nextPoints } : item,
                    );
                    updateTopic({ ...activeTopic, sections: nextSections });
                  }}
                  className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveTopic}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Materi"}
          </button>
          {status ? (
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
