import "server-only";
import { createClient } from "./supabase/server";
import type { City, CityStat, Prefecture, PrefectureStat, Trip } from "./types";

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
