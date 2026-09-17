"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { t, tShort } from "@/lib/names";
import type { Level } from "@/lib/types";

export type ZoomNeighborView = {
  id: number;
  code: string;
  d: string;
  labelX: number;
  labelY: number;
  name_ko: string;
  name_ko_short: string;
  name_ja: string;
};

export type ZoomCityView = {
  id: string;
  x: number;
  y: number;
  name_ko: string;
  name_ja: string;
  visit_count: number;
  planned: boolean;
};

type Props = {
  width: number;
  height: number;
  target: { d: string; level: Level; name_ko: string; name_ja: string };
  neighbors: ZoomNeighborView[];
  cities: ZoomCityView[];
};

const FILL: Record<Exclude<Level, "plan">, string> = {
  0: "var(--land-0)",
  1: "var(--v1)",
  2: "var(--v2)",
  3: "var(--v3)",
};

function radius(c: ZoomCityView) {
  if (c.visit_count >= 3) return 12;
  if (c.visit_count === 2) return 9;
  if (c.visit_count === 1) return 7;
  return c.planned ? 7 : 5;
}

/** 현 확대 지도. 이웃 현은 옅게, 대상 현은 방문 단계 색, 도시 점 + 이름. */
export function PrefectureZoom({ width, height, target, neighbors, cities }: Props) {
  const lang = useLang();
  const targetFill = target.level === "plan" ? "var(--plan-bg)" : FILL[target.level];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${t(target, lang)} 확대 지도`}>
      <g>
        {neighbors.map((n) => (
          <Link key={n.id} href={`/prefectures/${n.code}`} aria-label={t(n, lang)}>
            <path d={n.d} className="zd hover:opacity-80" />
          </Link>
        ))}
      </g>
      <path
        d={target.d}
        className="zt"
        fill={targetFill}
        strokeDasharray={target.level === "plan" ? "4 3" : undefined}
        stroke={target.level === "plan" ? "var(--plan)" : "var(--ink)"}
      />
      <g>
        {neighbors
          .filter((n) => Number.isFinite(n.labelX) && Number.isFinite(n.labelY))
          .map((n) => (
            <text key={n.id} className="zr" x={n.labelX} y={n.labelY} textAnchor="middle">
              {tShort(n, lang)}
            </text>
          ))}
      </g>
      <g>
        {cities.map((c) => {
          const r = radius(c);
          const visited = c.visit_count > 0;
          const planned = !visited && c.planned;
          const color = visited ? "var(--ink)" : planned ? "var(--plan)" : "var(--muted)";
          return (
            <Link key={c.id} href={`/cities/${c.id}`} aria-label={t(c, lang)}>
              <g className="cursor-pointer">
                {visited ? (
                  <circle cx={c.x} cy={c.y} r={r} fill="var(--v3)" stroke="var(--card)" strokeWidth="2.5" />
                ) : planned ? (
                  <circle cx={c.x} cy={c.y} r={r} fill="var(--plan-bg)" stroke="var(--plan)" strokeWidth="2" strokeDasharray="3 2" />
                ) : (
                  <circle cx={c.x} cy={c.y} r={r} fill="var(--card)" stroke="#8A8378" strokeWidth="1.5" />
                )}
                <text className="lb" x={c.x + r + 5} y={c.y + 4} fill={color} style={{ fontWeight: visited ? 600 : 500 }}>
                  {t(c, lang)}
                </text>
              </g>
            </Link>
          );
        })}
      </g>
    </svg>
  );
}
