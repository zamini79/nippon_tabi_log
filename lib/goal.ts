import type { CountStat, Prefecture, TripWithCities } from "./types";

/** 지방 표시 순서 (북 → 남) */
export const REGION_ORDER = ["hokkaido", "tohoku", "kanto", "chubu", "kansai", "chugoku", "shikoku", "kyushu"] as const;

export type RegionSummary = {
  region: string;
  region_ko: string;
  region_ja: string;
  prefectures: Prefecture[];
  done: number;
  planned: number; // 방문 0 · 계획만 있는 현
  total: number;
};

export function summarizeRegions(prefectures: Prefecture[], stats: Record<number, CountStat>): RegionSummary[] {
  return REGION_ORDER.map((region) => {
    const prefs = prefectures.filter((p) => p.region === region).sort((a, b) => a.id - b.id);
    const done = prefs.filter((p) => (stats[p.id]?.visit_count ?? 0) > 0).length;
    const planned = prefs.filter((p) => (stats[p.id]?.visit_count ?? 0) === 0 && (stats[p.id]?.planned_count ?? 0) > 0).length;
    return {
      region,
      region_ko: prefs[0]?.region_ko ?? region,
      region_ja: prefs[0]?.region_ja ?? region,
      prefectures: prefs,
      done,
      planned,
      total: prefs.length,
    };
  }).filter((r) => r.total > 0);
}

export type NextGoal = {
  region: RegionSummary;
  /** 이 지방에서 아직 안 간 현 (계획 중 제외), id 순 */
  unvisited: Prefecture[];
};

/**
 * 규칙 기반 "다음 목표": 미방문 현(계획 중 제외)이 가장 많이 몰린 지방 하나.
 * 동률이면 이미 한 곳이라도 다녀온 지방(이어서 채우기 쉬운 곳)을 우선, 그다음 북쪽부터.
 */
export function pickNextGoal(regions: RegionSummary[], stats: Record<number, CountStat>): NextGoal | null {
  let best: NextGoal | null = null;
  for (const region of regions) {
    const unvisited = region.prefectures.filter(
      (p) => (stats[p.id]?.visit_count ?? 0) === 0 && (stats[p.id]?.planned_count ?? 0) === 0,
    );
    if (unvisited.length === 0) continue;
    if (
      !best ||
      unvisited.length > best.unvisited.length ||
      (unvisited.length === best.unvisited.length && region.done > best.region.done)
    ) {
      best = { region, unvisited };
    }
  }
  return best;
}

/** 이 여행(계획)으로 새로 채워지는 현 id 목록 */
export function newPrefectureIdsForTrip(trip: TripWithCities, stats: Record<number, CountStat>): number[] {
  const ids = Array.from(new Set(trip.visits.map((v) => v.city.prefecture_id)));
  return ids.filter((id) => (stats[id]?.visit_count ?? 0) === 0);
}

export function toStatMap(rows: { prefecture_id: number; visit_count: number; planned_count: number }[]): Record<number, CountStat> {
  const m: Record<number, CountStat> = {};
  for (const r of rows) m[r.prefecture_id] = { visit_count: r.visit_count, planned_count: r.planned_count };
  return m;
}
