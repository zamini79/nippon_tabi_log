import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CompleteTripButton } from "@/components/CompleteTripButton";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { getPrefectureStats, getPrefectures, getTripsWithCities } from "@/lib/data";
import { daysUntil, formatRange } from "@/lib/format";
import { newPrefectureIdsForTrip, toStatMap } from "@/lib/goal";
import { CityNames } from "@/app/trips/parts";
import { PrefNames } from "./parts";

export const metadata = { title: "앞으로의 계획" };

/** 계획 중인 여행 모아보기: D-day, 도시, 새로 채워질 현, 다녀왔어요 전환 */
export default async function PlansPage() {
  const [trips, prefectures, prefStats] = await Promise.all([getTripsWithCities(), getPrefectures(), getPrefectureStats()]);
  const stats = toStatMap(prefStats);
  const prefById = new Map(prefectures.map((p) => [p.id, p]));
  const done = trips.filter((t) => t.status === "done");
  const planned = trips
    .filter((t) => t.status === "planned")
    .sort((a, b) => ((a.start_date ?? "9999") < (b.start_date ?? "9999") ? -1 : 1));
  const upcoming = planned.filter((t) => !t.start_date || daysUntil(t.start_date) >= 0);
  const past = planned.filter((t) => t.start_date && daysUntil(t.start_date) < 0);
  const newPrefTotal = new Set(planned.flatMap((t) => newPrefectureIdsForTrip(t, stats))).size;

  return (
    <>
      <AppHeader subtitle={done.length ? `${done.length}번의 여행` : "첫 여행을 기록해 보세요"} />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-5 py-6 md:px-12 md:py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="serif text-[32px] font-bold tracking-[-0.5px]">앞으로의 계획</h1>
            <p className="text-[13px] text-muted">
              계획 중 {planned.length}개 · 다녀오면 새로 채워지는 현 <span className="font-semibold text-plan">{newPrefTotal}</span>
            </p>
          </div>
          <Link href="/trips/new?status=planned" className="rounded-[10px] bg-plan px-4 py-2.5 text-sm font-semibold text-card hover:brightness-95">
            계획 추가
          </Link>
        </div>

        {planned.length === 0 ? (
          <section className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-plan bg-plan-bg px-6 py-8">
            <div className="serif text-xl font-bold">아직 계획이 없어요</div>
            <p className="text-sm text-[#3F4A55]">가고 싶은 도시를 계획에 넣으면 지도에 점선으로 표시되고, D-day 를 세어 드려요.</p>
            <div className="flex gap-2">
              <Link href="/trips/new?status=planned" className="rounded-[10px] bg-plan px-4 py-2.5 text-sm font-semibold text-card hover:brightness-95">
                계획 추가
              </Link>
              <Link href="/prefectures" className="rounded-[10px] border border-plan px-4 py-2.5 text-sm font-semibold text-plan hover:bg-card">
                다음 목표 보기
              </Link>
            </div>
          </section>
        ) : null}

        {past.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold text-v3">출발일이 지났어요 — 다녀오셨나요?</h2>
            <ul className="flex flex-col gap-2.5">
              {past.map((trip) => (
                <PlanRow key={trip.id} trip={trip} newPrefs={newPrefectureIdsForTrip(trip, stats).map((id) => prefById.get(id)!).filter(Boolean)} past />
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold text-plan">다가오는 계획</h2>
            <ul className="flex flex-col gap-2.5">
              {upcoming.map((trip) => (
                <PlanRow key={trip.id} trip={trip} newPrefs={newPrefectureIdsForTrip(trip, stats).map((id) => prefById.get(id)!).filter(Boolean)} />
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

type Row = Awaited<ReturnType<typeof getTripsWithCities>>[number];

function PlanRow({ trip, newPrefs, past }: { trip: Row; newPrefs: { id: number; name_ko: string; name_ko_short: string; name_ja: string }[]; past?: boolean }) {
  const cities = trip.visits.map((v) => v.city);
  const dday = trip.start_date ? daysUntil(trip.start_date) : null;
  return (
    <li className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 md:flex-row md:items-center md:gap-5 ${past ? "border-line bg-card" : "border-dashed border-plan bg-plan-bg"}`}>
      <div className={`flex size-14 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold ${past ? "bg-bg text-muted" : "bg-card text-plan"}`}>
        {dday === null ? "미정" : dday >= 0 ? `D-${dday}` : `+${-dday}일`}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/trips/${trip.id}/edit`} className="truncate text-[15px] font-semibold hover:text-plan">
          {trip.title}
        </Link>
        <div className="truncate text-xs text-muted">
          <CityNames cities={cities} fallback="도시 없음" /> · {formatRange(trip.start_date, trip.end_date)}
          {trip.companions ? ` · ${trip.companions}명` : ""}
        </div>
        <div className="text-xs">
          {newPrefs.length ? (
            <span className={past ? "text-v3" : "text-plan"}>
              새로 채워지는 현: <PrefNames prefectures={newPrefs} />
            </span>
          ) : (
            <span className="text-muted">이미 다녀온 현만 포함돼요</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <CompleteTripButton tripId={trip.id} small />
        <Link href={`/trips/${trip.id}/edit`} className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-card hover:text-ink">
          수정
        </Link>
        <DeleteTripButton tripId={trip.id} title={trip.title} />
      </div>
    </li>
  );
}
