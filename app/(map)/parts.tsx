"use client";

import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { Prefecture } from "@/lib/types";

export function OkinawaLabel({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return <>{t(prefecture, lang)}</>;
}

/** 여행에 포함된 도시 이름 목록 — 마일스톤 2에서 visits 조인으로 채운다. 지금은 제목만. */
export function TripCities({ fallback }: { tripId: string; fallback: string }) {
  return <>{fallback}</>;
}
