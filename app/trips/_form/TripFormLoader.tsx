import { notFound } from "next/navigation";
import { TripForm } from "@/components/TripForm";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTrip } from "@/lib/data";
import type { CityWithPrefecture, CountStat, TripStatus } from "@/lib/types";

type Props = {
  tripId?: string;
  defaultCityIds?: string[];
  defaultStatus?: TripStatus;
  cancelHref: string;
  inModal?: boolean;
};

/** 폼에 필요한 참조 데이터를 모아 TripForm 에 넘기는 서버 컴포넌트 (페이지·모달 공용) */
export async function TripFormLoader({ tripId, defaultCityIds, defaultStatus, cancelHref, inModal }: Props) {
  const [prefectures, cities, cityStats, prefStats, trip] = await Promise.all([
    getPrefectures(),
    getCities(),
    getCityStats(),
    getPrefectureStats(),
    tripId ? getTrip(tripId) : Promise.resolve(null),
  ]);
  if (tripId && !trip) notFound();

  const prefById = new Map(prefectures.map((p) => [p.id, p]));
  const citiesWithPref: CityWithPrefecture[] = cities
    .map((c) => ({ ...c, prefecture: prefById.get(c.prefecture_id)! }))
    .filter((c) => c.prefecture);

  const cityStatMap: Record<string, CountStat> = {};
  for (const s of cityStats) cityStatMap[s.city_id] = { visit_count: s.visit_count, planned_count: s.planned_count };
  const prefStatMap: Record<number, CountStat> = {};
  for (const s of prefStats) prefStatMap[s.prefecture_id] = { visit_count: s.visit_count, planned_count: s.planned_count };

  return (
    <TripForm
      trip={trip}
      cities={citiesWithPref}
      prefectures={prefectures}
      cityStats={cityStatMap}
      prefStats={prefStatMap}
      defaultCityIds={defaultCityIds}
      defaultStatus={defaultStatus}
      cancelHref={cancelHref}
      compact={inModal}
    />
  );
}

export function parseFormSearch(sp: { city?: string; status?: string }) {
  const defaultCityIds = sp.city && /^[0-9a-f-]{36}$/i.test(sp.city) ? [sp.city] : [];
  const defaultStatus: TripStatus = sp.status === "planned" ? "planned" : "done";
  return { defaultCityIds, defaultStatus };
}
