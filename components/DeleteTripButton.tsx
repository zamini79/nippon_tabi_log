"use client";

import { deleteTrip } from "@/app/trips/actions";

export function DeleteTripButton({ tripId, title }: { tripId: string; title: string }) {
  return (
    <form
      action={deleteTrip}
      onSubmit={(e) => {
        if (!confirm(`"${title}" 여행을 지울까요? 방문 기록도 함께 사라져요.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={tripId} />
      <button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-bg hover:text-v3">
        삭제
      </button>
    </form>
  );
}
