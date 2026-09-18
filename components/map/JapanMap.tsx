"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useLang } from "@/lib/lang";
import { t, tShort } from "@/lib/names";
import type { Level } from "@/lib/types";
import { OkinawaInset } from "./OkinawaInset";

export type MapPrefecture = {
  id: number;
  code: string;
  d: string;
  labelX: number;
  labelY: number;
  name_ko: string;
  name_ko_short: string;
  name_ja: string;
  level: Level;
  visit_count: number;
  /** 계획 여행이 하나라도 있는 현 */
  planned?: boolean;
};

export type MapCity = {
  id: string;
  x: number;
  y: number;
  name_ko: string;
  name_ja: string;
  visit_count: number;
  planned: boolean;
  /** 인셋 범위 밖이라 가장자리로 끌어온 개략 위치 (사키시마 등) */
  approximate?: boolean;
};

export type MapFilter = "all" | "done" | "planned";

type Props = {
  width: number;
  height: number;
  inset: { x: number; y: number; w: number; h: number };
  prefectures: MapPrefecture[];
  cities: MapCity[];
  /** cities: 현은 땅색, 도시 점으로 표현 · prefectures: 현을 방문 단계 색으로 채움 */
  mode: "cities" | "prefectures";
  filter?: MapFilter;
  okinawaLabel: ReactNode;
  className?: string;
};

const R: Record<1 | 2 | 3, number> = { 1: 5, 2: 7, 3: 9 };

/** 라벨 겹침 방지: 중요도(방문 횟수) 순으로 배치하고, 이미 놓인 라벨과 가까우면 생략 */
function pickLabels<T extends { x: number; y: number; weight: number }>(items: T[], dx = 64, dy = 14): Set<T> {
  const placed: T[] = [];
  const keep = new Set<T>();
  for (const it of [...items].sort((a, b) => b.weight - a.weight)) {
    if (!placed.some((p) => Math.abs(p.x - it.x) < dx && Math.abs(p.y - it.y) < dy)) {
      placed.push(it);
      keep.add(it);
    }
  }
  return keep;
}

function radius(count: number) {
  return R[Math.min(3, Math.max(1, count)) as 1 | 2 | 3];
}

export function JapanMap({ width, height, inset, prefectures, cities, mode, filter = "all", okinawaLabel, className }: Props) {
  const lang = useLang();
  const router = useRouter();
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);

  const onMove = (id: number) => (e: MouseEvent<Element>) => {
    const box = e.currentTarget.closest("[data-map-root]")?.getBoundingClientRect();
    if (!box) return;
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const hovered = hover ? prefectures.find((p) => p.id === hover.id) : null;

  const visibleCities = cities.filter((c) => {
    if (filter === "done") return c.visit_count > 0;
    if (filter === "planned") return c.planned;
    return c.visit_count > 0 || c.planned;
  });
  const cityLabelItems = visibleCities.map((c) => ({ x: c.x, y: c.y, weight: c.visit_count + (c.planned ? 0.5 : 0), id: c.id }));
  const cityLabels = new Set(Array.from(pickLabels(cityLabelItems)).map((i) => i.id));
  const prefLabelItems = prefectures.filter((p) => p.level !== 0).map((p) => ({ x: p.labelX, y: p.labelY, weight: p.visit_count, id: p.id }));
  const prefLabels = new Set(Array.from(pickLabels(prefLabelItems, 56, 14)).map((i) => i.id));

  return (
    <div data-map-root className={`relative ${className ?? ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="일본 지도">
        <g>
          {prefectures.map((p) => {
            // 현 별 보기: 항상 단계 색. 도시 지도: '다녀온 곳' 필터면 방문 현 색칠, '계획' 필터면 계획 현 점선
            let cls = "pf";
            if (mode === "prefectures") cls = p.level === "plan" ? "pf pp" : `pf p${p.level}`;
            else if (filter === "done" && p.visit_count > 0) cls = `pf p${p.level === "plan" ? 0 : p.level}`;
            else if (filter === "planned" && p.planned) cls = "pf pp";
            return (
              <a
                key={p.id}
                href={`/prefectures/${p.code}`}
                className="pf-link"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/prefectures/${p.code}`);
                }}
                onMouseMove={onMove(p.id)}
                onMouseLeave={() => setHover(null)}
                aria-label={t(p, lang)}
              >
                <path d={p.d} className={cls} />
              </a>
            );
          })}
        </g>
        <OkinawaInset inset={inset} label={okinawaLabel} />
        {mode === "prefectures" && (
          <g>
            {prefectures
              .filter((p) => p.level !== 0 && prefLabels.has(p.id))
              .map((p) => (
                <text key={p.id} className="lb" x={p.labelX} y={p.labelY} textAnchor="middle" fill={p.level === "plan" ? "var(--plan)" : "var(--ink)"}>
                  {tShort(p, lang)}
                </text>
              ))}
          </g>
        )}
        {mode === "cities" && (
          <g>
            {visibleCities.map((c) => {
              const planned = c.visit_count === 0 && c.planned;
              const r = planned ? 6 : radius(c.visit_count);
              return (
                <g key={c.id} className="cursor-pointer" onClick={() => router.push(`/cities/${c.id}`)}>
                  {c.approximate ? <circle cx={c.x} cy={c.y} r={r + 4} fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 2" /> : null}
                  {planned ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--plan-bg)" stroke="var(--plan)" strokeWidth="2" strokeDasharray="3 2" />
                  ) : (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--v3)" stroke="var(--card)" strokeWidth="2" />
                  )}
                  {cityLabels.has(c.id) ? (
                    <text className="lb" x={c.x + r + 4} y={c.y + 4} fill={planned ? "var(--plan)" : "var(--ink)"} style={{ fontWeight: c.visit_count >= 3 ? 600 : 500 }}>
                      {t(c, lang)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-3 py-2 text-xs text-bg shadow"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
          role="tooltip"
        >
          <div className="serif text-sm font-bold">{t(hovered, lang)}</div>
          <div className="text-sand">
            {hovered.visit_count > 0 ? `${hovered.visit_count}번 방문` : hovered.level === "plan" ? "계획 중" : "아직 미방문"} · 클릭하면 확대
          </div>
        </div>
      )}
    </div>
  );
}
