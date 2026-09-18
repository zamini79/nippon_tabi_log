"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

/** 모바일 하단 탭 4개 (md 미만에서만). 여행 추가는 헤더의 + 버튼. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-line bg-card px-4 pt-2 md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      aria-label="하단 탭"
    >
      {NAV_ITEMS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] ${active ? "font-semibold text-v3" : "text-muted"}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.icon}
            {tab.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
