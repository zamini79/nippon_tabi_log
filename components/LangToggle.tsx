"use client";

import { useLang, useSetLang } from "@/lib/lang";

export function LangToggle() {
  const lang = useLang();
  const setLang = useSetLang();
  const base = "rounded-full px-2.5 py-[7px] text-xs transition-colors cursor-pointer md:px-[13px]";
  const on = "bg-ink text-bg font-semibold border border-ink";
  const off = "text-muted border border-transparent hover:text-ink";
  return (
    <div className="flex gap-0.5 rounded-full bg-land-0 p-[3px]" role="group" aria-label="표시 언어">
      <button type="button" onClick={() => setLang("ko")} className={`${base} ${lang === "ko" ? on : off}`} aria-pressed={lang === "ko"}>
        <span className="md:hidden">한</span>
        <span className="hidden md:inline">한글</span>
      </button>
      <button type="button" onClick={() => setLang("ja")} className={`${base} ${lang === "ja" ? on : off}`} aria-pressed={lang === "ja"}>
        <span className="md:hidden">日</span>
        <span className="hidden md:inline">日本語</span>
      </button>
    </div>
  );
}
