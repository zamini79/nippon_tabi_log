import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { JapanMap, type MapPrefecture } from "@/components/map/JapanMap";
import { getPrefectureStats, getPrefectures, getTrips, getUser } from "@/lib/data";
import { getNationalMap, OKINAWA_ID } from "@/lib/geo";
import { levelOf } from "@/lib/types";
import { OkinawaLabel } from "../(map)/parts";

export const metadata = { title: "47현 채우기" };

/** 3 · 47현 채우기 — 마일스톤 1에서는 choropleth 지도까지. 지방별 진행·다음 목표는 마일스톤 4. */
export default async function PrefecturesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [prefectures, prefStats, trips] = await Promise.all([
    getPrefectures(),
    getPrefectureStats(user.id),
    getTrips(user.id),
  ]);
  const map = getNationalMap();
  const prefById = new Map(prefectures.map((p) => [p.id, p]));
  const statById = new Map(prefStats.map((s) => [s.prefecture_id, s]));

  const mapPrefectures: MapPrefecture[] = map.prefectures.map((g) => {
    const p = prefById.get(g.id);
    const s = statById.get(g.id);
    return {
      ...g,
      name_ko: p?.name_ko ?? "",
      name_ko_short: p?.name_ko_short ?? "",
      name_ja: p?.name_ja ?? "",
      visit_count: s?.visit_count ?? 0,
      level: levelOf(s?.visit_count ?? 0, s?.planned_count ?? 0),
    };
  });
  const visited = prefStats.filter((s) => s.visit_count > 0).length;
  const doneTrips = trips.filter((t) => t.status === "done").length;
  const okinawa = prefById.get(OKINAWA_ID);

  return (
    <>
      <AppHeader subtitle={doneTrips ? `${doneTrips}번의 여행` : "첫 여행을 기록해 보세요"} userEmail={user.email} />
      <main className="grid gap-6 px-5 py-6 md:px-12 md:py-7 lg:grid-cols-[minmax(0,840px)_1fr] lg:gap-8">
        <section className="rounded-[20px] border border-line bg-card p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="serif text-xl font-bold">47현 채우기</div>
            <ul className="flex items-center gap-4 text-xs text-muted">
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-v1" />1회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-v2" />2회</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-v3" />3회+</li>
              <li className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border border-dashed border-plan bg-plan-bg" />계획</li>
            </ul>
          </div>
          <JapanMap
            width={map.width}
            height={map.height}
            inset={map.inset}
            prefectures={mapPrefectures}
            cities={[]}
            mode="prefectures"
            okinawaLabel={okinawa ? <OkinawaLabel prefecture={okinawa} /> : null}
            className="mt-2"
          />
        </section>
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-2xl bg-ink px-[18px] pb-4 pt-[18px] text-bg">
            <div className="text-xs text-sand">채운 현</div>
            <div className="serif text-[34px] font-bold leading-none">
              {visited}
              <span className="text-base font-normal text-sand"> / 47</span>
            </div>
          </div>
          <p className="text-[13px] text-muted">지방별 진행 바와 다음 목표 제안은 마일스톤 4에서 추가됩니다.</p>
        </aside>
      </main>
    </>
  );
}
