import { notFound } from "next/navigation";
import { TripForm } from "@/components/TripForm";
import { getCities, getCityStats, getPrefectureStats, getPrefectures, getTrip } from "@/lib/data";
import type { CountStat, SlimCity, TripStatus } from "@/lib/types";

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

  // 796개 도시를 클라이언트로 보내므로 필요한 필드만 (현 정보는 prefectures 로 따로 전달해 클라이언트에서 조인)
  const slimCities: SlimCity[] = cities.map((c) => ({ id: c.id, prefecture_id: c.prefecture_id, name_ko: c.name_ko, name_ja: c.name_ja, name_en: c.name_en }));

  const cityStatMap: Record<string, CountStat> = {};
  for (const s of cityStats) cityStatMap[s.city_id] = { visit_count: s.visit_count, planned_count: s.planned_count };
  const prefStatMap: Record<number, CountStat> = {};
  for (const s of prefStats) prefStatMap[s.prefecture_id] = { visit_count: s.visit_count, planned_count: s.planned_count };

  return (
    <TripForm
      trip={trip}
      cities={slimCities}
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
