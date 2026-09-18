"use client";

import { useState, type ReactNode } from "react";
import { JapanMap, type MapCity, type MapFilter, type MapPrefecture } from "./JapanMap";

type Props = {
  width: number;
  height: number;
  inset: { x: number; y: number; w: number; h: number };
  prefectures: MapPrefecture[];
  cities: MapCity[];
  okinawaLabel: ReactNode;
};

const FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "done", label: "다녀온 곳" },
  { key: "planned", label: "계획" },
];

/** 홈 지도 카드: 필터 + 범례 + 전국 지도 */
export function MapCard(props: Props) {
  const [filter, setFilter] = useState<MapFilter>("all");
  return (
    <section className="relative flex flex-col rounded-[18px] border border-line bg-card p-3 md:rounded-[20px] md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="group" aria-label="표시 필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-lg border px-3.5 py-2 text-[13px] ${
                filter === f.key ? "border-ink bg-ink font-medium text-bg" : "border-line bg-card hover:bg-land-0"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul className="hidden items-center gap-4 text-xs text-muted sm:flex">
          {filter === "done" ? (
            <>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v1" />현 1회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v2" />2회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v3" />3회+</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-v3" />도시</li>
            </>
          ) : filter === "planned" ? (
            <>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] border-2 border-dashed border-plan bg-plan-bg" />계획한 현</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full border-2 border-dashed border-plan" />계획한 도시</li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-v3" />1회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-full bg-v3" />2회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-[18px] rounded-full bg-v3" />3회 이상</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full border-2 border-dashed border-plan" />계획</li>
            </>
          )}
        </ul>
      </div>
      <JapanMap {...props} mode="cities" filter={filter} className="mt-1" />
      <p className="mt-1 text-right text-[10px] text-sand">시·구·정·촌 경계: 国土数値情報（行政区域データ）（国土交通省）을 가공</p>
    </section>
  );
}
