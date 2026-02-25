"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser, deleteUser, toggleUserLock } from "./actions";
import { Pagination } from "@/components/pagination";
import { Search, UserPlus, Pencil, Trash2, X, Lock, Unlock } from "lucide-react";

type User = {
    id: string;
    email: string;
    name: string;
    classroom: string | null;
    major: string | null;
    gender: string | null;
    isLocked: boolean;
    role: "siswa" | "guru" | "admin";
};

type Props = {
    initialUsers: User[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
};

const CLASS_OPTIONS = [
    "X AK A", "X AK B", "X BD A", "X BD B", "X DKV A", "X DKV B", "X DPIB", "X DTF", "X KKKR", "X PSPT", "X RPL", "X TKJ A", "X TKJ B", "X TKR A", "X TKR B",
    "XI AK A", "XI AK B", "XI BD A", "XI BD B", "XI DKV A", "XI DKV B", "XI DPIB", "XI DTF", "XI KKKR", "XI PSPT", "XI RPL", "XI TKJ A", "XI TKJ B", "XI TKR A", "XI TKR B",
    "XII AK A", "XII AK B", "XII BD A", "XII BD B", "XII DKV A", "XII DKV B", "XII DPIB", "XII DTF", "XII KKKR", "XII PSPT", "XII RPL", "XII TKJ A", "XII TKJ B", "XII TKR A", "XII TKR B", "XII TKR C"
];

const MAJOR_OPTIONS = ["DPIB", "DTF", "TKR", "RPL", "TKJ", "BD", "AK", "DKV", "KKKR", "PSPT"];

export function UserManagementContent({
    initialUsers,
    currentPage,
    totalPages,
    totalCount,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        if (value) params.set(key, value);
        else params.delete(key);
        params.set("page", "1");
        router.push(`/admin/users?${params.toString()}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange("q", search);
    };

    const handleOpenCreate = () => {
        setEditingUser(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        setModalOpen(true);
    };

    const handleToggleLock = async (user: User) => {
        const action = user.isLocked ? "Buka kuncian" : "Kunci";
        if (confirm(`${action} akun ${user.name}?`)) {
            startTransition(async () => {
                try {
                    await toggleUserLock(user.id, !user.isLocked);
                } catch (err: any) {
                    alert(err.message);
                }
            });
        }
    };

    const handleDelete = async (user: User) => {
        if (confirm(`Hapus user ${user.name}?`)) {
            startTransition(async () => {
                try {
                    await deleteUser(user.id);
                } catch (err: any) {
                    alert(err.message);
                }
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            email: formData.get("email") as string,
            name: formData.get("name") as string,
            classroom: formData.get("classroom") as string,
            major: formData.get("major") as string,
            gender: formData.get("gender") as "L" | "P",
            role: formData.get("role") as "siswa" | "guru" | "admin",
        };

        startTransition(async () => {
            try {
                if (editingUser) {
                    await updateUser(editingUser.id, data);
                } else {
                    await createUser(data);
                }
                setModalOpen(false);
            } catch (err: any) {
                alert(err.message);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Nama atau email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </form>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        onChange={(e) => handleFilterChange("role", e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                        <option value="">Semua Role</option>
                        <option value="siswa">Siswa</option>
                        <option value="guru">Guru</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        onChange={(e) => handleFilterChange("classroom", e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white min-w-[140px]"
                    >
                        <option value="">Semua Kelas</option>
                        {CLASS_OPTIONS.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 shadow-lg shadow-brand-500/20"
                    >
                        <UserPlus className="h-4 w-4" />
                        Tambah User
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Nama</th>
                                <th className="px-4 py-3 font-semibold">Email</th>
                                <th className="px-4 py-3 font-semibold">Kelas</th>
                                <th className="px-4 py-3 font-semibold">Jurusan</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {initialUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.classroom || "-"}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.major || "-"}</td>
                                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{user.role}</td>
                                    <td className="px-4 py-3">
                                        {user.isLocked ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                <Lock className="h-3 w-3" />
                                                Terkunci
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                <Unlock className="h-3 w-3" />
                                                Aktif
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleToggleLock(user)}
                                            title={user.isLocked ? "Buka Kunci" : "Kunci Akun"}
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${user.isLocked
                                                ? "text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30"
                                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                                }`}
                                        >
                                            {user.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(user)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {initialUsers.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                        Tidak ada user ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            baseUrl="/admin/users"
                        />
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
                Menampilkan {initialUsers.length} dari {totalCount} user.
            </p>

            {modalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                            {editingUser ? "Edit User" : "Tambah User Baru"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    defaultValue={editingUser?.name || ""}
                                    required
                                    placeholder="Nama Lengkap"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={editingUser?.email || ""}
                                    required
                                    disabled={!!editingUser}
                                    placeholder="Email"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50 transition"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                        Kelas
                                    </label>
                                    <select
                                        name="classroom"
                                        defaultValue={editingUser?.classroom || ""}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                                    >
                                        <option value="">Pilih Kelas</option>
                                        {CLASS_OPTIONS.map((cls) => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                        Jurusan
                                    </label>
                                    <select
                                        name="major"
                                        defaultValue={editingUser?.major || ""}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                                    >
                                        <option value="">Pilih Jurusan</option>
                                        {MAJOR_OPTIONS.map((major) => (
                                            <option key={major} value={major}>{major}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                    Jenis Kelamin
                                </label>
                                <select
                                    name="gender"
                                    defaultValue={editingUser?.gender || ""}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                                >
                                    <option value="">Pilih Jenis Kelamin</option>
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 px-1">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    defaultValue={editingUser?.role || "siswa"}
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                                >
                                    <option value="siswa">Siswa</option>
                                    <option value="guru">Guru</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition"
                                >
                                    {isPending ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Tambah User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
