export type BadgeCategory = "Achievement" | "Award";

export type BadgeView = {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  category: BadgeCategory;
  current: number;
  target: number;
  unlocked: boolean;
  icon: string;
};

export type BadgeSourceStats = {
  totalXp: number;
  currentStreak: number;
  totalReports: number;
  fastingDays: number;
  narratedDays: number;
  uniqueMissionCount: number;
  perfectDays: number;
  highSunnahDays: number;
  schoolRank: number;
  totalUsers: number;
  classRank: number;
  classSize: number;
};

type BadgeDefinition = {
  id: string;
  title: string;
  subtitle: string;
  target: number;
  category: BadgeCategory;
  icon: string;
  value: (stats: BadgeSourceStats) => number;
};

const baseDefinitions: BadgeDefinition[] = [
  {
    id: "bintang_subuh",
    title: "Bintang Subuh",
    subtitle: "7 laporan ibadah awal",
    target: 7,
    category: "Achievement",
    icon: "SB",
    value: (s) => s.totalReports,
  },
  {
    id: "penjaga_dzuhur",
    title: "Penjaga Dzuhur",
    subtitle: "10 hari puasa tercatat",
    target: 10,
    category: "Award",
    icon: "DZ",
    value: (s) => s.fastingDays,
  },
  {
    id: "ksatria_ashar",
    title: "Ksatria Ashar",
    subtitle: "Streak 5 hari",
    target: 5,
    category: "Achievement",
    icon: "AS",
    value: (s) => s.currentStreak,
  },
  {
    id: "cahaya_maghrib",
    title: "Cahaya Maghrib",
    subtitle: "20 laporan ibadah",
    target: 20,
    category: "Award",
    icon: "MG",
    value: (s) => s.totalReports,
  },
  {
    id: "penutup_isya",
    title: "Penutup Isya",
    subtitle: "30 laporan ibadah",
    target: 30,
    category: "Achievement",
    icon: "IS",
    value: (s) => s.totalReports,
  },
  {
    id: "raja_streak",
    title: "Raja Streak",
    subtitle: "Streak 10 hari",
    target: 10,
    category: "Award",
    icon: "ST",
    value: (s) => s.currentStreak,
  },
  {
    id: "pejuang_ramadhan",
    title: "Pejuang Ramadhan",
    subtitle: "15 hari puasa tercatat",
    target: 15,
    category: "Achievement",
    icon: "RM",
    value: (s) => s.fastingDays,
  },
  {
    id: "ahli_konsisten",
    title: "Ahli Konsisten",
    subtitle: "45 laporan ibadah",
    target: 45,
    category: "Award",
    icon: "AK",
    value: (s) => s.totalReports,
  },
  {
    id: "sang_reflektor",
    title: "Sang Reflektor",
    subtitle: "15 catatan refleksi",
    target: 15,
    category: "Achievement",
    icon: "RF",
    value: (s) => s.narratedDays,
  },
  {
    id: "pemburu_xp",
    title: "Pemburu XP",
    subtitle: "Kumpulkan 500 XP",
    target: 500,
    category: "Award",
    icon: "XP",
    value: (s) => s.totalXp,
  },
  {
    id: "penakluk_misi",
    title: "Penakluk Misi",
    subtitle: "Selesaikan 20 misi unik",
    target: 20,
    category: "Achievement",
    icon: "MS",
    value: (s) => s.uniqueMissionCount,
  },
  {
    id: "bintang_sunnah",
    title: "Bintang Sunnah",
    subtitle: "10 hari sunnah boost >= 50",
    target: 10,
    category: "Award",
    icon: "SN",
    value: (s) => s.highSunnahDays,
  },
  {
    id: "penjaga_puasa",
    title: "Penjaga Puasa",
    subtitle: "25 hari puasa tercatat",
    target: 25,
    category: "Achievement",
    icon: "PS",
    value: (s) => s.fastingDays,
  },
  {
    id: "hari_sempurna",
    title: "Hari Sempurna",
    subtitle: "8 hari bonus perfect day",
    target: 8,
    category: "Award",
    icon: "HS",
    value: (s) => s.perfectDays,
  },
  {
    id: "teladan_kelas",
    title: "Teladan Kelas",
    subtitle: "Masuk Top 3 kelas",
    target: 1,
    category: "Achievement",
    icon: "TK",
    value: (s) => (s.classSize > 0 && s.classRank > 0 && s.classRank <= 3 ? 1 : 0),
  },
  {
    id: "teladan_sekolah",
    title: "Teladan Sekolah",
    subtitle: "Masuk Top 10 sekolah",
    target: 1,
    category: "Award",
    icon: "TS",
    value: (s) => (s.totalUsers > 0 && s.schoolRank > 0 && s.schoolRank <= 10 ? 1 : 0),
  },
  {
    id: "mentor_kebaikan",
    title: "Mentor Kebaikan",
    subtitle: "Punya 1200 XP",
    target: 1200,
    category: "Achievement",
    icon: "MK",
    value: (s) => s.totalXp,
  },
];

export function buildBadges(stats: BadgeSourceStats): BadgeView[] {
  const definitions: BadgeDefinition[] = [
    ...baseDefinitions,
    {
      id: "legenda_ibadah",
      title: "Legenda Ibadah",
      subtitle: "Selesaikan semua badge lain",
      target: baseDefinitions.length,
      category: "Award",
      icon: "LG",
      value: (s) => {
        const unlockedCount = baseDefinitions.reduce((acc, def) => {
          return acc + (def.value(s) >= def.target ? 1 : 0);
        }, 0);
        return unlockedCount;
      },
    },
  ];

  return definitions.map((def) => {
    const current = def.value(stats);
    const progress = Math.max(0, Math.min(100, Math.round((current / def.target) * 100)));
    return {
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      progress,
      category: def.category,
      current,
      target: def.target,
      unlocked: progress >= 100,
      icon: def.icon,
    };
  });
}
