export type Lang = "ko" | "ja";

export type Prefecture = {
  id: number;
  code: string;
  name_ko: string;
  name_ko_short: string;
  name_ja: string;
  name_en: string;
  region: string;
  region_ko: string;
  region_ja: string;
};

export type City = {
  id: string;
  prefecture_id: number;
  name_ko: string;
  name_ja: string;
  name_en: string | null;
  lat: number;
  lng: number;
  is_custom: boolean;
};

export type PrefectureStat = {
  prefecture_id: number;
  region: string;
  visit_count: number;
  planned_count: number;
  city_count: number;
};

export type CityStat = {
  city_id: string;
  prefecture_id: number;
  visit_count: number;
  planned_count: number;
  last_visit: string | null;
  first_visit: string | null;
};

export type TripStatus = "done" | "planned";

export type Trip = {
  id: string;
  title: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  companions: number | null;
  memo: string | null;
  cover_photo: string | null;
  created_at?: string;
};

/** 색 단계: 0 미방문 / 1 / 2 / 3+ / plan(계획만 있음) */
export type Level = 0 | 1 | 2 | 3 | "plan";

export function levelOf(visitCount: number, plannedCount: number): Level {
  if (visitCount >= 3) return 3;
  if (visitCount === 2) return 2;
  if (visitCount === 1) return 1;
  return plannedCount > 0 ? "plan" : 0;
}

export type VisitWithCity = {
  id: string;
  seq: number;
  nights: number | null;
  memo: string | null;
  city: City;
};

/** trips + visits(도시 포함). 도시 상세·여행 목록·최근 여행에서 사용 */
export type TripWithCities = Trip & { visits: VisitWithCity[] };

/** 폼 검색용 최소 필드 (RSC 페이로드 절약) */
export type SlimCity = Pick<City, "id" | "prefecture_id" | "name_ko" | "name_ja" | "name_en">;
export type CityWithPrefecture = SlimCity & { prefecture: Prefecture };

/** 지도·폼에서 쓰는 가벼운 통계 맵 */
export type CountStat = { visit_count: number; planned_count: number; city_count?: number };

export type Photo = {
  id: string;
  trip_id: string;
  visit_id: string | null; // null = 여행 전체 사진
  storage_path: string; // {trip_id}/{uuid}.jpg (썸네일은 _t.jpg)
  width: number | null;
  height: number | null;
  taken_at: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

/** 서명 URL 이 붙은 사진 (서버에서 1시간 유효 URL 생성) */
export type PhotoView = Photo & { url: string; thumbUrl: string };
