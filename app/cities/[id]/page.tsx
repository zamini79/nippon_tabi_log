import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { deleteCity } from "@/app/cities/actions";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { StampRow, type Stamp } from "@/components/StampRow";
import { getCity, getPrefectureStats, getPrefectures, getTripsForCity, getTripsWithCities } from "@/lib/data";
import { formatRange } from "@/lib/format";
import { getPhotosForTrips, photosForCityInTrip, withSignedUrls } from "@/lib/photos";
import { CityBreadcrumb, CityName, CitySubtitle, CompanionChips, NextIdeaText, PrefectureFilled } from "./parts";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const city = await getCity(id);
  return { title: city?.name_ko ?? "도시" };
}

function ym(date: string | null) {
  if (!date) return { year: "미정", month: undefined };
  const d = new Date(date);
  return { year: String(d.getFullYear()), month: String(d.getMonth() + 1).padStart(2, "0") };
}
function ymd(date: string | null) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CityPage({ params }: Props) {
  const { id } = await params;
  const city = await getCity(id);
  if (!city) notFound();

  const [prefectures, prefStats, trips, allTrips] = await Promise.all([
    getPrefectures(),
    getPrefectureStats(),
    getTripsForCity(id),
    getTripsWithCities(),
  ]);
  const prefecture = prefectures.find((p) => p.id === city.prefecture_id);
  if (!prefecture) notFound();

  const done = trips.filter((t) => t.status === "done");
  const planned = trips.filter((t) => t.status === "planned");
  const doneAll = allTrips.filter((t) => t.status === "done");

  const photos = await withSignedUrls(await getPhotosForTrips(done.map((t) => t.id)));
  const visitOf = (tripId: string) => trips.find((t) => t.id === tripId)?.visits.find((v) => v.city.id === city.id)?.id ?? null;
  const cityPhotoCount = done.reduce((n, t) => n + photosForCityInTrip(photos, t.id, visitOf(t.id)).length, 0);

  const stamps: Stamp[] = [
    ...done.map((t) => ({ key: t.id, ...ym(t.start_date) })),
    ...planned.map((t) => ({ key: t.id, ...ym(t.start_date), planned: true })),
  ];
  const first = done[0]?.start_date ?? null;
  const last = done.length ? done[done.length - 1].end_date ?? done[done.length - 1].start_date : null;

  const prefStat = prefStats.find((s) => s.prefecture_id === prefecture.id);
  const regionPrefs = prefectures.filter((p) => p.region === prefecture.region);
  const regionDone = regionPrefs.filter((p) => (prefStats.find((s) => s.prefecture_id === p.id)?.visit_count ?? 0) > 0).length;

  const subtitle = doneAll.length ? `${doneAll.length}번의 여행` : "첫 여행을 기록해 보세요";

  return (
    <>
      <AppHeader subtitle={subtitle} />
      <main className="flex flex-col gap-6 px-5 py-6 md:px-12 md:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <CityBreadcrumb city={city} prefecture={prefecture} />
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="serif text-[36px] font-bold tracking-[-1px] md:text-[44px]">
                <CityName city={city} />
              </h1>
              <div className="text-base text-muted">
                <CitySubtitle city={city} prefecture={prefecture} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted">
              {city.is_custom ? <span className="rounded-full border border-line px-2 py-0.5 text-xs">직접 추가한 도시</span> : null}
              {first ? (
                <>
                  <span>첫 방문 {ymd(first)}</span>
                  <span>·</span>
                  <span>마지막 {ymd(last)}</span>
                </>
              ) : (
                <span>아직 방문 기록이 없어요</span>
              )}
              <span>·</span>
              <span>사진 {cityPhotoCount}장</span>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="text-[13px] text-muted">방문</div>
            <StampRow stamps={stamps} addHref={`/trips/new?city=${city.id}`} />
            <div className="serif ml-1 text-[30px] font-bold">
              {done.length}
              <span className="text-[15px] font-normal text-muted">회</span>
            </div>
          </div>
        </div>

        {done.length === 0 ? (
          <section className="flex flex-col items-start gap-3 rounded-[18px] border border-dashed border-line bg-card px-6 py-8">
            <div className="serif text-xl font-bold">아직 이 도시의 기록이 없어요</div>
            <p className="text-sm text-muted">다녀온 여행을 추가하면 이 도시에 스탬프가 찍히고 지도에 점이 생겨요.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/trips/new?city=${city.id}`} className="rounded-[10px] bg-v3 px-4 py-2.5 text-sm font-semibold text-card hover:brightness-95">
                다녀온 여행 기록
              </Link>
              <Link href={`/trips/new?city=${city.id}&status=planned`} className="rounded-[10px] border border-plan px-4 py-2.5 text-sm font-semibold text-plan hover:bg-plan-bg">
                계획에 넣기
              </Link>
              {city.is_custom && trips.length === 0 ? (
                <form action={deleteCity}>
                  <input type="hidden" name="id" value={city.id} />
                  <button type="submit" className="rounded-[10px] px-4 py-2.5 text-sm text-muted hover:text-v3">
                    이 도시 삭제
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {done.map((trip, i) => {
              const companions = trip.visits.map((v) => v.city).filter((c) => c.id !== city.id);
              const myVisitId = visitOf(trip.id);
              const tripPhotos = photosForCityInTrip(photos, trip.id, myVisitId);
              const visits = trip.visits.map((v) => ({ id: v.id, city: v.city }));
              return (
                <article key={trip.id} className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-card p-[22px]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold tracking-[0.5px] text-v3">{i + 1}번째 방문</div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>사진 {tripPhotos.length}장</span>
                      <Link href={`/trips/${trip.id}/edit`} className="hover:text-ink">
                        수정
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="serif text-xl font-bold">{trip.title}</div>
                    <div className="text-[13px] text-muted">
                      {formatRange(trip.start_date, trip.end_date)}
                    </div>
                  </div>
                  {tripPhotos.length ? <PhotoGrid photos={tripPhotos} visits={visits} /> : null}
                  <PhotoUploader tripId={trip.id} visits={visits} defaultVisitId={myVisitId} compact />
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-muted">함께 간 도시</div>
                    <div className="flex flex-wrap gap-1.5">
                      <CompanionChips cities={companions} self={city} />
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3F4A55]">{trip.memo?.trim() || "메모 없음. 나중에 채우기."}</p>
                </article>
              );
            })}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-plan bg-plan-bg px-5 py-[18px]">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-plan">
                다음에 <CityName city={city} /> 오면
              </div>
              {planned.length ? (
                <div className="text-sm">
                  {planned.map((t) => (
                    <div key={t.id}>
                      <Link href={`/trips/${t.id}/edit`} className="font-medium hover:text-plan">
                        {t.title}
                      </Link>
                      <span className="text-muted">
                        {" "}
                        · {formatRange(t.start_date, t.end_date)} ·{" "}
                        <NextIdeaText cities={t.visits.map((v) => v.city).filter((c) => c.id !== city.id)} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[#3F4A55]">아직 계획이 없어요. 가고 싶은 곳이 생기면 계획에 넣어 두세요.</div>
              )}
            </div>
            <Link href={`/trips/new?city=${city.id}&status=planned`} className="shrink-0 rounded-lg bg-plan px-3.5 py-[9px] text-[13px] font-semibold text-card hover:brightness-95">
              계획에 넣기
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-[18px]">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted">이 도시로 채운 현</div>
              <div className="text-sm font-semibold">
                <PrefectureFilled prefecture={prefecture} visitCount={prefStat?.visit_count ?? 0} regionDone={regionDone} regionTotal={regionPrefs.length} />
              </div>
            </div>
            <Link href={`/prefectures/${prefecture.code}`} className="shrink-0 text-[13px] font-medium text-v3">
              현 지도에서 보기 →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
