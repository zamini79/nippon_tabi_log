"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangToggle } from "./LangToggle";
import { NAV_ITEMS } from "./nav-items";

export type SideNavSummary = { cities: number; prefectures: number; trips: number };

/** 데스크톱(md 이상) 왼쪽 세로 메뉴. 모바일은 AppHeader + MobileTabBar 가 담당. */
export function SideNav({ summary }: { summary: SideNavSummary | null }) {
  const pathname = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-bg px-3 pb-6 pt-6 md:flex"
      style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}
    >
      <div className="flex flex-col gap-3 px-1">
        <Link href="/" className="brand text-[17px] font-bold leading-tight tracking-[-0.5px] whitespace-nowrap">
          日本タビログ
        </Link>
        {summary ? (
          summary.trips > 0 ? (
            <dl className="flex flex-col gap-1 text-[12px] text-muted">
              <div className="flex items-baseline gap-1">
                <dd className="serif text-[15px] font-bold text-ink">{summary.cities}</dd>
                <dt>개 도시</dt>
              </div>
              <div className="flex items-baseline gap-1">
                <dd className="serif text-[15px] font-bold text-ink">{summary.prefectures}</dd>
                <dt>/ 47현</dt>
              </div>
              <div className="flex items-baseline gap-1">
                <dd className="serif text-[15px] font-bold text-ink">{summary.trips}</dd>
                <dt>번의 여행</dt>
              </div>
            </dl>
          ) : (
            <p className="text-[12px] leading-snug text-muted">첫 여행을 기록해 보세요</p>
          )
        ) : null}
      </div>

      <nav className="flex flex-col gap-1" aria-label="주요 화면">
        {NAV_ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center text-[12px] font-medium leading-tight transition-colors ${
                active ? "bg-ink text-bg" : "text-muted hover:bg-land-0 hover:text-ink"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {it.icon}
              <span className="break-keep">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-stretch gap-3">
        <div className="flex justify-center">
          <LangToggle compact />
        </div>
        <Link
          href="/trips/new"
          className="flex items-center justify-center gap-1.5 rounded-[10px] bg-v3 px-2 py-2.5 text-[13px] font-semibold text-card hover:brightness-95 whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          여행 추가
        </Link>
      </div>
    </aside>
  );
}
