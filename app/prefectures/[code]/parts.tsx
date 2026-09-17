"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { other, t, tRegion, tShort } from "@/lib/names";
import type { Prefecture } from "@/lib/types";

type CityLike = { id: string; name_ko: string; name_ja: string; visit_count: number; planned: boolean };

export function PrefectureTitle({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return <>{t(prefecture, lang)}</>;
}

export function LocalName({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return <>{t(prefecture, other(lang))}</>;
}

export function RegionName({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return <>{tRegion(prefecture, lang)}</>;
}

export function Breadcrumb({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="현재 위치">
      <Link href="/" className="text-muted hover:text-ink">
        {lang === "ja" ? "全国" : "전국"}
      </Link>
      <span className="text-sand">›</span>
      <Link href="/prefectures" className="text-muted hover:text-ink">
        {tRegion(prefecture, lang)}
      </Link>
      <span className="text-sand">›</span>
      <span className="font-semibold">{t(prefecture, lang)}</span>
      <span className="ml-2 text-xs text-muted">{t(prefecture, other(lang))}</span>
    </nav>
  );
}

export function CityRow({ city, years = [] }: { city: CityLike; years?: string[] }) {
  const lang = useLang();
  const planned = city.visit_count === 0 && city.planned;
  const badge =
    city.visit_count >= 3
      ? "bg-v3 text-card"
      : city.visit_count === 2
        ? "bg-v2 text-ink"
        : city.visit_count === 1
          ? "bg-v1 text-ink"
          : "border border-dashed border-plan text-plan";
  return (
    <li>
      <Link
        href={`/cities/${city.id}`}
        className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl px-3.5 py-3 ${
          planned ? "border border-dashed border-plan bg-plan-bg" : "bg-bg"
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <span className={`text-[15px] font-semibold ${planned ? "text-plan" : ""}`}>
            {t(city, lang)} <span className="text-xs font-normal text-muted">{t(city, other(lang))}</span>
          </span>
          {years.length ? <span className="text-xs text-muted">{years.join(" · ")}</span> : null}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>
          {planned ? "계획" : `${city.visit_count}회`}
        </span>
        <span className={planned ? "text-plan" : "text-muted"}>›</span>
      </Link>
    </li>
  );
}

export function UnvisitedChip({ city }: { city: CityLike }) {
  const lang = useLang();
  return (
    <Link href={`/cities/${city.id}`} className="rounded-full border border-line px-2.5 py-[5px] text-xs text-muted hover:border-ink hover:text-ink">
      {t(city, lang)}
    </Link>
  );
}

type NeighborLike = { id: number; code: string; name_ko: string; name_ko_short: string; name_ja: string; visit_count: number };

export function NeighborSummary({ neighbors }: { neighbors: NeighborLike[] }) {
  const lang = useLang();
  if (neighbors.length === 0) return <div className="text-[13px] text-muted">이웃 현이 없어요</div>;
  const visited = neighbors.filter((n) => n.visit_count > 0);
  const rest = neighbors.filter((n) => n.visit_count === 0);
  return (
    <div className="text-[13px]">
      {visited.map((n, i) => (
        <span key={n.id}>
          {i > 0 ? " · " : ""}
          <Link href={`/prefectures/${n.code}`} className={`font-semibold ${n.visit_count >= 3 ? "text-v3" : ""}`}>
            {tShort(n, lang)} {n.visit_count}
          </Link>
        </span>
      ))}
      {visited.length > 0 && rest.length > 0 ? " · " : ""}
      {rest.map((n, i) => (
        <span key={n.id} className="text-muted">
          {i > 0 ? " · " : ""}
          <Link href={`/prefectures/${n.code}`} className="hover:text-ink">
            {tShort(n, lang)}
          </Link>
        </span>
      ))}
    </div>
  );
}
