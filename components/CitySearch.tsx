"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/lang";
import { other, t, tShort } from "@/lib/names";
import type { CityWithPrefecture } from "@/lib/types";

type Props = {
  cities: CityWithPrefecture[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** 칩에 붙는 "첫 방문 / N회째" 라벨 */
  labelFor: (cityId: string) => { text: string; isFirst: boolean };
  planned: boolean;
};

export function CitySearch({ cities, selectedIds, onChange, labelFor, planned }: Props) {
  const lang = useLang();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const q = query.trim().toLowerCase();
  const candidates = useMemo(() => {
    const pool = cities.filter((c) => !selectedIds.includes(c.id));
    if (!q) return pool.slice(0, 8);
    // 점수: 도시 이름 시작 일치 > 도시 이름 포함 > 현 이름 포함
    const score = (c: CityWithPrefecture) => {
      const names = [c.name_ko, c.name_ja, c.name_en ?? ""].map((x) => x.toLowerCase());
      if (names.some((n) => n.startsWith(q))) return 0;
      if (names.some((n) => n.includes(q))) return 1;
      const prefs = [c.prefecture.name_ko, c.prefecture.name_ko_short, c.prefecture.name_ja].map((x) => x.toLowerCase());
      if (prefs.some((n) => n.includes(q))) return 2;
      return 9;
    };
    return pool
      .map((c) => ({ c, s: score(c) }))
      .filter((x) => x.s < 9)
      .sort((a, b) => a.s - b.s || a.c.name_ko.localeCompare(b.c.name_ko, "ko"))
      .slice(0, 8)
      .map((x) => x.c);
  }, [cities, selectedIds, q]);

  const add = (id: string) => {
    onChange([...selectedIds, id]);
    setQuery("");
  };
  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="relative">
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-[#D6CBB5] bg-card px-2 py-1.5">
        {selectedIds.map((id) => {
          const c = byId.get(id);
          if (!c) return null;
          const label = labelFor(id);
          const cls = planned
            ? "border border-dashed border-plan bg-plan-bg text-plan"
            : label.isFirst
              ? "bg-v3 text-card"
              : "bg-ink text-bg";
          const sub = planned ? "text-plan/70" : label.isFirst ? "text-v1" : "text-sand";
          return (
            <span key={id} className={`flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[13px] ${cls}`}>
              {t(c, lang)}
              <span className={`text-[11px] ${sub}`}>{planned ? "계획" : label.text}</span>
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`${t(c, lang)} 빼기`}
                className="ml-0.5 -mr-1 rounded-full px-1 leading-none opacity-70 hover:opacity-100"
              >
                ×
              </button>
              <input type="hidden" name="city_ids" value={id} />
            </span>
          );
        })}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && candidates[0]) {
              e.preventDefault();
              add(candidates[0].id);
            }
            if (e.key === "Backspace" && !query && selectedIds.length) remove(selectedIds[selectedIds.length - 1]);
          }}
          placeholder={selectedIds.length ? "도시 더 추가…" : "도시 이름 검색…"}
          className="min-w-[160px] flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          aria-label="도시 검색"
          autoComplete="off"
        />
      </div>
      {open && candidates.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-card p-1 shadow-lg" role="listbox">
          {candidates.map((c) => {
            const label = labelFor(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(c.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg"
                >
                  <span>
                    <span className="font-medium">{t(c, lang)}</span>
                    <span className="ml-2 text-xs text-muted">
                      {t(c, other(lang))} · {tShort(c.prefecture, lang)}
                    </span>
                  </span>
                  <span className={`text-[11px] ${label.isFirst ? "text-v3" : "text-muted"}`}>{label.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
