import type { Lang } from "./types";

type Named = { name_ko: string; name_ja: string };
type PrefNamed = Named & { name_ko_short: string };
type RegionNamed = { region_ko: string; region_ja: string };

/** 도시·현 이름. 지명은 항상 이 함수로 — 코드에 하드코딩하지 않는다. */
export function t(e: Named, lang: Lang): string {
  return lang === "ja" ? e.name_ja : e.name_ko;
}

/** 현 짧은 이름 (오사카 / 大阪). 北海道 는 그대로. */
export function tShort(p: PrefNamed, lang: Lang): string {
  if (lang === "ko") return p.name_ko_short;
  if (p.name_ja === "北海道") return p.name_ja;
  return p.name_ja.replace(/[都府県]$/, "");
}

/** 지방 이름 (간사이 / 関西) */
export function tRegion(p: RegionNamed, lang: Lang): string {
  return lang === "ja" ? p.region_ja : p.region_ko;
}

/** 반대 언어 (부제로 함께 표기할 때) */
export function other(lang: Lang): Lang {
  return lang === "ko" ? "ja" : "ko";
}
