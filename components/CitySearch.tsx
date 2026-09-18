"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [active, setActive] = useState(0); // 키보드로 고른 후보 인덱스
  const rootRef = useRef<HTMLDivElement>(null);
  // 모바일: 아래 공간이 부족하면(하단 탭바·키보드) 목록을 입력창 위로 펼친다
  const [above, setAbove] = useState(false);
  useEffect(() => {
    if (!open) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom - 96; // 탭바 높이만큼 여유
    setAbove(spaceBelow < 240 && r.top > 240);
  }, [open, query, selectedIds.length]);
  const popCls = `absolute left-0 right-0 z-50 ${above ? "bottom-full mb-1" : "top-full mt-1"}`;

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
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
    setActive(0);
    setOpen(true);
  };
  useEffect(() => setActive(0), [q]);
  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="relative" ref={rootRef}>
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
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(candidates.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault(); // 검색창의 Enter 가 폼 제출로 새지 않도록
              const pick = candidates[active] ?? candidates[0];
              if (open && pick) add(pick.id);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && selectedIds.length) {
              remove(selectedIds[selectedIds.length - 1]);
            }
          }}
          role="combobox"
          aria-expanded={open && candidates.length > 0}
          aria-controls="city-search-listbox"
          aria-activedescendant={open && candidates[active] ? `city-option-${candidates[active].id}` : undefined}
          placeholder={selectedIds.length ? "도시 더 추가…" : "도시 이름 검색…"}
          className="min-w-[160px] flex-1 touch-manipulation bg-transparent px-2 py-2 text-sm outline-none"
          aria-label="도시 검색"
          autoComplete="off"
        />
      </div>
      {open && q && candidates.length === 0 && (
        <div className={`${popCls} rounded-xl border border-line bg-card px-3 py-2.5 text-xs text-muted shadow-lg`}>
          &lsquo;{query}&rsquo; 와 맞는 도시가 없어요. 현 확대 화면의 <span className="font-medium text-ink">+ 도시 추가</span>로 새 도시를 만들 수 있어요.
        </div>
      )}
      {open && candidates.length > 0 && (
        <ul id="city-search-listbox" className={`${popCls} max-h-72 touch-manipulation overflow-auto rounded-xl border border-line bg-card p-1 shadow-lg`} role="listbox">
          {candidates.map((c, i) => {
            const label = labelFor(c.id);
            const isActive = i === active;
            return (
              <li key={c.id} id={`city-option-${c.id}`} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerEnter={() => setActive(i)}
                  // 터치에서는 click 합성이 더블탭 판정·blur 에 밀릴 수 있어 pointerdown 시점에 바로 선택한다
                  onPointerDown={(e) => {
                    e.preventDefault();
                    add(c.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      add(c.id);
                    }
                  }}
                  className={`flex w-full touch-manipulation items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${isActive ? "bg-bg ring-1 ring-inset ring-line" : "hover:bg-bg"}`}
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
