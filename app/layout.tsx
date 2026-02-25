import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Majelis Digital SMKN Pasirian",
  description: "Aplikasi ibadah harian berbasis XP untuk siswa SMKN Pasirian.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Majelis Digital SMKN Pasirian",
    description: "Pantau progres ibadah harianmu, kumpulkan XP, dan raih prestasi di Majelis Digital.",
    url: "https://mds.smakenpas.sch.id",
    siteName: "Majelis Digital",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Majelis Digital SMKN Pasirian Dashboard",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Majelis Digital SMKN Pasirian",
    description: "Aplikasi ibadah harian berbasis XP untuk siswa SMKN Pasirian.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
  try {
    const key = "theme_mode";
    const saved = localStorage.getItem(key);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_err) {
    document.documentElement.classList.remove("dark");
  }
})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
