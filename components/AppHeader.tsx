import Link from "next/link";
import { LangToggle } from "./LangToggle";
import { NavLinks } from "./NavLinks";

type Props = {
  subtitle: string;
};

export function AppHeader({ subtitle }: Props) {
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-line px-5 md:px-12">
      <div className="flex items-baseline gap-3">
        <Link href="/" className="serif text-[22px] font-bold tracking-[-0.5px] md:text-[26px]">
          나의 일본 여행 지도
        </Link>
        <span className="hidden text-[13px] text-muted lg:inline">{subtitle}</span>
      </div>
      <NavLinks />
      <div className="flex items-center gap-3.5">
        <LangToggle />
        <Link
          href="/trips/new"
          className="flex items-center gap-2 rounded-[10px] bg-v3 px-[18px] py-[11px] text-sm font-semibold text-card hover:brightness-95"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          여행 추가
        </Link>
      </div>
    </header>
  );
}
