"use client";

import Link from "next/link";
import type React from "react";
import { useLang } from "@/lib/lang";
import { t, tShort } from "@/lib/names";
import type { Level } from "@/lib/types";
import { MapZoomControls } from "./MapZoomControls";
import { useMapZoom } from "./useMapZoom";

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
  /** 지도 범위 밖이라 가장자리로 끌어온 개략 위치 */
  approximate?: boolean;
  is_custom?: boolean;
  /** 시·정·촌 경계 path (방문·계획 도시만) */
  d?: string;
};

type Props = {
  width: number;
  height: number;
  target: { d: string; level: Level; name_ko: string; name_ja: string };
  neighbors: ZoomNeighborView[];
  cities: ZoomCityView[];
  /** 이 현의 모든 시·정·촌 경계 path (구분선) */
  outlines?: string[];
  /** 도시 추가 모드: 지도를 누르면 viewBox 좌표를 돌려준다 */
  pickMode?: boolean;
  picked?: { x: number; y: number } | null;
  onPick?: (p: { x: number; y: number }) => void;
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
export function PrefectureZoom({ width, height, target, neighbors, cities, outlines = [], pickMode, picked, onPick }: Props) {
  const lang = useLang();
  // 경계가 있는 방문·계획 도시가 하나라도 있으면 현 전체 대신 그 시들만 색칠
  const shaped = cities.filter((c) => c.d && (c.visit_count > 0 || c.planned));
  const targetFill = shaped.length ? "var(--land)" : target.level === "plan" ? "var(--plan-bg)" : FILL[target.level];
  const zoom = useMapZoom(width, height);
  const k = zoom.screenK; // 화면 1px 당 viewBox 단위 (모바일 축소 시에도 글자·점이 같은 픽셀 크기)
  const handlePick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!pickMode || !onPick) return;
    const p = zoom.toViewBox(e.clientX, e.clientY);
    onPick({ x: p.x, y: p.y });
  };
  return (
    <div className="relative">
      <svg
        ref={zoom.svgRef}
        viewBox={zoom.viewBox}
        className={`block h-auto w-full select-none ${pickMode ? "cursor-crosshair" : ""}`}
        role="img"
        aria-label={`${t(target, lang)} 확대 지도`}
        onClick={handlePick}
        {...zoom.svgProps}
        style={pickMode ? { ...zoom.svgProps.style, cursor: "crosshair" } : zoom.svgProps.style}
      >
        <g style={pickMode ? { pointerEvents: "none" } : undefined}>
          {neighbors.map((n) => (
            <Link key={n.id} href={`/prefectures/${n.code}`} aria-label={t(n, lang)}>
              <path d={n.d} className="zd hover:opacity-80" vectorEffect="non-scaling-stroke" />
            </Link>
          ))}
        </g>
        <path
          d={target.d}
          className="zt"
          vectorEffect="non-scaling-stroke"
          fill={targetFill}
          strokeDasharray={target.level === "plan" && !shaped.length ? "4 3" : undefined}
          stroke={target.level === "plan" && !shaped.length ? "var(--plan)" : "var(--ink)"}
        />
        {outlines.length ? (
          <g pointerEvents="none">
            {outlines.map((d, i) => (
              <path key={i} d={d} className="mb" vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        ) : null}
        {shaped.length ? (
          <g style={pickMode ? { pointerEvents: "none" } : undefined}>
            {shaped.map((c) => {
              const planned = c.visit_count === 0 && c.planned;
              const lv = (c.visit_count >= 3 ? 3 : c.visit_count === 2 ? 2 : 1) as 1 | 2 | 3;
              return (
                <Link key={`shape-${c.id}`} href={`/cities/${c.id}`} aria-label={t(c, lang)}>
                  <path
                    d={c.d}
                    fill={planned ? "var(--plan-bg)" : FILL[lv]}
                    stroke={planned ? "var(--plan)" : "var(--card)"}
                    strokeWidth={planned ? 1.6 : 1.8}
                    strokeDasharray={planned ? "3 2" : undefined}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="hover:brightness-95"
                  />
                </Link>
              );
            })}
          </g>
        ) : null}
        <g>
          {neighbors
            .filter((n) => Number.isFinite(n.labelX) && Number.isFinite(n.labelY))
            .map((n) => (
              <text key={n.id} className="zr" x={n.labelX} y={n.labelY} textAnchor="middle" style={{ fontSize: 13 * k }}>
                {tShort(n, lang)}
              </text>
            ))}
        </g>
        <g style={pickMode ? { pointerEvents: "none" } : undefined}>
          {cities.map((c) => {
            const r = radius(c) * k;
            const visited = c.visit_count > 0;
            const planned = !visited && c.planned;
            const color = visited ? "var(--ink)" : planned ? "var(--plan)" : "var(--muted)";
            return (
              <Link key={c.id} href={`/cities/${c.id}`} aria-label={`${t(c, lang)}${c.approximate ? " (지도 범위 밖, 개략 위치)" : ""}`}>
                <g className="cursor-pointer">
                  {c.approximate ? <circle cx={c.x} cy={c.y} r={r + 5 * k} fill="none" stroke="var(--muted)" strokeWidth={k} strokeDasharray={`${2 * k} ${2 * k}`} /> : null}
                  {visited ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--v3)" stroke="var(--card)" strokeWidth={2.5 * k} />
                  ) : planned ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--plan-bg)" stroke="var(--plan)" strokeWidth={2 * k} strokeDasharray={`${3 * k} ${2 * k}`} />
                  ) : (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--card)" stroke="#8A8378" strokeWidth={1.5 * k} />
                  )}
                  <text className="lb" x={c.x + r + 5 * k} y={c.y + 4 * k} fill={color} style={{ fontWeight: visited ? 600 : 500, fontSize: 12 * k, strokeWidth: 3 * k }}>
                    {t(c, lang)}
                    {c.approximate ? " ↗" : ""}
                  </text>
                </g>
              </Link>
            );
          })}
        </g>
        {pickMode && picked ? (
          <g pointerEvents="none">
            <circle cx={picked.x} cy={picked.y} r={14 * k} fill="none" stroke="var(--v3)" strokeWidth={2 * k} strokeDasharray={`${4 * k} ${3 * k}`} />
            <circle cx={picked.x} cy={picked.y} r={5 * k} fill="var(--v3)" stroke="var(--card)" strokeWidth={2 * k} />
          </g>
        ) : null}
      </svg>
    <MapZoomControls className="absolute bottom-2 right-2" scale={zoom.scale} maxScale={zoom.maxScale} zoomed={zoom.zoomed} onZoomIn={zoom.zoomIn} onZoomOut={zoom.zoomOut} onReset={zoom.reset} />
    </div>
  );
}
