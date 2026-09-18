import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { JapanMap, type MapCity, type MapPrefecture } from "@/components/map/JapanMap";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTripsWithCities } from "@/lib/data";
import { getNationalMap, OKINAWA_ID } from "@/lib/geo";
import { newPrefectureIdsForTrip, pickNextGoal, summarizeRegions, toStatMap } from "@/lib/goal";
import { daysUntil } from "@/lib/format";
import { levelOf } from "@/lib/types";
import { OkinawaLabel } from "../(map)/parts";
import { NextGoalCard, PlannedGainText, RegionBoard } from "./parts";

export const metadata = { title: "47현 채우기" };

/** 3 · 47현 채우기: 전국 choropleth + 지방별 진행 바·47현 칩 + 규칙 기반 다음 목표 */
export default async function PrefecturesPage() {
  const [prefectures, prefStats, trips, cities, cityStats] = await Promise.all([
    getPrefectures(),
    getPrefectureStats(),
    getTripsWithCities(),
    getCities(),
    getCityStats(),
  ]);
  const map = getNationalMap();
  const prefById = new Map(prefectures.map((p) => [p.id, p]));
  const stats = toStatMap(prefStats);

  const mapPrefectures: MapPrefecture[] = map.prefectures.map((g) => {
    const p = prefById.get(g.id);
    const s = stats[g.id];
    return {
      ...g,
      name_ko: p?.name_ko ?? "",
      name_ko_short: p?.name_ko_short ?? "",
      name_ja: p?.name_ja ?? "",
      visit_count: s?.visit_count ?? 0,
      level: levelOf(s?.visit_count ?? 0, s?.planned_count ?? 0),
    };
  });

  // 확대하면 현 대신 시 경계를 색칠하기 위한 방문·계획 도시 (경계가 있는 것만 의미 있음)
  const cityStatById = new Map(cityStats.map((s) => [s.city_id, s]));
  const mapCities: MapCity[] = cities.flatMap((c) => {
    const s = cityStatById.get(c.id);
    if (!s || (s.visit_count === 0 && s.planned_count === 0)) return [];
    const [x, y] = map.project(c.lng, c.lat, c.prefecture_id);
    return [{ id: c.id, prefecture_id: c.prefecture_id, x, y, d: map.shapeFor(c.prefecture_id, c.name_ja) ?? undefined, name_ko: c.name_ko, name_ja: c.name_ja, visit_count: s.visit_count, planned: s.planned_count > 0 }];
  });

  const visited = prefectures.filter((p) => (stats[p.id]?.visit_count ?? 0) > 0).length;
  const visitedCities = prefStats.reduce((n, s) => n + (s.city_count ?? 0), 0);
  const plannedOnly = prefectures.filter((p) => (stats[p.id]?.visit_count ?? 0) === 0 && (stats[p.id]?.planned_count ?? 0) > 0).length;
  const doneTrips = trips.filter((t) => t.status === "done").length;

  // 가장 가까운 계획 여행이 새로 채우는 현
  const upcoming = trips
    .filter((t) => t.status === "planned" && t.start_date && daysUntil(t.start_date) >= 0)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))[0] ?? trips.find((t) => t.status === "planned") ?? null;
  const gainIds = upcoming ? newPrefectureIdsForTrip(upcoming, stats) : [];
  const gainPrefs = gainIds.map((id) => prefById.get(id)!).filter(Boolean);

  const regions = summarizeRegions(prefectures, stats);
  const goal = pickNextGoal(regions, stats);
  // 다음 목표 지방의 미방문 현에 있는 시드 도시 2개 (현 순서대로 첫 도시)
  const seedCities = goal
    ? goal.unvisited
        .map((p) => cities.find((c) => c.prefecture_id === p.id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .slice(0, 2)
    : [];

  const okinawa = prefById.get(OKINAWA_ID);
  const pct = Math.round((visited / 47) * 100);

  return (
    <>
      <AppHeader subtitle={doneTrips ? `${doneTrips}번의 여행` : "첫 여행을 기록해 보세요"} />
      <main className="grid gap-6 px-5 py-6 md:px-12 md:py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
        <section className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-card p-4 md:px-7 md:py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="serif text-[22px] font-bold">47현 채우기</div>
              <div className="text-[13px] text-muted">실제 현 경계 기준. 색이 짙을수록 여러 번 다녀온 곳</div>
            </div>
            <ul className="flex flex-wrap items-center gap-3.5 text-xs text-muted">
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] border border-line bg-land-0" />미방문</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v1" />1회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v2" />2회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] bg-v3" />3회+</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3.5 rounded-[4px] border-2 border-dashed border-plan bg-plan-bg" />계획</li>
            </ul>
          </div>
          <JapanMap
            width={map.width}
            height={map.height}
            inset={map.inset}
            prefectures={mapPrefectures}
            cities={mapCities}
            mode="prefectures"
            okinawaLabel={okinawa ? <OkinawaLabel prefecture={okinawa} /> : null}
          />
          <p className="text-right text-[10px] text-sand">시·구·정·촌 경계: 国土数値情報（行政区域データ）（国土交通省）을 가공</p>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-ink px-6 py-5 text-bg sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-baseline gap-2">
              <div className="serif text-[44px] font-bold leading-none">{visited}</div>
              <div className="text-base text-sand">
                / 47현{visitedCities > 0 ? <span className="ml-1.5 text-sm">· {visitedCities}시</span> : null}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-[#3A424A]" role="progressbar" aria-valuenow={visited} aria-valuemin={0} aria-valuemax={47}>
                <div className="bg-v3" style={{ width: `${pct}%` }} />
                <div className="bg-[#8FB3D0]" style={{ width: `${(plannedOnly / 47) * 100}%` }} />
              </div>
              <div className="text-xs text-sand">
                {upcoming ? (
                  <PlannedGainText title={upcoming.title} gain={gainPrefs.length} after={visited + gainPrefs.length} prefNames={gainPrefs} />
                ) : visited === 0 ? (
                  "첫 여행을 기록하면 여기가 채워져요"
                ) : (
                  <>
                    {pct}% 채웠어요 ·{" "}
                    <Link href="/trips/new?status=planned" className="underline underline-offset-2 hover:text-bg">
                      다음 계획 세우기
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <NextGoalCard goal={goal} seedCities={seedCities} />

          <section className="flex-1 rounded-2xl border border-line bg-card p-5">
            <RegionBoard regions={regions} stats={stats} />
          </section>
        </aside>
      </main>
    </>
  );
}
