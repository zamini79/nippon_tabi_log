import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { MapCard } from "@/components/map/MapCard";
import type { MapCity, MapPrefecture } from "@/components/map/JapanMap";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTrips, getUser } from "@/lib/data";
import { formatRange, daysUntil, yearOf } from "@/lib/format";
import { getNationalMap, OKINAWA_ID } from "@/lib/geo";
import { levelOf } from "@/lib/types";
import { OkinawaLabel, TripCities } from "./parts";

export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [prefectures, cities, prefStats, cityStats, trips] = await Promise.all([
    getPrefectures(),
    getCities(),
    getPrefectureStats(user.id),
    getCityStats(user.id),
    getTrips(user.id),
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
    };
  });

  const doneTrips = trips.filter((t) => t.status === "done");
  const plannedTrips = trips
    .filter((t) => t.status === "planned" && t.start_date && daysUntil(t.start_date) >= 0)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
  const nextTrip = plannedTrips[0] ?? null;

  const visitedCities = cityStats.filter((s) => s.visit_count > 0).length;
  const visitedPrefs = prefStats.filter((s) => s.visit_count > 0).length;
  const plannedOnlyPrefs = prefStats.filter((s) => s.visit_count === 0 && s.planned_count > 0).length;
  const firstYear = doneTrips.length
    ? Math.min(...doneTrips.map((t) => Number(yearOf(t.start_date) ?? 9999)))
    : null;
  const subtitle =
    doneTrips.length > 0 && firstYear && firstYear < 9999
      ? `${firstYear}년부터 · ${doneTrips.length}번의 여행`
      : "첫 여행을 기록해 보세요";

  const okinawa = prefById.get(OKINAWA_ID);

  return (
    <>
      <AppHeader subtitle={subtitle} userEmail={user.email} />
      <main className="grid gap-6 px-5 py-6 md:px-12 md:py-7 lg:grid-cols-[minmax(0,840px)_1fr] lg:gap-8">
        <MapCard
          width={map.width}
          height={map.height}
          inset={map.inset}
          prefectures={mapPrefectures}
          cities={mapCities}
          okinawaLabel={okinawa ? <OkinawaLabel prefecture={okinawa} /> : null}
        />

        <aside className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
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

          <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-card px-5 py-[18px]">
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

          <section id="plans" className="flex flex-col gap-2 rounded-2xl border border-dashed border-plan bg-plan-bg px-5 py-[18px]">
            <div className="flex items-center justify-between text-xs font-semibold tracking-[0.5px] text-plan">
              <span>다가오는 여행</span>
              {nextTrip?.start_date ? <span>D-{daysUntil(nextTrip.start_date)}</span> : null}
            </div>
            {nextTrip ? (
              <>
                <div className="serif text-xl font-bold">{nextTrip.title}</div>
                <div className="text-[13px] text-[#3F4A55]">
                  {formatRange(nextTrip.start_date, nextTrip.end_date)}
                  {nextTrip.companions ? ` · ${nextTrip.companions}명` : ""}
                </div>
              </>
            ) : (
              <div className="text-[13px] text-[#3F4A55]">
                아직 계획한 여행이 없어요.{" "}
                <Link href="/trips/new" className="font-medium text-plan underline-offset-2 hover:underline">
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
                {doneTrips.slice(0, 3).map((trip) => (
                  <li key={trip.id}>
                    <Link href={`/trips/${trip.id}`} className="grid grid-cols-[56px_1fr] items-center gap-3.5">
                      <div className="flex size-14 items-center justify-center rounded-[10px] bg-v2 text-[11px] text-card">사진</div>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-semibold">
                          <TripCities tripId={trip.id} fallback={trip.title} />
                        </div>
                        <div className="text-xs text-muted">{formatRange(trip.start_date, trip.end_date)}</div>
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
