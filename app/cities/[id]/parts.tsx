"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { other, t, tRegion } from "@/lib/names";
import type { City, Prefecture } from "@/lib/types";

export function CityName({ city }: { city: City }) {
  const lang = useLang();
  return <>{t(city, lang)}</>;
}

export function CitySubtitle({ city, prefecture }: { city: City; prefecture: Prefecture }) {
  const lang = useLang();
  return (
    <>
      {t(city, other(lang))} · {t(prefecture, lang)} · {tRegion(prefecture, lang)}
    </>
  );
}

export function CityBreadcrumb({ city, prefecture }: { city: City; prefecture: Prefecture }) {
  const lang = useLang();
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[13px]" aria-label="현재 위치">
      <Link href="/" className="text-muted hover:text-ink">{lang === "ja" ? "全国" : "전국"}</Link>
      <span className="text-sand">›</span>
      <Link href="/prefectures" className="text-muted hover:text-ink">{tRegion(prefecture, lang)}</Link>
      <span className="text-sand">›</span>
      <Link href={`/prefectures/${prefecture.code}`} className="text-muted hover:text-ink">{t(prefecture, lang)}</Link>
      <span className="text-sand">›</span>
      <span className="font-semibold">{t(city, lang)}</span>
    </nav>
  );
}

export function CompanionChips({ cities, self }: { cities: City[]; self: City }) {
  const lang = useLang();
  if (cities.length === 0) return <span className="rounded-full bg-bg px-2.5 py-1 text-xs text-[#8A8378]">{t(self, lang)}만</span>;
  return (
    <>
      {cities.map((c) => (
        <Link key={c.id} href={`/cities/${c.id}`} className="rounded-full bg-bg px-2.5 py-1 text-xs hover:bg-land-0">
          {t(c, lang)}
        </Link>
      ))}
    </>
  );
}

export function PrefectureFilled({ prefecture, visitCount, regionDone, regionTotal }: { prefecture: Prefecture; visitCount: number; regionDone: number; regionTotal: number }) {
  const lang = useLang();
  return (
    <>
      {t(prefecture, lang)} <span className="text-v3">{visitCount}회</span> · {tRegion(prefecture, lang)} {regionDone}/{regionTotal}현
    </>
  );
}

export function NextIdeaText({ cities }: { cities: City[] }) {
  const lang = useLang();
  return <>{cities.map((c) => t(c, lang)).join(" · ")}</>;
}
