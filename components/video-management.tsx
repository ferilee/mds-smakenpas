"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Video as VideoIcon,
  ExternalLink,
  Loader2,
  Check,
  X,
  Eye,
  History,
} from "lucide-react";

type Video = {
  id: number;
  title: string;
  youtubeUrl: string;
  videoId: string;
  ustadz: string | null;
  active: boolean;
  publishedAt: string;
};

export function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    youtubeUrl: "",
    ustadz: "",
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const parseJsonSafe = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: "Respons server tidak valid." };
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      // Reusing student's endpoint for listing if suitable,
      // but for management we might want a specific one later.
      // For now, let's fetch all.
      const res = await fetch("/api/teacher-videos");
      const data = await res.json();
      if (res.ok) {
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to fetch videos", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/kultum/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(data.message || "Gagal menambahkan video.");
      } else {
        setVideos([data.video, ...videos]);
        setIsAdding(false);
        setForm({ title: "", youtubeUrl: "", ustadz: "" });
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (video: Video) => {
    try {
      const res = await fetch(`/api/kultum/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !video.active }),
      });
      if (res.ok) {
        setVideos(
          videos.map((v) =>
            v.id === video.id ? { ...v, active: !v.active } : v,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to toggle video status", err);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!confirm("Hapus video ini secara permanen?")) return;

    try {
      const res = await fetch(`/api/kultum/videos/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVideos(videos.filter((v) => v.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete video", err);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <VideoIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Manajemen Video Kultum
          </h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
            isAdding
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              : "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20"
          }`}
        >
          {isAdding ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {isAdding ? "Batal" : "Tambah Video"}
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/30 dark:bg-brand-900/10 animate-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={handleAddVideo}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                Judul Video
              </label>
              <input
                required
                type="text"
                placeholder="Misal: Keutamaan Sedekah"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                URL YouTube
              </label>
              <input
                required
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={form.youtubeUrl}
                onChange={(e) =>
                  setForm({ ...form, youtubeUrl: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                Ustadz / Pembicara
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Ustadz"
                  value={form.ustadz}
                  onChange={(e) => setForm({ ...form, ustadz: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </div>
          </form>
          {error && (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <X className="h-3 w-3" /> {error}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-bold">Thumbnail & Judul</th>
              <th className="px-4 py-3 font-bold">Pembicara</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    <p className="text-xs text-slate-500">Memuat video...</p>
                  </div>
                </td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-slate-500 italic"
                >
                  Belum ada video yang ditambahkan.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr
                  key={video.id}
                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img
                          src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <VideoIcon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-[300px]"
                          title={video.title}
                        >
                          {video.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                            ID: {video.videoId}
                          </span>
                          <a
                            href={video.youtubeUrl}
                            target="_blank"
                            className="text-[10px] text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
                          >
                            Lihat <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {video.ustadz || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(video)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        video.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-500/20"
                      }`}
                    >
                      {video.active ? (
                        <>
                          <Check className="h-3 w-3" /> Aktif
                        </>
                      ) : (
                        <>
                          <History className="h-3 w-3" /> Nonaktif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 transition-all"
                      title="Hapus Video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && videos.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <p>Total {videos.length} video tersedia</p>
          <p className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> Klik status untuk
            mengaktifkan/nonaktifkan
          </p>
        </div>
      )}
    </section>
  );
}
