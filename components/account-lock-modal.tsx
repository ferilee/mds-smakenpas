"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { Lock, MessageCircle } from "lucide-react";

export function AccountLockModal() {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 text-center animate-in zoom-in-95 duration-300">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Lock className="h-10 w-10" />
                </div>

                <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Akun Anda Terkunci
                </h2>

                <p className="mb-8 text-slate-600 dark:text-slate-400 leading-relaxed">
                    Maaf, akses ke dashboard Majelis Digital telah dibatasi karena akun Anda belum berlangganan atau masa aktif telah habis.
                </p>

                <div className="mb-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50 text-left">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <MessageCircle className="h-4 w-4 text-brand-500" />
                        Cara Membuka Akses:
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Silakan hubungi Guru Pengampu mata pelajaran <strong>Pendidikan Agama dan Budi Pekerti (PABP)</strong> untuk aktivasi akun atau informasi lebih lanjut.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <SignOutButton className="w-full rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-rose-700 shadow-lg shadow-rose-500/20" />
                </div>
            </div>
        </div>
    );
}
