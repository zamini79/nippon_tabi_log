"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_EXT, PHOTO_BUCKET, isUuid, thumbPath } from "@/lib/photo-paths";

/**
 * 1) 클라이언트가 원본을 Storage 에 직접 올릴 수 있도록 서명 업로드 URL 발급.
 *    원본은 {trip_id}/orig/{uuid}.{ext} 에 두고, /api/photos/process 가 리사이즈 후 지운다.
 */
export async function createUploadTarget(tripId: string, fileName: string): Promise<{ path: string; token: string } | { error: string }> {
  if (!isUuid(tripId)) return { error: "여행 id 가 올바르지 않아요." };
  const extRaw = (fileName.split(".").pop() ?? "").toLowerCase();
  const ext = ALLOWED_EXT.includes(extRaw) ? extRaw : "jpg";
  const admin = createAdminClient();
  const { data: trip } = await admin.from("trips").select("id").eq("id", tripId).maybeSingle();
  if (!trip) return { error: "여행을 찾을 수 없어요." };
  const path = `${tripId}/orig/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "업로드 URL 을 만들 수 없어요." };
  return { path: data.path, token: data.token };
}

export async function deletePhoto(photoId: string): Promise<{ error?: string }> {
  if (!isUuid(photoId)) return { error: "id 오류" };
  const admin = createAdminClient();
  const { data: photo } = await admin.from("photos").select("id,storage_path,trip_id").eq("id", photoId).maybeSingle();
  if (!photo) return { error: "사진을 찾을 수 없어요." };
  await admin.storage.from(PHOTO_BUCKET).remove([photo.storage_path, thumbPath(photo.storage_path)]);
  const { error } = await admin.from("photos").delete().eq("id", photoId);
  if (error) return { error: error.message };
  // 대표 사진이었다면 다음 사진으로
  const { data: next } = await admin.from("photos").select("id").eq("trip_id", photo.trip_id).order("sort_order").limit(1).maybeSingle();
  await admin.from("trips").update({ cover_photo: next?.id ?? null }).eq("id", photo.trip_id).is("cover_photo", null);
  revalidatePath("/", "layout");
  return {};
}

export async function updatePhotoVisit(photoId: string, visitId: string | null): Promise<{ error?: string }> {
  if (!isUuid(photoId) || (visitId !== null && !isUuid(visitId))) return { error: "id 오류" };
  const admin = createAdminClient();
  if (visitId) {
    const { data: photo } = await admin.from("photos").select("trip_id").eq("id", photoId).maybeSingle();
    const { data: visit } = await admin.from("visits").select("trip_id").eq("id", visitId).maybeSingle();
    if (!photo || !visit || photo.trip_id !== visit.trip_id) return { error: "이 여행의 도시가 아니에요." };
  }
  const { error } = await admin.from("photos").update({ visit_id: visitId }).eq("id", photoId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function updatePhotoCaption(photoId: string, caption: string): Promise<{ error?: string }> {
  if (!isUuid(photoId)) return { error: "id 오류" };
  const admin = createAdminClient();
  const { error } = await admin.from("photos").update({ caption: caption.trim() || null }).eq("id", photoId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function setCoverPhoto(tripId: string, photoId: string): Promise<{ error?: string }> {
  if (!isUuid(tripId) || !isUuid(photoId)) return { error: "id 오류" };
  const admin = createAdminClient();
  const { error } = await admin.from("trips").update({ cover_photo: photoId }).eq("id", tripId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
