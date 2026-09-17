import { Modal } from "@/components/Modal";
import { TripFormLoader, parseFormSearch } from "@/app/trips/_form/TripFormLoader";

/** 앱 안에서 /trips/new 로 이동하면 현재 화면 위에 모달로 뜬다 (route intercept). */
export default async function NewTripModal({ searchParams }: { searchParams: Promise<{ city?: string; status?: string }> }) {
  const sp = await searchParams;
  const { defaultCityIds, defaultStatus } = parseFormSearch(sp);
  return (
    <Modal title={defaultStatus === "planned" ? "계획 추가" : "여행 추가"} subtitle="도시를 고르면 현은 자동으로 채워져요">
      <TripFormLoader defaultCityIds={defaultCityIds} defaultStatus={defaultStatus} cancelHref="/" inModal />
    </Modal>
  );
}
