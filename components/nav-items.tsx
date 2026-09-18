import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  /** 데스크톱 사이드바 라벨 */
  label: string;
  /** 모바일 하단 탭 라벨 */
  shortLabel: string;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** 주요 화면 4개 — 사이드바(데스크톱)와 하단 탭(모바일)이 함께 쓴다 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "도시 지도",
    shortLabel: "지도",
    match: (p) => p === "/" || p.startsWith("/cities"),
    icon: (
      <svg {...iconProps}>
        <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
        <path d="M9 4v13.5M15 6.5V20" />
      </svg>
    ),
  },
  {
    href: "/prefectures",
    label: "현 별 보기",
    shortLabel: "현 별",
    match: (p) => p.startsWith("/prefectures"),
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/trips",
    label: "여행 기록",
    shortLabel: "기록",
    match: (p) => p.startsWith("/trips") && p !== "/trips/new",
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: "/plans",
    label: "앞으로의 계획",
    shortLabel: "계획",
    match: (p) => p.startsWith("/plans"),
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
];
