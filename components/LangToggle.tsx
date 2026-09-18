"use client";

import { useLang, useSetLang } from "@/lib/lang";

/** compact: 좁은 곳(사이드바)에서 항상 한 글자 라벨 */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const setLang = useSetLang();
  const base = `rounded-full py-[7px] text-xs transition-colors cursor-pointer ${compact ? "px-3" : "px-2.5 md:px-[13px]"}`;
  const on = "bg-ink text-bg font-semibold border border-ink";
  const off = "text-muted border border-transparent hover:text-ink";
  return (
    <div className="flex gap-0.5 rounded-full bg-land-0 p-[3px]" role="group" aria-label="표시 언어">
      <button type="button" onClick={() => setLang("ko")} className={`${base} ${lang === "ko" ? on : off}`} aria-pressed={lang === "ko"}>
        {compact ? "한" : (<><span className="md:hidden">한</span><span className="hidden md:inline">한글</span></>)}
      </button>
      <button type="button" onClick={() => setLang("ja")} className={`${base} ${lang === "ja" ? on : off}`} aria-pressed={lang === "ja"}>
        {compact ? "日" : (<><span className="md:hidden">日</span><span className="hidden md:inline">日本語</span></>)}
      </button>
    </div>
  );
}
