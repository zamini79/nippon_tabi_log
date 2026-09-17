import "server-only";
import { createClient } from "./supabase/server";
import type { City, CityStat, Prefecture, PrefectureStat, Trip } from "./types";

/**
 * 읽기 쿼리 모음. RLS 에 의존하되 사용자 데이터는 서버에서도 owner 를 명시한다.
 * (뷰 v_* 는 security_invoker 이므로 RLS 가 그대로 적용된다)
 */

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

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

export async function getPrefectureStats(owner: string): Promise<PrefectureStat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_prefecture_stats").select("*").eq("owner", owner);
  if (error) throw error;
  return data as PrefectureStat[];
}

export async function getCityStats(owner: string, prefectureId?: number): Promise<CityStat[]> {
  const supabase = await createClient();
  let q = supabase.from("v_city_stats").select("*").eq("owner", owner);
  if (prefectureId) q = q.eq("prefecture_id", prefectureId);
  const { data, error } = await q;
  if (error) throw error;
  return data as CityStat[];
}

export async function getTrips(owner: string): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id,title,status,start_date,end_date,companions,memo,cover_photo")
    .eq("owner", owner)
    .order("start_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Trip[];
}
