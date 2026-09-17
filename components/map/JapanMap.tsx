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
};

export type MapCity = {
  id: string;
  x: number;
  y: number;
  name_ko: string;
  name_ja: string;
  visit_count: number;
  planned: boolean;
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

  return (
    <div data-map-root className={`relative ${className ?? ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="일본 지도">
        <g>
          {prefectures.map((p) => {
            const cls =
              mode === "prefectures"
                ? p.level === "plan"
                  ? "pf pp"
                  : `pf p${p.level}`
                : "pf";
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
              .filter((p) => p.level !== 0)
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
                  {planned ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--plan-bg)" stroke="var(--plan)" strokeWidth="2" strokeDasharray="3 2" />
                  ) : (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--v3)" stroke="var(--card)" strokeWidth="2" />
                  )}
                  <text className="lb" x={c.x + r + 4} y={c.y + 4} fill={planned ? "var(--plan)" : "var(--ink)"} style={{ fontWeight: c.visit_count >= 3 ? 600 : 500 }}>
                    {t(c, lang)}
                  </text>
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
