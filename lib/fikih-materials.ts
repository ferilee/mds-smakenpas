export type FikihSection = {
  title: string;
  points: string[];
};

export type FikihTopic = {
  key: string;
  title: string;
  sections: FikihSection[];
};

export const defaultFikihMaterials: FikihTopic[] = [
  {
    key: "taharah",
    title: "Taharah",
    sections: [
      {
        title: "Pengertian Taharah",
        points: ["Taharah adalah bersuci dari hadas dan najis."],
      },
      {
        title: "Dalil Taharah",
        points: [
          "Allah menyukai orang yang bertaubat dan menyucikan diri (QS. Al-Baqarah: 222).",
        ],
      },
      {
        title: "Macam-macam Taharah",
        points: ["Taharah dari hadas.", "Taharah dari najis."],
      },
      {
        title: "Alat Taharah",
        points: ["Air suci mensucikan.", "Debu suci untuk tayammum."],
      },
      {
        title: "Pembagian Air",
        points: [
          "Air suci mensucikan.",
          "Air suci tetapi tidak mensucikan.",
          "Air mutanajjis (terkena najis).",
        ],
      },
    ],
  },
  {
    key: "wudlu",
    title: "Wudlu",
    sections: [
      {
        title: "Pengertian Wudlu",
        points: ["Wudlu adalah bersuci dengan membasuh anggota tertentu."],
      },
      {
        title: "Syarat Wudlu",
        points: [
          "Islam, tamyiz, suci dari haid/nifas, dan menggunakan air suci.",
        ],
      },
      {
        title: "Rukun Wudlu",
        points: [
          "Niat.",
          "Membasuh wajah.",
          "Membasuh kedua tangan sampai siku.",
          "Mengusap sebagian kepala.",
          "Membasuh kedua kaki sampai mata kaki.",
          "Tertib.",
        ],
      },
      {
        title: "Sunnah Wudlu",
        points: [
          "Membaca basmalah.",
          "Bersiwak.",
          "Mendahulukan kanan.",
          "Membasuh tiga kali.",
          "Berdoa setelah wudlu.",
        ],
      },
      {
        title: "Makruh Wudlu",
        points: [
          "Berlebihan memakai air.",
          "Membicarakan hal sia-sia saat wudlu.",
        ],
      },
      {
        title: "Hal yang Membatalkan Wudlu",
        points: [
          "Keluar sesuatu dari qubul/dubur.",
          "Hilang akal (tidur nyenyak/pingsan).",
          "Bersentuhan kulit laki-laki dan perempuan non-mahram (menurut sebagian mazhab).",
        ],
      },
      {
        title: "Keutamaan Wudlu",
        points: [
          "Menghapus dosa kecil.",
          "Mengangkat derajat.",
          "Menjadi syarat sah shalat.",
        ],
      },
    ],
  },
  {
    key: "mandi",
    title: "Mandi Wajib",
    sections: [
      {
        title: "Pengertian Mandi",
        points: ["Mandi adalah mengalirkan air ke seluruh tubuh dengan niat."],
      },
      {
        title: "Hal yang Mewajibkan Mandi",
        points: [
          "Keluar mani.",
          "Jima'.",
          "Selesai haid atau nifas.",
          "Masuk Islam (menurut sebagian ulama).",
        ],
      },
      {
        title: "Rukun Mandi",
        points: ["Niat.", "Meratakan air ke seluruh tubuh."],
      },
      {
        title: "Sunnah Mandi",
        points: [
          "Membaca basmalah.",
          "Berwudlu sebelum mandi.",
          "Mendahulukan bagian kanan.",
          "Menggosok tubuh.",
        ],
      },
    ],
  },
  {
    key: "shalat",
    title: "Shalat",
    sections: [
      {
        title: "Pengertian Shalat",
        points: [
          "Shalat adalah ibadah dengan ucapan dan gerakan tertentu yang dimulai takbir dan diakhiri salam.",
        ],
      },
      {
        title: "Waktu Shalat Fardhu",
        points: [
          "Subuh, Dzuhur, Ashar, Maghrib, Isya sesuai ketentuan waktunya.",
        ],
      },
      {
        title: "Syarat Wajib Shalat",
        points: ["Islam.", "Baligh.", "Berakal."],
      },
      {
        title: "Syarat Sah Shalat",
        points: [
          "Suci dari hadas dan najis.",
          "Menutup aurat.",
          "Masuk waktu.",
          "Menghadap kiblat.",
        ],
      },
      {
        title: "Rukun Shalat",
        points: [
          "Niat.",
          "Takbiratul ihram.",
          "Berdiri bagi yang mampu.",
          "Membaca Al-Fatihah.",
          "Ruku'.",
          "I'tidal.",
          "Sujud.",
          "Duduk di antara dua sujud.",
          "Tasyahud akhir.",
          "Salam.",
          "Tertib.",
        ],
      },
      {
        title: "Sunnah Ab'adl Shalat",
        points: ["Tasyahud awal.", "Shalawat pada tasyahud awal.", "Qunut."],
      },
      {
        title: "Sunnah Haiat Shalat",
        points: [
          "Mengangkat tangan ketika takbir.",
          "Doa iftitah.",
          "Amin setelah Al-Fatihah.",
          "Tasbih ruku' dan sujud.",
        ],
      },
      {
        title: "Makruh Shalat",
        points: [
          "Menoleh tanpa kebutuhan.",
          "Bermain-main dengan pakaian atau anggota badan.",
          "Menahan buang air.",
        ],
      },
      {
        title: "Hal yang Membatalkan Shalat",
        points: [
          "Berhadas.",
          "Terkena najis yang tidak dimaafkan.",
          "Berbicara sengaja.",
          "Banyak bergerak tanpa kebutuhan.",
          "Makan atau minum sengaja.",
        ],
      },
    ],
  },
  {
    key: "puasa",
    title: "Puasa",
    sections: [
      {
        title: "Pengertian Puasa",
        points: [
          "Puasa adalah menahan diri dari hal yang membatalkan sejak fajar hingga maghrib dengan niat.",
        ],
      },
      {
        title: "Dalil Kewajiban Puasa",
        points: [
          "QS. Al-Baqarah: 183 mewajibkan puasa Ramadan bagi orang beriman.",
        ],
      },
      {
        title: "Syarat Puasa",
        points: ["Islam.", "Baligh.", "Berakal.", "Mampu berpuasa."],
      },
      {
        title: "Rukun Puasa",
        points: ["Niat pada malam hari.", "Menahan diri dari pembatal puasa."],
      },
      {
        title: "Hal yang Membatalkan Puasa",
        points: [
          "Makan dan minum dengan sengaja.",
          "Jima'.",
          "Muntah dengan sengaja.",
          "Keluar mani karena sengaja.",
          "Haid dan nifas.",
        ],
      },
      {
        title: "Tingkatan Orang Berpuasa (Imam Ghazali - Ihya Ulumuddin)",
        points: [
          "Puasa orang awam: menahan makan, minum, dan syahwat.",
          "Puasa orang khusus: menjaga pendengaran, penglihatan, lisan, tangan, kaki dari maksiat.",
          "Puasa orang super khusus: puasa hati dari selain Allah.",
        ],
      },
    ],
  },
  {
    key: "tarawih",
    title: "Shalat Tarawih",
    sections: [
      {
        title: "Pengertian Shalat Tarawih",
        points: ["Shalat sunnah malam pada bulan Ramadan setelah Isya."],
      },
      {
        title: "Niat Shalat Tarawih",
        points: [
          "Ushalli sunnatat taraawiihi rak'ataini lillaahi ta'aalaa (untuk dua rakaat).",
        ],
      },
      {
        title: "Keutamaan Shalat Tarawih",
        points: [
          "Mendapat ampunan dosa yang telah lalu (bagi yang mengerjakan dengan iman dan ikhlas).",
          "Menghidupkan malam Ramadan dengan ibadah.",
        ],
      },
    ],
  },
];
