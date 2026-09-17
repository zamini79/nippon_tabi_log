import { AppHeader } from "@/components/AppHeader";
import { TripFormLoader } from "../../_form/TripFormLoader";

export const metadata = { title: "여행 수정" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AppHeader subtitle="" />
      <main className="mx-auto w-full max-w-[760px] px-5 py-8 md:py-10">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="serif text-[26px] font-bold">여행 수정</h1>
          <p className="text-[13px] text-muted">도시를 바꾸면 지도 색도 함께 바뀌어요</p>
        </div>
        <div className="rounded-[22px] border border-line bg-card p-6 md:p-8">
          <TripFormLoader tripId={id} cancelHref="/trips" />
        </div>
      </main>
    </>
  );
}
