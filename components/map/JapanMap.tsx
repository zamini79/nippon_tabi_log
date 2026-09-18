"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useLang } from "@/lib/lang";
import { t, tShort } from "@/lib/names";
import type { Level } from "@/lib/types";
import { OkinawaInset } from "./OkinawaInset";
import { MapZoomControls } from "./MapZoomControls";
import { useMapZoom } from "./useMapZoom";

export type MapPrefecture = {
  id: number;
  code: string;
  d: string;
  labelX: number;
  labelY: number;
  bbox: [number, number, number, number];
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
/** 휠 최대 배율: 가장 작은 현(도쿄·오사카 등)이 화면에 꽉 차는 정도 */
const MAX_SCALE = 40;
/** 이 배율부터 현 확대 화면처럼 미방문 도시도 표시 */
const DETAIL_SCALE = 6;
/** 이 배율부터 화면 중심의 현을 '보고 있는 현'으로 판단 */
const FOCUS_SCALE = 2.5;

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
  const zoom = useMapZoom(width, height, MAX_SCALE);
  // 확대 배율의 역수: 점·글자·테두리는 화면 크기를 유지하고, 라벨 겹침 판정 거리도 화면 기준으로
  const k = 1 / zoom.scale;

  const onMove = (id: number) => (e: MouseEvent<Element>) => {
    const box = e.currentTarget.closest("[data-map-root]")?.getBoundingClientRect();
    if (!box) return;
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const hovered = hover ? prefectures.find((p) => p.id === hover.id) : null;

  // 화면 중심이 들어 있는 가장 작은 현 = 지금 보고 있는 현 (충분히 확대했을 때만)
  const center = { x: zoom.box.x + zoom.box.w / 2, y: zoom.box.y + zoom.box.h / 2 };
  const focused =
    zoom.scale >= FOCUS_SCALE
      ? prefectures
          .filter((p) => center.x >= p.bbox[0] && center.x <= p.bbox[2] && center.y >= p.bbox[1] && center.y <= p.bbox[3])
          .sort((a, b) => (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) - (b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]))[0] ?? null
      : null;

  const onPrefectureClick = (p: MapPrefecture) => {
    // 이미 그 현을 보고 있으면 현 화면으로, 아니면 그 현이 꽉 차게 확대
    if (focused?.id === p.id) router.push(`/prefectures/${p.code}`);
    else zoom.fitTo(p.bbox);
  };

  // 크게 확대하면 화면 안의 미방문 도시도 (현 확대 화면과 같은 모습)
  const detail = mode === "cities" && filter === "all" && zoom.scale >= DETAIL_SCALE;
  const m = zoom.box.w * 0.15;
  const inView = (c: MapCity) => c.x >= zoom.box.x - m && c.x <= zoom.box.x + zoom.box.w + m && c.y >= zoom.box.y - m && c.y <= zoom.box.y + zoom.box.h + m;
  // 화면 밖 현은 그리지 않는다 (크게 확대했을 때 47개 경로를 모두 래스터라이즈하지 않도록)
  const inViewBox = (b: [number, number, number, number]) =>
    b[2] >= zoom.box.x - m && b[0] <= zoom.box.x + zoom.box.w + m && b[3] >= zoom.box.y - m && b[1] <= zoom.box.y + zoom.box.h + m;
  const visiblePrefectures = zoom.zoomed ? prefectures.filter((p) => inViewBox(p.bbox)) : prefectures;
  const insetInView = !zoom.zoomed || inViewBox([inset.x, inset.y, inset.x + inset.w, inset.y + inset.h]);
  const visibleCities = cities.filter((c) => {
    if (filter === "done") return c.visit_count > 0;
    if (filter === "planned") return c.planned;
    return c.visit_count > 0 || c.planned || (detail && inView(c));
  });
  const cityLabelItems = visibleCities.map((c) => ({ x: c.x, y: c.y, weight: c.visit_count + (c.planned ? 0.5 : 0), id: c.id }));
  const cityLabels = new Set(Array.from(pickLabels(cityLabelItems, 64 * k, 14 * k)).map((i) => i.id));
  const prefLabelItems = prefectures.filter((p) => p.level !== 0).map((p) => ({ x: p.labelX, y: p.labelY, weight: p.visit_count, id: p.id }));
  const prefLabels = new Set(Array.from(pickLabels(prefLabelItems, 56 * k, 14 * k)).map((i) => i.id));

  return (
    <div data-map-root className={`relative ${className ?? ""}`}>
      {/* 데스크톱에서는 지도가 한 화면 안에 들어오도록 세로를 뷰포트 기준으로 제한 (비율 유지, 가운데 정렬) */}
      <svg
        ref={zoom.svgRef}
        viewBox={zoom.viewBox}
        className="block h-auto w-full select-none lg:max-h-[calc(100dvh-140px)]"
        role="img"
        aria-label="일본 지도"
        {...zoom.svgProps}
      >
        <g>
          {visiblePrefectures.map((p) => {
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
                  onPrefectureClick(p);
                }}
                onMouseMove={onMove(p.id)}
                onMouseLeave={() => setHover(null)}
                aria-label={t(p, lang)}
              >
                <path d={p.d} className={cls} vectorEffect="non-scaling-stroke" />
              </a>
            );
          })}
        </g>
        {insetInView ? <OkinawaInset inset={inset} label={okinawaLabel} k={k} /> : null}
        {mode === "prefectures" && (
          <g>
            {visiblePrefectures
              .filter((p) => p.level !== 0 && prefLabels.has(p.id))
              .map((p) => (
                <text key={p.id} className="lb" x={p.labelX} y={p.labelY} textAnchor="middle" fill={p.level === "plan" ? "var(--plan)" : "var(--ink)"} style={{ fontSize: 12 * k, strokeWidth: 3 * k }}>
                  {tShort(p, lang)}
                </text>
              ))}
          </g>
        )}
        {mode === "cities" && (
          <g>
            {visibleCities.map((c) => {
              const planned = c.visit_count === 0 && c.planned;
              const dim = c.visit_count === 0 && !c.planned; // 미방문 (크게 확대했을 때만 표시)
              const r = (dim ? 4.5 : planned ? 6 : radius(c.visit_count)) * k;
              return (
                <g key={c.id} className="cursor-pointer" onClick={() => router.push(`/cities/${c.id}`)}>
                  {c.approximate ? <circle cx={c.x} cy={c.y} r={r + 4 * k} fill="none" stroke="var(--muted)" strokeWidth={k} strokeDasharray={`${2 * k} ${2 * k}`} /> : null}
                  {dim ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--card)" stroke="#8A8378" strokeWidth={1.5 * k} />
                  ) : planned ? (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--plan-bg)" stroke="var(--plan)" strokeWidth={2 * k} strokeDasharray={`${3 * k} ${2 * k}`} />
                  ) : (
                    <circle cx={c.x} cy={c.y} r={r} fill="var(--v3)" stroke="var(--card)" strokeWidth={2 * k} />
                  )}
                  {cityLabels.has(c.id) ? (
                    <text className="lb" x={c.x + r + 4 * k} y={c.y + 4 * k} fill={dim ? "var(--muted)" : planned ? "var(--plan)" : "var(--ink)"} style={{ fontWeight: c.visit_count >= 3 ? 600 : 500, fontSize: 12 * k, strokeWidth: 3 * k }}>
                      {t(c, lang)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        )}
      </svg>

      <MapZoomControls className="absolute bottom-2 right-2" scale={zoom.scale} maxScale={zoom.maxScale} zoomed={zoom.zoomed} onZoomIn={zoom.zoomIn} onZoomOut={zoom.zoomOut} onReset={zoom.reset} />

      {focused ? (
        <div className="absolute left-2 top-2 flex items-center gap-3 rounded-xl border border-line bg-card/95 px-3.5 py-2 shadow-sm backdrop-blur">
          <div className="flex flex-col">
            <span className="serif text-[15px] font-bold leading-tight">{t(focused, lang)}</span>
            <span className="text-[11px] text-muted">
              {focused.visit_count > 0 ? `${focused.visit_count}번 방문` : focused.level === "plan" ? "계획 중" : "아직 미방문"}
            </span>
          </div>
          <Link href={`/prefectures/${focused.code}`} className="rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-bg hover:brightness-110">
            현 화면 →
          </Link>
        </div>
      ) : null}

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-3 py-2 text-xs text-bg shadow"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
          role="tooltip"
        >
          <div className="serif text-sm font-bold">{t(hovered, lang)}</div>
          <div className="text-sand">
            {hovered.visit_count > 0 ? `${hovered.visit_count}번 방문` : hovered.level === "plan" ? "계획 중" : "아직 미방문"} · {focused?.id === hovered.id ? "클릭하면 현 화면으로" : "클릭하면 확대"}
          </div>
        </div>
      )}
    </div>
  );
}
