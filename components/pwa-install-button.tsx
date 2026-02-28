"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "pwa_install_prompt_seen_v1";

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        window.localStorage.setItem(STORAGE_KEY, "1");
        setOpen(true);
      }
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setOpen(false);
      setDeferredPrompt(null);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M12 2a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V3a1 1 0 0 1 1-1Z" />
          <path d="M5 14a1 1 0 0 1 1 1v3h12v-3a1 1 0 1 1 2 0v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
        </svg>
        Install
      </button>

      {open ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
              Instal Aplikasi
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              Pasang Majelis Digital
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Instal agar akses lebih cepat, tampilan seperti aplikasi, dan bisa
              disematkan di layar utama.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
