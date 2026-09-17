import { AppHeader } from "@/components/AppHeader";
import { TripFormLoader, parseFormSearch } from "../_form/TripFormLoader";

export const metadata = { title: "여행 추가" };

/** 직접 접근 시 페이지. 앱 안에서 이동하면 app/@modal/(.)trips/new 가 가로채 모달로 뜬다. */
export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ city?: string; status?: string }> }) {
  const sp = await searchParams;
  const { defaultCityIds, defaultStatus } = parseFormSearch(sp);
  return (
    <>
      <AppHeader subtitle="" />
      <main className="mx-auto w-full max-w-[760px] px-5 py-8 md:py-10">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="serif text-[26px] font-bold">여행 추가</h1>
          <p className="text-[13px] text-muted">도시를 고르면 현은 자동으로 채워져요</p>
        </div>
        <div className="rounded-[22px] border border-line bg-card p-6 md:p-8">
          <TripFormLoader defaultCityIds={defaultCityIds} defaultStatus={defaultStatus} cancelHref="/" />
        </div>
      </main>
    </>
  );
}
