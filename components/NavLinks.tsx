"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/", label: "도시 지도", match: (p) => p === "/" || p.startsWith("/cities") },
  { href: "/prefectures", label: "현 별 보기", match: (p) => p.startsWith("/prefectures") },
  { href: "/trips", label: "여행 기록", match: (p) => p.startsWith("/trips") && p !== "/trips/new" },
  { href: "/plans", label: "앞으로의 계획", match: (p) => p.startsWith("/plans") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden gap-1.5 md:flex" aria-label="주요 화면">
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-ink text-bg" : "hover:bg-land-0"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
