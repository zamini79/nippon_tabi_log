"use client";

import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { Prefecture } from "@/lib/types";

export function OkinawaLabel({ prefecture }: { prefecture: Prefecture }) {
  const lang = useLang();
  return <>{t(prefecture, lang)}</>;
}
