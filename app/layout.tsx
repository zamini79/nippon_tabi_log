import type { Metadata, Viewport } from "next";
import { Gowun_Batang, IBM_Plex_Sans_KR, Noto_Serif_JP } from "next/font/google";
import { cookies } from "next/headers";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SideNav } from "@/components/SideNav";
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
  title: { default: "日本タビログ", template: "%s · 日本タビログ" },
  description: "다녀온 도시와 현을 지도에 채워가는 개인 여행 기록",
  applicationName: "日本タビログ",
  appleWebApp: { capable: true, title: "日本タビログ", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "日本タビログ", locale: "ko_KR" },
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
          {/* 데스크톱: 왼쪽 메뉴 1 : 본문 9 (본문 안에서 지도 6 : 세부 3). 모바일은 헤더 + 하단 탭 */}
          <div className="md:grid md:grid-cols-[minmax(132px,1fr)_9fr]">
            <SideNav />
            <div className="min-w-0 pb-[92px] md:pb-0">{children}</div>
          </div>
          {modal}
          <MobileTabBar />
        </LangProvider>
      </body>
    </html>
  );
}
