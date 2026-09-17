import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PrefectureZoom, type ZoomCityView, type ZoomNeighborView } from "@/components/map/PrefectureZoom";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTrips, getUser } from "@/lib/data";
import { yearOf } from "@/lib/format";
import { getPrefectureZoom, prefectureIdFromCode } from "@/lib/geo";
import { levelOf } from "@/lib/types";
import { Breadcrumb, CityRow, LocalName, PrefectureTitle, RegionName, UnvisitedChip, NeighborSummary } from "./parts";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const id = prefectureIdFromCode(code);
  if (!id) return {};
  const prefectures = await getPrefectures();
  const p = prefectures.find((x) => x.id === id);
  return { title: p?.name_ko ?? code };
}

export default async function PrefecturePage({ params }: Props) {
  const { code } = await params;
  const id = prefectureIdFromCode(code);
  if (!id) notFound();

  const user = await getUser();
  if (!user) redirect("/login");

  const [prefectures, cities, prefStats, cityStats, trips] = await Promise.all([
    getPrefectures(),
    getCities(id),
    getPrefectureStats(user.id),
    getCityStats(user.id),
    getTrips(user.id),
  ]);
  const prefecture = prefectures.find((p) => p.id === id);
  if (!prefecture) notFound();

  const zoom = getPrefectureZoom(id);
  const prefById = new Map(prefectures.map((p) => [p.id, p]));
  const prefStatById = new Map(prefStats.map((s) => [s.prefecture_id, s]));
  const cityStatById = new Map(cityStats.map((s) => [s.city_id, s]));

  const stat = prefStatById.get(id);
  const level = levelOf(stat?.visit_count ?? 0, stat?.planned_count ?? 0);

  const neighbors: ZoomNeighborView[] = zoom.neighbors.flatMap((n) => {
    const p = prefById.get(n.id);
    return p ? [{ ...n, name_ko: p.name_ko, name_ko_short: p.name_ko_short, name_ja: p.name_ja }] : [];
  });

  const cityViews: ZoomCityView[] = cities.map((c) => {
    const [x, y] = zoom.project(c.lng, c.lat, c.prefecture_id);
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

  const visited = cityViews.filter((c) => c.visit_count > 0 || c.planned);
  const unvisited = cityViews.filter((c) => c.visit_count === 0 && !c.planned);

  const doneTrips = trips.filter((t) => t.status === "done");
  const stampYears = Array.from(
    new Set(doneTrips.map((t) => yearOf(t.start_date)).filter((y): y is string => Boolean(y))),
  ).slice(0, 4);
  const subtitle = doneTrips.length ? `${doneTrips.length}번의 여행` : "첫 여행을 기록해 보세요";

  return (
    <>
      <AppHeader subtitle={subtitle} userEmail={user.email} />
      <main className="flex flex-col gap-4 px-5 py-5 md:px-12 md:pb-9">
        <Breadcrumb prefecture={prefecture} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,840px)_1fr] lg:gap-8">
          <section className="relative flex flex-col rounded-[20px] border border-line bg-card p-4 md:px-6 md:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5">
                <Link href="/" className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-[13px] hover:bg-land-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 3 5 8l5 5" />
                  </svg>
                  전국
                </Link>
                <span className="rounded-lg border border-ink bg-ink px-3.5 py-2 text-[13px] text-bg">
                  <PrefectureTitle prefecture={prefecture} /> 확대
                </span>
              </div>
              <ul className="flex items-center gap-4 text-xs text-muted">
                <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full bg-v3" />다녀옴</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full border-2 border-dashed border-plan" />계획</li>
                <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full border-[1.5px] border-[#8A8378]" />아직</li>
              </ul>
            </div>
            <div className="mt-2.5">
              <PrefectureZoom
                width={zoom.width}
                height={zoom.height}
                target={{ d: zoom.target.d, level, name_ko: prefecture.name_ko, name_ja: prefecture.name_ja }}
                neighbors={neighbors}
                cities={cityViews}
              />
            </div>
            <div className="absolute bottom-5 right-6 hidden rounded-lg bg-bg px-3 py-2 text-xs text-muted md:block">
              이웃 현을 누르면 이동 · 도시 점을 누르면 기록으로
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card px-[22px] py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="serif text-[30px] font-bold tracking-[-0.5px]">
                    <PrefectureTitle prefecture={prefecture} />
                  </div>
                  <div className="text-[13px] text-muted">
                    <LocalName prefecture={prefecture} /> · <RegionName prefecture={prefecture} />
                  </div>
                </div>
                {stampYears.length > 0 ? (
                  <div className="flex gap-1.5">
                    {stampYears.map((y, i) => (
                      <div
                        key={y}
                        className="flex size-10 items-center justify-center rounded-full bg-v3 text-[10px] font-semibold text-card"
                        style={{ transform: `rotate(${[-6, 5, -2, 4][i % 4]}deg)` }}
                      >
                        {y}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Tile label="현 방문" value={`${stat?.visit_count ?? 0}회`} />
                <Tile label="다녀온 도시" value={String(stat?.city_count ?? 0)} />
                <Tile label="사진" value="0" />
              </div>
            </section>

            <section className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-card px-[22px] py-5">
              <div className="text-[13px] font-semibold">이 현의 도시</div>
              {visited.length === 0 ? (
                <p className="text-[13px] text-muted">아직 다녀온 도시가 없어요. 여행을 추가하면 여기에 쌓입니다.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visited.map((c) => (
                    <CityRow key={c.id} city={c} />
                  ))}
                </ul>
              )}
              <div className="mt-1 flex flex-col gap-2">
                <div className="text-xs text-muted">아직 안 간 곳</div>
                <div className="flex flex-wrap gap-1.5">
                  {unvisited.map((c) => (
                    <UnvisitedChip key={c.id} city={c} />
                  ))}
                  <Link href="/trips/new" className="rounded-full border border-dashed border-line px-2.5 py-[5px] text-xs text-muted hover:border-ink hover:text-ink">
                    + 도시 추가
                  </Link>
                </div>
              </div>
            </section>

            <section className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-[22px] py-4">
              <div className="flex flex-col gap-0.5">
                <div className="text-xs text-muted">이웃 현</div>
                <NeighborSummary
                  neighbors={neighbors.map((n) => ({
                    ...n,
                    visit_count: prefStatById.get(n.id)?.visit_count ?? 0,
                  }))}
                />
              </div>
              <Link href="/prefectures" className="shrink-0 text-[13px] font-medium text-v3">
                47현 보기 →
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] bg-bg px-3.5 py-3">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="serif text-[22px] font-bold">{value}</span>
    </div>
  );
}
