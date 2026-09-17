"use client";

import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { City } from "@/lib/types";

/** 여행에 포함된 도시 이름을 " · " 로 이어서 표시 */
export function CityNames({ cities, fallback }: { cities: City[]; fallback?: string }) {
  const lang = useLang();
  if (cities.length === 0) return <>{fallback ?? ""}</>;
  return <>{cities.map((c) => t(c, lang)).join(" · ")}</>;
}
