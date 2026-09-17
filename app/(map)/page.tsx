import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MapCard } from "@/components/map/MapCard";
import type { MapCity, MapPrefecture } from "@/components/map/JapanMap";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTripsWithCities } from "@/lib/data";
import { formatRange, daysUntil, yearOf } from "@/lib/format";
import { getNationalMap, OKINAWA_ID } from "@/lib/geo";
import { levelOf } from "@/lib/types";
import { CompleteTripButton } from "@/components/CompleteTripButton";
import { TripThumb } from "@/components/TripThumb";
import { newPrefectureIdsForTrip, toStatMap } from "@/lib/goal";
import { PrefNames } from "@/app/plans/parts";
import { getPhotosForTrips, withSignedUrls } from "@/lib/photos";
import { OkinawaLabel } from "./parts";
import { CityNames } from "@/app/trips/parts";

export default async function HomePage() {
  const [prefectures, cities, prefStats, cityStats, trips] = await Promise.all([
    getPrefectures(),
    getCities(),
    getPrefectureStats(),
    getCityStats(),
    getTripsWithCities(),
  ]);
  const map = getNationalMap();

  const prefStatById = new Map(prefStats.map((s) => [s.prefecture_id, s]));
  const cityStatById = new Map(cityStats.map((s) => [s.city_id, s]));
  const prefById = new Map(prefectures.map((p) => [p.id, p]));

  const mapPrefectures: MapPrefecture[] = map.prefectures.map((g) => {
    const p = prefById.get(g.id);
    const s = prefStatById.get(g.id);
    return {
      ...g,
      name_ko: p?.name_ko ?? "",
      name_ko_short: p?.name_ko_short ?? "",
      name_ja: p?.name_ja ?? "",
      visit_count: s?.visit_count ?? 0,
      level: levelOf(s?.visit_count ?? 0, s?.planned_count ?? 0),
    };
  });

  const mapCities: MapCity[] = cities.map((c) => {
    const [x, y] = map.project(c.lng, c.lat, c.prefecture_id);
    const s = cityStatById.get(c.id);
    return {
      id: c.id,
      x,
      y,
      name_ko: c.name_ko,
      name_ja: c.name_ja,
      visit_count: s?.visit_count ?? 0,
      planned: (s?.planned_count ?? 0) > 0,
      approximate: map.isApproximate(c.lng, c.lat, c.prefecture_id),
    };
  });

  const doneTrips = trips.filter((t) => t.status === "done");
  const recent = doneTrips.slice(0, 3);
  const recentPhotos = await withSignedUrls(await getPhotosForTrips(recent.map((t) => t.id)));
  const plannedTrips = trips
    .filter((t) => t.status === "planned" && t.start_date && daysUntil(t.start_date) >= 0)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  const nextTrip = plannedTrips[0] ?? null;
  const overdue = trips.filter((t) => t.status === "planned" && t.start_date && daysUntil(t.start_date) < 0);
  const statMap = toStatMap(prefStats);
  const nextNewPrefs = nextTrip ? newPrefectureIdsForTrip(nextTrip, statMap).map((id) => prefById.get(id)!).filter(Boolean) : [];

  const visitedCities = cityStats.filter((s) => s.visit_count > 0).length;
  const visitedPrefs = prefStats.filter((s) => s.visit_count > 0).length;
  const plannedOnlyPrefs = prefStats.filter((s) => s.visit_count === 0 && s.planned_count > 0).length;
  const firstYear = doneTrips.length
    ? Math.min(...doneTrips.map((t) => Number(yearOf(t.start_date) ?? 9999)))
    : null;
  const subtitle =
    doneTrips.length > 0 && firstYear && firstYear < 9999
      ? `${visitedCities}개 도시 · ${visitedPrefs}/47현 · ${doneTrips.length}번의 여행`
      : "첫 여행을 기록해 보세요";

  // 여행 중이거나 최근 2주 안에 끝난 여행 → 모바일에서 사진 올리기 바로가기
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeTrip =
    doneTrips.find((t) => t.start_date && daysUntil(t.start_date) <= 0 && (!t.end_date || daysUntil(t.end_date) >= -14)) ?? null;

  const okinawa = prefById.get(OKINAWA_ID);

  return (
    <>
      <AppHeader subtitle={subtitle} />
      <main className="grid gap-6 px-5 py-6 md:px-12 md:py-7 lg:grid-cols-[minmax(0,840px)_1fr] lg:gap-8">
        <MapCard
          width={map.width}
          height={map.height}
          inset={map.inset}
          prefectures={mapPrefectures}
          cities={mapCities}
          okinawaLabel={okinawa ? <OkinawaLabel prefecture={okinawa} /> : null}
        />

        <aside className="flex flex-col gap-4 md:gap-5">
          {activeTrip ? (
            <Link
              href={`/trips/${activeTrip.id}/edit#photos`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-v3 px-4 py-3.5 text-card md:hidden"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-[11px] opacity-80">{activeTrip.end_date && daysUntil(activeTrip.end_date) >= 0 ? "여행 중" : "최근 여행"}</span>
                <span className="truncate text-sm font-semibold">{activeTrip.title} 사진 올리기</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 11V3M4.5 6.5L8 3l3.5 3.5M2.5 11.5v1.5h11v-1.5" />
              </svg>
            </Link>
          ) : null}

          {/* 모바일 요약 행: 47현 + 다음 여행 */}
          <div className="grid grid-cols-[1fr_150px] gap-2 md:hidden">
            <Link href="/prefectures" className="flex flex-col gap-1.5 rounded-[14px] bg-ink px-4 py-3.5 text-bg">
              <span className="text-[11px] text-sand">47현 채우기</span>
              <span className="serif text-[26px] font-bold leading-none">
                {visitedPrefs}
                <span className="text-[13px] font-normal text-sand"> / 47</span>
              </span>
              <span className="flex h-1.5 overflow-hidden rounded-full bg-[#3A424A]">
                <span className="bg-v3" style={{ width: `${(visitedPrefs / 47) * 100}%` }} />
                <span className="bg-[#8FB3D0]" style={{ width: `${(plannedOnlyPrefs / 47) * 100}%` }} />
              </span>
            </Link>
            <Link href="/plans" className="flex flex-col gap-1 rounded-[14px] border border-dashed border-plan bg-plan-bg px-3.5 py-3.5">
              {nextTrip ? (
                <>
                  <span className="text-[11px] font-semibold text-plan">다음 여행 {nextTrip.start_date ? `D-${daysUntil(nextTrip.start_date)}` : ""}</span>
                  <span className="serif line-clamp-2 text-[15px] font-bold leading-tight">{nextTrip.title}</span>
                  <span className="text-[11px] text-[#3F4A55]">{nextTrip.start_date?.slice(0, 7).replace("-", ".") ?? "날짜 미정"}</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-semibold text-plan">다음 여행</span>
                  <span className="text-[13px] text-[#3F4A55]">계획을 넣어 보세요</span>
                </>
              )}
            </Link>
          </div>

          <div className="hidden grid-cols-3 gap-3 md:grid">
            <Stat label="다녀온 도시" value={visitedCities} />
            <Stat label="여행 횟수" value={doneTrips.length} />
            <div className="flex flex-col gap-1 rounded-2xl bg-ink px-[18px] pb-4 pt-[18px] text-bg">
              <div className="text-xs text-sand">채운 현</div>
              <div className="serif text-[34px] font-bold leading-none">
                {visitedPrefs}
                <span className="text-base font-normal text-sand"> / 47</span>
              </div>
            </div>
          </div>

          <section className="hidden flex-col gap-2.5 rounded-2xl border border-line bg-card px-5 py-[18px] md:flex">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">47현 채우기</span>
              <Link href="/prefectures" className="font-medium text-v3">
                현 별 지도 보기 →
              </Link>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-land-0" role="progressbar" aria-valuenow={visitedPrefs} aria-valuemin={0} aria-valuemax={47}>
              <div className="bg-v3" style={{ width: `${(visitedPrefs / 47) * 100}%` }} />
              <div className="bg-plan" style={{ width: `${(plannedOnlyPrefs / 47) * 100}%` }} />
            </div>
            <div className="flex gap-3.5 text-xs text-muted">
              <span>
                <span className="font-semibold text-v3">{visitedPrefs}</span> 다녀옴
              </span>
              <span>
                <span className="font-semibold text-plan">{plannedOnlyPrefs}</span> 계획 중
              </span>
              <span>{47 - visitedPrefs - plannedOnlyPrefs} 남음</span>
            </div>
          </section>

          <section id="plans" className="hidden flex-col gap-2 rounded-2xl border border-dashed border-plan bg-plan-bg px-5 py-[18px] md:flex">
            <div className="flex items-center justify-between text-xs font-semibold tracking-[0.5px] text-plan">
              <Link href="/plans" className="hover:underline">다가오는 여행</Link>
              {nextTrip?.start_date ? <span>D-{daysUntil(nextTrip.start_date)}</span> : plannedTrips.length + overdue.length > 0 ? <Link href="/plans" className="font-medium hover:underline">전체 계획 →</Link> : null}
            </div>
            {nextTrip ? (
              <>
                <Link href={`/trips/${nextTrip.id}/edit`} className="serif text-xl font-bold hover:text-plan">
                  {nextTrip.title}
                </Link>
                <div className="text-[13px] text-[#3F4A55]">
                  {formatRange(nextTrip.start_date, nextTrip.end_date)}
                  {nextTrip.companions ? ` · ${nextTrip.companions}명` : ""}
                  {nextTrip.visits.length ? (
                    <>
                      {" · "}
                      <CityNames cities={nextTrip.visits.map((v) => v.city)} />
                    </>
                  ) : null}
                </div>
                {nextNewPrefs.length ? (
                  <div className="text-xs text-plan">
                    <PrefNames prefectures={nextNewPrefs} /> 첫 방문
                  </div>
                ) : null}
                {plannedTrips.length > 1 ? (
                  <Link href="/plans" className="text-xs text-plan hover:underline">
                    계획 {plannedTrips.length}개 모두 보기 →
                  </Link>
                ) : null}
              </>
            ) : overdue.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[13px] text-[#3F4A55]">
                  <span className="font-semibold">{overdue[0].title}</span> 출발일이 지났어요. 다녀오셨나요?
                </div>
                <CompleteTripButton tripId={overdue[0].id} small />
              </div>
            ) : (
              <div className="text-[13px] text-[#3F4A55]">
                아직 계획한 여행이 없어요.{" "}
                <Link href="/trips/new?status=planned" className="font-medium text-plan underline-offset-2 hover:underline">
                  계획 추가
                </Link>
              </div>
            )}
          </section>

          <section className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-card px-5 py-[18px]">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">최근 여행</span>
              <Link href="/trips" className="text-muted">
                전체 보기
              </Link>
            </div>
            {doneTrips.length === 0 ? (
              <p className="text-[13px] text-muted">
                다녀온 여행을 추가하면 지도에 도시와 현이 채워져요.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recent.map((trip) => (
                  <li key={trip.id}>
                    <Link
                      href={trip.visits[0] ? `/cities/${trip.visits[0].city.id}` : `/trips/${trip.id}/edit`}
                      className="grid grid-cols-[56px_1fr] items-center gap-3.5"
                    >
                      <TripThumb trip={trip} photos={recentPhotos} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="truncate text-sm font-semibold">
                          <CityNames cities={trip.visits.map((v) => v.city)} fallback={trip.title} />
                        </div>
                        <div className="truncate text-xs text-muted">
                          {trip.title} · {formatRange(trip.start_date, trip.end_date)}
                          {recentPhotos.some((p) => p.trip_id === trip.id) ? ` · ${recentPhotos.filter((p) => p.trip_id === trip.id).length}장` : ""}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-[18px] pb-4 pt-[18px]">
      <div className="text-xs text-muted">{label}</div>
      <div className="serif text-[34px] font-bold leading-none">{value}</div>
    </div>
  );
}
