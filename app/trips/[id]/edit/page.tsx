import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { getTrip } from "@/lib/data";
import { getPhotosForTrips, withSignedUrls } from "@/lib/photos";
import { TripFormLoader } from "../../_form/TripFormLoader";

export const metadata = { title: "여행 수정" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  const photos = await withSignedUrls(await getPhotosForTrips([trip.id]));
  const visits = trip.visits.map((v) => ({ id: v.id, city: v.city }));

  return (
    <>
      <AppHeader subtitle="" />
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 py-8 md:py-10">
        <div className="flex flex-col gap-1">
          <h1 className="serif text-[26px] font-bold">여행 수정</h1>
          <p className="text-[13px] text-muted">도시를 바꾸면 지도 색도 함께 바뀌어요</p>
        </div>
        <div className="rounded-[22px] border border-line bg-card p-6 md:p-8">
          <TripFormLoader tripId={id} cancelHref="/trips" />
        </div>

        <section id="photos" className="flex flex-col gap-4 rounded-[22px] border border-line bg-card p-6 md:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-[#3F4A55]">사진</h2>
            <span className="text-xs text-muted">{photos.length}장</span>
          </div>
          <PhotoUploader tripId={trip.id} visits={visits} />
          {photos.length ? (
            <>
              <PhotoGrid photos={photos} visits={visits} editable coverPhotoId={trip.cover_photo} rowHeight={120} />
              <p className="text-xs text-muted">사진을 누르면 크게 보고 도시 지정·캡션·대표 사진·삭제를 할 수 있어요.</p>
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}
