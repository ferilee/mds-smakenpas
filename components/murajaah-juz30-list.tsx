"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

type Surah = {
  number: number;
  name: string;
  ayat: number;
};

type SurahVerse = {
  number: { inSurah: number };
  text: { arab: string };
  translation?: { id?: string };
};

type SurahDetail = {
  number: number;
  name: {
    transliteration: { id: string };
  };
  numberOfVerses: number;
  verses: SurahVerse[];
};

function xpFromAyatCount(ayat: number) {
  if (ayat < 5) return 1;
  if (ayat < 10) return 2;
  if (ayat < 20) return 4;
  if (ayat < 30) return 6;
  return 10;
}

const juz30Surahs: Surah[] = [
  { number: 78, name: "An-Naba", ayat: 40 },
  { number: 79, name: "An-Nazi'at", ayat: 46 },
  { number: 80, name: "Abasa", ayat: 42 },
  { number: 81, name: "At-Takwir", ayat: 29 },
  { number: 82, name: "Al-Infitar", ayat: 19 },
  { number: 83, name: "Al-Mutaffifin", ayat: 36 },
  { number: 84, name: "Al-Insyiqaq", ayat: 25 },
  { number: 85, name: "Al-Buruj", ayat: 22 },
  { number: 86, name: "At-Tariq", ayat: 17 },
  { number: 87, name: "Al-A'la", ayat: 19 },
  { number: 88, name: "Al-Gasyiyah", ayat: 26 },
  { number: 89, name: "Al-Fajr", ayat: 30 },
  { number: 90, name: "Al-Balad", ayat: 20 },
  { number: 91, name: "Asy-Syams", ayat: 15 },
  { number: 92, name: "Al-Lail", ayat: 21 },
  { number: 93, name: "Ad-Duha", ayat: 11 },
  { number: 94, name: "Asy-Syarh", ayat: 8 },
  { number: 95, name: "At-Tin", ayat: 8 },
  { number: 96, name: "Al-'Alaq", ayat: 19 },
  { number: 97, name: "Al-Qadr", ayat: 5 },
  { number: 98, name: "Al-Bayyinah", ayat: 8 },
  { number: 99, name: "Az-Zalzalah", ayat: 8 },
  { number: 100, name: "Al-'Adiyat", ayat: 11 },
  { number: 101, name: "Al-Qari'ah", ayat: 11 },
  { number: 102, name: "At-Takasur", ayat: 8 },
  { number: 103, name: "Al-'Asr", ayat: 3 },
  { number: 104, name: "Al-Humazah", ayat: 9 },
  { number: 105, name: "Al-Fil", ayat: 5 },
  { number: 106, name: "Quraisy", ayat: 4 },
  { number: 107, name: "Al-Ma'un", ayat: 7 },
  { number: 108, name: "Al-Kausar", ayat: 3 },
  { number: 109, name: "Al-Kafirun", ayat: 6 },
  { number: 110, name: "An-Nasr", ayat: 3 },
  { number: 111, name: "Al-Lahab", ayat: 5 },
  { number: 112, name: "Al-Ikhlas", ayat: 4 },
  { number: 113, name: "Al-Falaq", ayat: 5 },
  { number: 114, name: "An-Nas", ayat: 6 },
];

