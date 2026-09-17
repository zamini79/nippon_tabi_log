import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CompleteTripButton } from "@/components/CompleteTripButton";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { TripThumb } from "@/components/TripThumb";
import { getPhotosForTrips, withSignedUrls } from "@/lib/photos";
import { getTripsWithCities } from "@/lib/data";
import { daysUntil, formatRange } from "@/lib/format";
import type { PhotoView, TripWithCities } from "@/lib/types";
import { CityNames } from "./parts";

export const metadata = { title: "여행 기록" };

type Sort = "date" | "created" | "title";
const SORTS: { key: Sort; label: string }[] = [
  { key: "date", label: "여행 날짜순" },
  { key: "created", label: "최근 추가순" },
  { key: "title", label: "이름순" },
];

export default async function TripsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: sortRaw } = await searchParams;
  const sort: Sort = sortRaw === "created" || sortRaw === "title" ? sortRaw : "date";
  const trips = await getTripsWithCities();
  const done = trips
    .filter((t) => t.status === "done")
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "ko");
      if (sort === "created") return (a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1;
      return (a.start_date ?? "") < (b.start_date ?? "") ? 1 : -1;
    });
  const photos = await withSignedUrls(await getPhotosForTrips(done.map((t) => t.id)));
  const planned = trips
    .filter((t) => t.status === "planned")
    .sort((a, b) => (a.start_date ?? "9999") < (b.start_date ?? "9999") ? -1 : 1);
  const subtitle = done.length ? `${done.length}번의 여행` : "첫 여행을 기록해 보세요";

  return (
    <>
      <AppHeader subtitle={subtitle} />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-5 py-6 md:px-12 md:py-7">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="serif text-[32px] font-bold tracking-[-0.5px]">여행 기록</h1>
            <p className="text-[13px] text-muted">다녀온 여행 {done.length} · 계획 {planned.length}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/trips/new?status=planned" className="rounded-[10px] border border-plan px-4 py-2.5 text-sm font-semibold text-plan hover:bg-plan-bg">
              계획 추가
            </Link>
            <Link href="/trips/new" className="rounded-[10px] bg-v3 px-4 py-2.5 text-sm font-semibold text-card hover:brightness-95">
              여행 추가
            </Link>
          </div>
        </div>

        {planned.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-plan">계획 중</h2>
              <Link href="/plans" className="text-xs text-plan hover:underline">
                계획 화면에서 보기 →
              </Link>
            </div>
            <ul className="flex flex-col gap-2.5">
              {planned.map((trip) => (
                <TripRow key={trip.id} trip={trip} photos={photos} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">다녀온 여행</h2>
            <div className="flex gap-1 rounded-full bg-land-0 p-[3px]" role="group" aria-label="정렬">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={s.key === "date" ? "/trips" : `/trips?sort=${s.key}`}
                  className={`rounded-full px-3 py-1 text-xs ${sort === s.key ? "bg-ink font-semibold text-bg" : "text-muted hover:text-ink"}`}
                  aria-current={sort === s.key ? "true" : undefined}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
          {done.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-sm text-muted">
              아직 기록이 없어요. 첫 여행을 추가하면 지도에 도시와 현이 채워져요.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {done.map((trip) => (
                <TripRow key={trip.id} trip={trip} photos={photos} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function TripRow({ trip, photos }: { trip: TripWithCities; photos: PhotoView[] }) {
  const cities = trip.visits.map((v) => v.city);
  const planned = trip.status === "planned";
  const dday = planned && trip.start_date ? daysUntil(trip.start_date) : null;
  return (
    <li
      className={`grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3.5 sm:grid-cols-[56px_1fr_auto] ${
        planned ? "border border-dashed border-plan bg-plan-bg" : "border border-line bg-card"
      }`}
    >
      <TripThumb trip={trip} photos={photos} planned={planned} dday={dday} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link href={cities[0] ? `/cities/${cities[0].id}` : `/trips/${trip.id}/edit`} className="truncate text-[15px] font-semibold hover:text-v3">
          {trip.title}
        </Link>
        <div className="truncate text-xs text-muted">
          <CityNames cities={cities} fallback="도시 없음" />
          {" · "}
          {formatRange(trip.start_date, trip.end_date)}
          {trip.companions ? ` · ${trip.companions}명` : ""}
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
        {planned ? <CompleteTripButton tripId={trip.id} small /> : null}
        <Link href={`/trips/${trip.id}/edit`} className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-bg hover:text-ink">
          수정
        </Link>
        <DeleteTripButton tripId={trip.id} title={trip.title} />
      </div>
    </li>
  );
}
