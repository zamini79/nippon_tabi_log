import { completeTrip } from "@/app/trips/actions";

/** 계획 → 다녀온 여행으로 전환 */
export function CompleteTripButton({ tripId, small }: { tripId: string; small?: boolean }) {
  return (
    <form action={completeTrip}>
      <input type="hidden" name="id" value={tripId} />
      <button
        type="submit"
        className={
          small
            ? "rounded-lg bg-v3 px-2.5 py-1.5 text-xs font-semibold text-card hover:brightness-95"
            : "rounded-[10px] bg-v3 px-3.5 py-2 text-[13px] font-semibold text-card hover:brightness-95"
        }
      >
        다녀왔어요
      </button>
    </form>
  );
}
