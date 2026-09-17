import type { PhotoView, TripWithCities } from "@/lib/types";

/** 여행 목록·최근 여행의 56px 썸네일. 대표 사진 → 첫 사진 → 자리표시 */
export function TripThumb({ trip, photos, planned, dday }: { trip: TripWithCities; photos: PhotoView[]; planned?: boolean; dday?: number | null }) {
  const mine = photos.filter((p) => p.trip_id === trip.id);
  const cover = mine.find((p) => p.id === trip.cover_photo) ?? mine[0];
  if (planned) {
    return (
      <div className="flex size-14 items-center justify-center rounded-[10px] bg-card text-[11px] text-plan">
        {dday !== null && dday !== undefined && dday >= 0 ? `D-${dday}` : "계획"}
      </div>
    );
  }
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover.thumbUrl} alt="" className="size-14 rounded-[10px] object-cover" />;
  }
  return <div className="flex size-14 items-center justify-center rounded-[10px] bg-v2 text-[11px] text-card">사진</div>;
}
