import type { Lang } from "./types";

/** 서버·클라이언트 공용. lib/lang.tsx 는 "use client" 라 서버에서 함수를 import 할 수 없다. */
export const LANG_COOKIE = "lang";

export function parseLang(v: string | undefined | null): Lang {
  return v === "ja" ? "ja" : "ko";
}
