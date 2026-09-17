import "server-only";
import { createClient } from "./supabase/server";
import type { City, CityStat, Prefecture, PrefectureStat, Trip, TripWithCities } from "./types";

/**
 * 읽기 쿼리 모음. 로그인 없는 단일 사용자 앱 — 모든 테이블은 공개 읽기(RLS select using true),
 * 쓰기는 서버 액션에서 service_role(lib/supabase/admin.ts) 로만 수행한다.
 */

export async function getPrefectures(): Promise<Prefecture[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prefectures").select("*").order("id");
  if (error) throw error;
  return data as Prefecture[];
}

export async function getCities(prefectureId?: number): Promise<City[]> {
  const supabase = await createClient();
  let q = supabase.from("cities").select("*").order("name_ko");
  if (prefectureId) q = q.eq("prefecture_id", prefectureId);
  const { data, error } = await q;
  if (error) throw error;
  return data as City[];
}

export async function getPrefectureStats(): Promise<PrefectureStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_prefecture_stats").select("*");
  if (error) throw error;
  return data as PrefectureStat[];
}

export async function getCityStats(prefectureId?: number): Promise<CityStat[]> {
  const supabase = await createClient();
  let q = supabase.from("v_city_stats").select("*");
  if (prefectureId) q = q.eq("prefecture_id", prefectureId);
  const { data, error } = await q;
  if (error) throw error;
  return data as CityStat[];
}

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id,title,status,start_date,end_date,companions,memo,cover_photo")
    .order("start_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Trip[];
}

// ---------- 여행 × 도시 ----------
const TRIP_SELECT =
  "id,title,status,start_date,end_date,companions,memo,cover_photo,visits(id,seq,nights,memo,city:cities(*))";

function normalizeTrips(rows: unknown): TripWithCities[] {
  const trips = (rows ?? []) as TripWithCities[];
  for (const t of trips) t.visits = (t.visits ?? []).filter((v) => v.city).sort((a, b) => a.seq - b.seq);
  return trips;
}

export async function getTripsWithCities(): Promise<TripWithCities[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return normalizeTrips(data);
}

export async function getTrip(id: string): Promise<TripWithCities | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").select(TRIP_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeTrips([data])[0] : null;
}

/** 이 도시를 포함한 여행 전체 (동행 도시까지 포함해 돌려준다) */
export async function getTripsForCity(cityId: string): Promise<TripWithCities[]> {
  const supabase = await createClient();
  const { data: visits, error: vErr } = await supabase.from("visits").select("trip_id").eq("city_id", cityId);
  if (vErr) throw vErr;
  const ids = Array.from(new Set((visits ?? []).map((v) => v.trip_id as string)));
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .in("id", ids)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return normalizeTrips(data);
}

export async function getCity(id: string): Promise<City | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as City) ?? null;
}
