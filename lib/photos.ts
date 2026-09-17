import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { PHOTO_BUCKET, thumbPath } from "./photo-paths";
import type { Photo, PhotoView } from "./types";

export async function getPhotosForTrips(tripIds: string[]): Promise<Photo[]> {
  if (tripIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .in("trip_id", tripIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Photo[];
}

/** private 버킷 → 1시간짜리 서명 URL (본 이미지·썸네일). service_role 로만 발급. */
export async function withSignedUrls(photos: Photo[], expiresIn = 3600): Promise<PhotoView[]> {
  if (photos.length === 0) return [];
  const admin = createAdminClient();
  const paths = photos.flatMap((p) => [p.storage_path, thumbPath(p.storage_path)]);
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) throw error;
  const byPath = new Map<string, string>();
  for (const row of data ?? []) if (row.path && row.signedUrl) byPath.set(row.path, row.signedUrl);
  return photos.map((p) => ({
    ...p,
    url: byPath.get(p.storage_path) ?? "",
    thumbUrl: byPath.get(thumbPath(p.storage_path)) ?? byPath.get(p.storage_path) ?? "",
  }));
}

/** 도시 상세 카드용: 그 도시 visit 사진 + 여행 전체 사진 */
export function photosForCityInTrip(photos: PhotoView[], tripId: string, visitId: string | null | undefined) {
  return photos.filter((p) => p.trip_id === tripId && (p.visit_id === null || p.visit_id === visitId));
}
