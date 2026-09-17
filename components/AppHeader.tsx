import Link from "next/link";
import { LangToggle } from "./LangToggle";
import { NavLinks } from "./NavLinks";

type Props = {
  subtitle: string;
};

export function AppHeader({ subtitle }: Props) {
  return (
    <header className="flex h-[76px] items-center justify-between gap-3 border-b border-line px-4 md:px-12" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-3">
        <Link href="/" className="serif whitespace-nowrap text-[19px] font-bold tracking-[-0.5px] md:text-[26px]">
          나의 일본 여행 지도
        </Link>
        {subtitle ? <span className="truncate text-[11px] text-muted md:text-[13px] lg:inline">{subtitle}</span> : null}
      </div>
      <NavLinks />
      <div className="flex items-center gap-3.5">
        <LangToggle />
        <Link
          href="/trips/new"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-v3 text-card hover:brightness-95 md:size-auto md:gap-2 md:rounded-[10px] md:px-[18px] md:py-[11px] md:text-sm md:font-semibold"
          aria-label="여행 추가"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span className="hidden md:inline">여행 추가</span>
        </Link>
      </div>
    </header>
  );
}