export function MurajaahJuz30List() {
  const orderedSurahs = useMemo(
    () => [...juz30Surahs].sort((a, b) => b.number - a.number),
    [],
  );
  const [checked, setChecked] = useState<number[]>([]);
  const [hafalTimestamps, setHafalTimestamps] = useState<
    Record<number, string>
  >({});
  const [activeSurah, setActiveSurah] = useState<Surah | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [savingHafal, setSavingHafal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [rewardXp, setRewardXp] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [rewardSurahName, setRewardSurahName] = useState("");
  const [hideMemorized, setHideMemorized] = useState(true);
  const [checkedReady, setCheckedReady] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState(34);
  const done = checked.length;
  const total = orderedSurahs.length;
  const percent = useMemo(
    () => Math.round((done / total) * 100),
    [done, total],
  );
  const visibleSurahs = useMemo(
    () =>
      hideMemorized
        ? orderedSurahs.filter((surah) => !checked.includes(surah.number))
        : orderedSurahs,
    [checked, hideMemorized, orderedSurahs],
  );
  const STORAGE_KEY = "murajaah_juz30_hafal";
  const STORAGE_TS_KEY = "murajaah_juz30_hafal_timestamps";

  const formatHafalTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as number[];
        if (Array.isArray(parsed)) {
          setChecked(parsed.filter((v) => Number.isInteger(v)));
        }
      } catch {
        // ignore invalid local data
      }
    }
    const savedTs = window.localStorage.getItem(STORAGE_TS_KEY);
    if (savedTs) {
      try {
        const parsed = JSON.parse(savedTs) as Record<string, string>;
        const normalized: Record<number, string> = {};
        Object.entries(parsed || {}).forEach(([k, v]) => {
          const num = Number(k);
          if (Number.isInteger(num) && typeof v === "string") {
            normalized[num] = v;
          }
        });
        setHafalTimestamps(normalized);
      } catch {
        // ignore invalid local data
      }
    }
    setCheckedReady(true);
  }, []);

  useEffect(() => {
    if (!checkedReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked, checkedReady]);

  useEffect(() => {
    if (!checkedReady) return;
    window.localStorage.setItem(
      STORAGE_TS_KEY,
      JSON.stringify(hafalTimestamps),
    );
  }, [checkedReady, hafalTimestamps]);

  useEffect(() => {
    if (!activeSurah) {
      setSheetOpen(false);
      setSurahDetail(null);
      setDetailError("");
      return;
    }

    const t = window.setTimeout(() => setSheetOpen(true), 10);
    setLoadingDetail(true);
    setDetailError("");

    const loadSurah = async () => {
      try {
        const res = await fetch(
          `https://api.quran.gading.dev/surah/${activeSurah.number}`,
          { cache: "no-store" },
        );
        const payload = await res.json();
        if (!res.ok || !payload?.data) {
          throw new Error("Gagal memuat ayat surat.");
        }
        setSurahDetail(payload.data as SurahDetail);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : "Gagal memuat ayat surat.",
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    void loadSurah();
    return () => window.clearTimeout(t);
  }, [activeSurah]);

  const toggle = (number: number) => {
    setChecked((prev) =>
      prev.includes(number)
        ? prev.filter((n) => n !== number)
        : [...prev, number],
    );
  };

  const closeSheet = () => {
    setSheetOpen(false);
    window.setTimeout(() => setActiveSurah(null), 220);
  };

  const markProgress = async () => {
    if (!activeSurah) return;
    setSavingHafal(true);
    setStatusMessage("");
    const ayatXp = xpFromAyatCount(activeSurah.ayat);

    if (!checked.includes(activeSurah.number)) {
      const clickedAt = new Date().toISOString();
      setChecked((prev) => {
        if (prev.includes(activeSurah.number)) return prev;
        const next = [...prev, activeSurah.number];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setHafalTimestamps((prev) => {
        const next = { ...prev, [activeSurah.number]: clickedAt };
        window.localStorage.setItem(STORAGE_TS_KEY, JSON.stringify(next));
        return next;
      });
    }

    try {
      const todayRes = await fetch("/api/reports/today", { cache: "no-store" });
      const todayPayload = todayRes.ok ? await todayRes.json() : null;
      const report = todayPayload?.report;
      const prevSelected = Array.isArray(report?.answers?.selectedMissionIds)
        ? (report.answers.selectedMissionIds as number[])
        : [];
      const prevMurajaahBonus = Number(report?.answers?.murajaahXpBonus || 0);
      const nextMurajaahBonus = prevMurajaahBonus + ayatXp;

      const res = await fetch("/api/reports/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedMissionIds: prevSelected,
          fasting: Boolean(report?.answers?.fasting),
          narration: report?.narration || "",
          sunnahBoost: Number(report?.answers?.sunnahBoost || 0),
          prayerReports: report?.answers?.prayerReports || {},
          checklistTimestamps: report?.answers?.checklistTimestamps || {},
          prayerReportTimestamps: report?.answers?.prayerReportTimestamps || {},
          murajaahXpBonus: nextMurajaahBonus,
          tadarusReport: report?.answers?.tadarusReport,
          kultumReport: report?.answers?.kultumReport,
          idulfitriReport: report?.answers?.idulfitriReport,
          zakatFitrah: report?.answers?.zakatFitrah,
          silaturahimReport: report?.answers?.silaturahimReport,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mencatat progress XP.");
      }
      setStatusMessage("Hafalan dicatat dan progress XP diperbarui.");
      setRewardXp(ayatXp);
      setRewardSurahName(activeSurah.name);
      setShowReward(true);
      window.setTimeout(() => {
        setShowReward(false);
        closeSheet();
      }, 2400);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Gagal mencatat progress XP.",
      );
    } finally {
      setSavingHafal(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <Script
        src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
        strategy="afterInteractive"
      />
      <div className="mb-3 flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-700 dark:text-slate-200">
          Progress hafalan: {done}/{total} surat
        </p>
        <p className="font-semibold text-brand-700 dark:text-brand-300">
          {percent}%
        </p>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setHideMemorized((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {hideMemorized ? "Tampilkan Surat Hafal" : "Sembunyikan Surat Hafal"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {visibleSurahs.map((surah) => (
          <article
            key={surah.number}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  QS. {surah.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No. {surah.number} • {surah.ayat} ayat
                </p>
              </div>
              <button
                type="button"
                disabled={checked.includes(surah.number)}
                onClick={() => {
                  setStatusMessage("");
                  setActiveSurah(surah);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                  checked.includes(surah.number)
                    ? "cursor-not-allowed bg-slate-400 dark:bg-slate-600"
                    : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                Buka Surat
              </button>
            </div>
            {checked.includes(surah.number) ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Status: Hafal
                </p>
                {hafalTimestamps[surah.number] ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Waktu hafal:{" "}
                    {formatHafalTime(hafalTimestamps[surah.number])}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {!visibleSurahs.length ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
          Semua surat pada daftar ini sudah berstatus hafal.
        </p>
      ) : null}

      {activeSurah ? (
        <div className="fixed inset-0 z-[130] flex items-end bg-slate-950/45 p-0 sm:p-4">
          <div
            className={`w-full rounded-t-3xl border border-brand-300/45 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-brand-50 shadow-2xl ring-1 ring-brand-200/25 transition-transform duration-300 sm:mx-auto sm:max-w-2xl sm:rounded-3xl dark:border-brand-800/50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 ${
              sheetOpen ? "translate-y-0" : "translate-y-12"
            }`}
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 sm:hidden" />
            <h3 className="text-xl font-bold text-brand-50">
              QS. {activeSurah.name}
            </h3>
            <p className="mt-1 text-sm text-brand-100/95">
              {surahDetail
                ? `${surahDetail.numberOfVerses} ayat`
                : `No. ${activeSurah.number}`}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setArabicFontSize((prev) => Math.max(24, prev - 2))
                }
                className="rounded-lg border border-brand-100/45 bg-brand-950/15 px-3 py-1.5 text-xs font-semibold text-brand-50 hover:bg-brand-950/25 dark:border-brand-700/45 dark:bg-brand-950/30"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() =>
                  setArabicFontSize((prev) => Math.min(56, prev + 2))
                }
                className="rounded-lg border border-brand-100/45 bg-brand-950/15 px-3 py-1.5 text-xs font-semibold text-brand-50 hover:bg-brand-950/25 dark:border-brand-700/45 dark:bg-brand-950/30"
              >
                A+
              </button>
            </div>

            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-brand-100/35 bg-brand-950/20 p-3 dark:border-brand-800/40 dark:bg-slate-900/55">
              {loadingDetail ? (
                <p className="text-sm text-brand-100">Memuat ayat...</p>
              ) : detailError ? (
                <p className="text-sm text-rose-200">{detailError}</p>
              ) : (
                <div className="space-y-4">
                  {(surahDetail?.verses || []).map((verse) => (
                    <article
                      key={verse.number.inSurah}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <p
                        className="quran-ayat-lpmq text-right leading-loose text-slate-900 dark:text-slate-100"
                        style={{ fontSize: `${arabicFontSize}px` }}
                      >
                        {verse.text.arab}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                        Ayat {verse.number.inSurah}
                      </p>
                      {verse.translation?.id ? (
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-100/95">
                          {verse.translation.id}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {statusMessage ? (
              <p className="mt-3 text-sm text-brand-100">{statusMessage}</p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-xl border border-brand-100/45 bg-brand-950/15 px-4 py-3 text-sm font-semibold text-brand-50 hover:bg-brand-950/25 dark:border-brand-700/45 dark:bg-brand-950/30"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={markProgress}
                disabled={savingHafal}
                className="rounded-xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:opacity-60 dark:border-brand-600 dark:bg-brand-600 dark:text-white dark:hover:bg-brand-700"
              >
                {savingHafal ? "Menyimpan..." : "Hafal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showReward ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <lottie-player
              autoplay
              mode="normal"
              src="https://assets10.lottiefiles.com/packages/lf20_touohxv0.json"
              style={{ width: "100%", height: "120px" }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Alhamdulillah, saya hafal surat {rewardSurahName}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              +{rewardXp} XP
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {rewardXp > 0
                ? "Progress hafalan berhasil dicatat."
                : "XP sudah tercatat sebelumnya."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
