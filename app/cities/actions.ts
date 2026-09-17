"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/photo-paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { isInsidePrefecture } from "@/lib/geo";

export type CreateCityState = { error?: string; cityId?: string } | null;

/** 사용자 도시 추가 (is_custom). 위치는 현 확대 지도를 눌러 지정한 경위도. */
export async function createCity(_prev: CreateCityState, formData: FormData): Promise<CreateCityState> {
  const prefectureId = Number(formData.get("prefecture_id"));
  const nameKo = String(formData.get("name_ko") ?? "").trim();
  const nameJa = String(formData.get("name_ja") ?? "").trim() || nameKo;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!Number.isInteger(prefectureId) || prefectureId < 1 || prefectureId > 47) return { error: "현 정보가 올바르지 않아요." };
  if (!nameKo) return { error: "도시 이름을 입력해 주세요." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "지도를 눌러 위치를 지정해 주세요." };
  if (lat < 20 || lat > 46 || lng < 122 || lng > 154) return { error: "일본 범위 밖 좌표예요." };
  if (!isInsidePrefecture(prefectureId, lng, lat)) return { error: "이 현 경계 안쪽을 눌러 주세요. (바다나 이웃 현은 안 돼요)" };

  const admin = createAdminClient();
  const { data: dup } = await admin.from("cities").select("id").eq("prefecture_id", prefectureId).eq("name_ja", nameJa).maybeSingle();
  if (dup) return { error: "같은 이름의 도시가 이미 있어요." };
  const { data, error } = await admin
    .from("cities")
    .insert({ prefecture_id: prefectureId, name_ko: nameKo, name_ja: nameJa, name_en: null, lat, lng, is_custom: true })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "저장 실패" };
  revalidatePath("/", "layout");
  return { cityId: data.id as string };
}

/** 사용자 도시 삭제 — 방문 기록이 없을 때만 */
export async function deleteCity(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return;
  const admin = createAdminClient();
  const { data: city } = await admin.from("cities").select("id,is_custom,prefecture_id").eq("id", id).maybeSingle();
  if (!city?.is_custom) return;
  const { count } = await admin.from("visits").select("id", { count: "exact", head: true }).eq("city_id", id);
  if ((count ?? 0) > 0) return;
  await admin.from("cities").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/prefectures/${String(city.prefecture_id).padStart(2, "0")}`);
}
