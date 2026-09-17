import type { Metadata, Viewport } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR, Noto_Serif_JP } from "next/font/google";
import { cookies } from "next/headers";
import { MobileTabBar } from "@/components/MobileTabBar";
import { LangProvider } from "@/lib/lang";
import { LANG_COOKIE, parseLang } from "@/lib/lang-cookie";
import "./globals.css";

const display = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const ja = Noto_Serif_JP({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-ja",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "나의 일본 여행 지도", template: "%s · 나의 일본 여행 지도" },
  description: "다녀온 도시와 현을 지도에 채워가는 개인 여행 기록",
  applicationName: "나의 일본 여행 지도",
  appleWebApp: { capable: true, title: "일본 여행 지도", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "나의 일본 여행 지도", locale: "ko_KR" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4EFE6",
};

export default async function RootLayout({ children, modal }: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  const cookieStore = await cookies();
  const lang = parseLang(cookieStore.get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} data-lang={lang} className={`${display.variable} ${body.variable} ${ja.variable}`}>
      <body className="min-h-screen">
        <LangProvider initial={lang}>
          <div className="pb-[92px] md:pb-0">{children}</div>
          {modal}
          <MobileTabBar />
        </LangProvider>
      </body>
    </html>
  );
}
