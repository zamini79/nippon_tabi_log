"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET, thumbPath } from "@/lib/photo-paths";
import type { TripStatus } from "@/lib/types";

/**
 * 성공 시 redirectTo 를 돌려주고 클라이언트가 이동한다.
 * (서버 액션의 redirect() 는 route-intercept 모달 안에서 라우터가 이동하지 않는 문제가 있어 쓰지 않는다)
 */
export type SaveTripState = { error?: string; redirectTo?: string } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

/**
 * 여행 생성·수정 + visits 동기화. 쓰기는 service_role 로만 (RLS 에 anon 쓰기 정책 없음).
 * 성공 시 첫 도시의 상세로 이동한다.
 */
export async function saveTrip(_prev: SaveTripState, formData: FormData): Promise<SaveTripState> {
  const id = str(formData, "id");
  const status: TripStatus = str(formData, "status") === "planned" ? "planned" : "done";
  const title = str(formData, "title");
  const start = str(formData, "start_date") || null;
  const end = str(formData, "end_date") || null;
  const memo = str(formData, "memo") || null;
  const cityIds = Array.from(new Set(formData.getAll("city_ids").map(String).filter(isUuid)));

  if (!title) return { error: "여행 이름을 입력해 주세요." };
  if (start && end && end < start) return { error: "귀국일이 출발일보다 앞설 수 없어요." };
  if (cityIds.length === 0) return { error: "도시를 하나 이상 골라 주세요." };

  const admin = createAdminClient();
  const row = { title, status, start_date: start, end_date: end, memo };

  let tripId = id && isUuid(id) ? id : null;
  if (tripId) {
    const { error } = await admin.from("trips").update(row).eq("id", tripId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin.from("trips").insert(row).select("id").single();
    if (error || !data) return { error: error?.message ?? "저장에 실패했어요." };
    tripId = data.id as string;
  }

  // visits 동기화: 빠진 도시 삭제, 새 도시 추가, 순서(seq) 갱신
  const { data: existing, error: exErr } = await admin.from("visits").select("id,city_id").eq("trip_id", tripId);
  if (exErr) return { error: exErr.message };
  const existingByCity = new Map((existing ?? []).map((v) => [v.city_id as string, v.id as string]));

  const toDelete = (existing ?? []).filter((v) => !cityIds.includes(v.city_id as string)).map((v) => v.id as string);
  if (toDelete.length) {
    const { error } = await admin.from("visits").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }
  const inserts = cityIds
    .filter((c) => !existingByCity.has(c))
    .map((c) => ({ trip_id: tripId, city_id: c, seq: cityIds.indexOf(c) + 1 }));
  if (inserts.length) {
    const { error } = await admin.from("visits").insert(inserts);
    if (error) return { error: error.message };
  }
  for (const [cityId, visitId] of existingByCity) {
    const seq = cityIds.indexOf(cityId) + 1;
    if (seq > 0) await admin.from("visits").update({ seq }).eq("id", visitId);
  }

  revalidatePath("/", "layout");
  return { redirectTo: `/cities/${cityIds[0]}` };
}

export async function deleteTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  const admin = createAdminClient();
  // 사진 파일은 FK cascade 로 지워지지 않으므로 Storage 에서 먼저 제거 (원본 orig/ 는 처리 직후 삭제됨)
  const { data: photos } = await admin.from("photos").select("storage_path").eq("trip_id", id);
  const paths = (photos ?? []).flatMap((p) => [p.storage_path as string, thumbPath(p.storage_path as string)]);
  if (paths.length) await admin.storage.from(PHOTO_BUCKET).remove(paths);
  const { error } = await admin.from("trips").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
  redirect("/trips");
}

/** 계획 → 다녀온 여행. 날짜·도시는 그대로 두고 상태만 바꾼다. */
export async function completeTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  const admin = createAdminClient();
  const { error } = await admin.from("trips").update({ status: "done" }).eq("id", id).eq("status", "planned");
  if (error) throw error;
  revalidatePath("/", "layout");
}
