"use client";

import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";

export function PrefNames({ prefectures }: { prefectures: { name_ko: string; name_ja: string }[] }) {
  const lang = useLang();
  return <>{prefectures.map((p) => t(p, lang)).join(" · ")}</>;
}
