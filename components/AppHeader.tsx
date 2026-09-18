import Link from "next/link";
import { LangToggle } from "./LangToggle";

type Props = {
  subtitle: string;
};

/**
 * 모바일: 제목 + 부제 + 언어 토글 + 여행 추가 버튼 (메뉴는 하단 탭).
 * 데스크톱: 메뉴가 왼쪽 SideNav 로 옮겨졌으므로 부제만 얇은 줄로 표시한다.
 */
export function AppHeader({ subtitle }: Props) {
  return (
    <>
      <header className="flex h-[76px] items-center justify-between gap-3 border-b border-line px-4 md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href="/" className="brand whitespace-nowrap text-[19px] font-bold tracking-[-0.5px]">
            日本タビログ
          </Link>
          {subtitle ? <span className="truncate text-[11px] text-muted">{subtitle}</span> : null}
        </div>
        <div className="flex items-center gap-3.5">
          <LangToggle />
          <Link
            href="/trips/new"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-v3 text-card hover:brightness-95"
            aria-label="여행 추가"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </Link>
        </div>
      </header>
      {subtitle ? (
        <div className="hidden h-12 items-center border-b border-line px-12 text-[13px] text-muted md:flex">{subtitle}</div>
      ) : null}
    </>
  );
}
