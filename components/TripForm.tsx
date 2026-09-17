"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { saveTrip, type SaveTripState } from "@/app/trips/actions";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { CityWithPrefecture, CountStat, Prefecture, TripStatus, TripWithCities } from "@/lib/types";
import { CitySearch } from "./CitySearch";

type Props = {
  trip?: TripWithCities | null;
  cities: CityWithPrefecture[];
  prefectures: Prefecture[];
  cityStats: Record<string, CountStat>;
  prefStats: Record<number, CountStat>;
  defaultCityIds?: string[];
  defaultStatus?: TripStatus;
  cancelHref: string;
  onCancel?: () => void;
  compact?: boolean;
};

export function TripForm({ trip, cities, prefectures, cityStats, prefStats, defaultCityIds = [], defaultStatus = "done", cancelHref, onCancel, compact }: Props) {
  const lang = useLang();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveTripState, FormData>(saveTrip, null);

  // 저장 성공 → 도시 상세로. 모달(intercept)에서는 슬롯이 남지 않도록 전체 이동.
  useEffect(() => {
    if (!state?.redirectTo) return;
    if (compact) window.location.assign(state.redirectTo);
    else router.push(state.redirectTo);
  }, [state?.redirectTo, compact, router]);
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? defaultStatus);
  const initialCityIds = useMemo(() => trip?.visits.map((v) => v.city.id) ?? defaultCityIds, [trip, defaultCityIds]);
  const [cityIds, setCityIds] = useState<string[]>(initialCityIds);

  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const prefById = useMemo(() => new Map(prefectures.map((p) => [p.id, p])), [prefectures]);
  const planned = status === "planned";

  /** 이 여행을 제외한 방문 횟수 (수정 시 자기 자신을 빼고 계산) */
  const baseVisits = (cityId: string) => {
    const n = cityStats[cityId]?.visit_count ?? 0;
    const inThisTrip = trip?.status === "done" && trip.visits.some((v) => v.city.id === cityId);
    return Math.max(0, n - (inThisTrip ? 1 : 0));
  };
  const labelFor = (cityId: string) => {
    const base = baseVisits(cityId);
    return base === 0 ? { text: "첫 방문", isFirst: true } : { text: `${base + 1}회째`, isFirst: false };
  };

  const filledPrefectures = useMemo(() => {
    const ids = Array.from(new Set(cityIds.map((id) => cityById.get(id)?.prefecture_id).filter((x): x is number => !!x)));
    return ids.map((pid) => {
      const p = prefById.get(pid)!;
      const n = prefStats[pid]?.visit_count ?? 0;
      const inThisTrip = trip?.status === "done" && trip.visits.some((v) => v.city.prefecture_id === pid);
      return { p, isNew: n - (inThisTrip ? 1 : 0) === 0 };
    });
  }, [cityIds, cityById, prefById, prefStats, trip]);

  const deepen = cityIds.filter((id) => baseVisits(id) > 0).map((id) => cityById.get(id)).filter(Boolean) as CityWithPrefecture[];
  const newPrefs = filledPrefectures.filter((x) => x.isNew).map((x) => x.p);

  const summaryText = (() => {
    if (planned) return cityIds.length ? "저장하면 지도에 계획 표시(점선)가 생겨요" : "계획할 도시를 골라 주세요";
    if (!cityIds.length) return "도시를 고르면 지도에 어떻게 반영될지 알려드려요";
    const parts: string[] = [];
    if (deepen.length) parts.push(`${deepen.map((c) => t(c, lang)).join("·")}가 한 단계 짙어져요`);
    if (newPrefs.length) parts.push(`${newPrefs.map((p) => t(p, lang)).join("·")}이 새로 채워져요`);
    if (!parts.length) return "저장하면 지도에 새 도시 점이 생겨요";
    return `저장하면 지도에 ${parts.join(", ")}`;
  })();

  const inputCls = "h-11 rounded-[10px] border border-[#D6CBB5] bg-card px-3.5 text-sm outline-none focus:border-ink";
  const lblCls = "text-xs font-semibold text-[#3F4A55]";

  return (
    <form action={formAction} className={`flex flex-col ${compact ? "gap-5" : "gap-6"}`}>
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}
      <input type="hidden" name="status" value={status} />

      <div className="flex gap-1.5 self-start rounded-xl bg-bg p-1" role="group" aria-label="여행 상태">
        <button
          type="button"
          onClick={() => setStatus("done")}
          aria-pressed={!planned}
          className={`rounded-[9px] px-[18px] py-[9px] text-[13px] font-semibold ${!planned ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
        >
          다녀온 여행
        </button>
        <button
          type="button"
          onClick={() => setStatus("planned")}
          aria-pressed={planned}
          className={`flex items-center gap-1.5 rounded-[9px] px-[18px] py-[9px] text-[13px] font-semibold ${planned ? "bg-plan text-card" : "text-plan hover:brightness-90"}`}
        >
          <span className={`inline-block size-2 rounded-full border-2 border-dashed ${planned ? "border-card" : "border-plan"}`} />
          계획 중
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor="trip-title" className={lblCls}>여행 이름</label>
          <input id="trip-title" name="title" type="text" required defaultValue={trip?.title ?? ""} placeholder={planned ? "예) 시코쿠 우동 순례" : "예) 가을 단풍, 교토와 나라까지"} className={inputCls} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-start" className={lblCls}>출발</label>
          <input id="trip-start" name="start_date" type="date" defaultValue={trip?.start_date ?? ""} className={inputCls} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-end" className={lblCls}>귀국</label>
          <input id="trip-end" name="end_date" type="date" defaultValue={trip?.end_date ?? ""} className={inputCls} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="trip-companions" className={lblCls}>인원 (본인 포함)</label>
          <input id="trip-companions" name="companions" type="number" min={1} max={99} defaultValue={trip?.companions ?? ""} placeholder="예) 2" className={inputCls} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className={lblCls}>도시</span>
        <CitySearch cities={cities} selectedIds={cityIds} onChange={setCityIds} labelFor={labelFor} planned={planned} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{planned ? "계획에 들어가는 현" : "채워지는 현"}</span>
          {filledPrefectures.length === 0 ? (
            <span className="text-sand">도시를 고르면 여기에 표시돼요</span>
          ) : (
            filledPrefectures.map(({ p, isNew }) => (
              <span
                key={p.id}
                className={`rounded-md px-2.5 py-1 ${
                  planned ? "border border-dashed border-plan bg-plan-bg text-plan" : isNew ? "bg-v3 text-card" : "bg-v1 text-ink"
                }`}
              >
                {t(p, lang)}
                {!planned && isNew ? " · 새 현!" : ""}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="trip-memo" className={lblCls}>메모</label>
        <textarea id="trip-memo" name="memo" rows={3} defaultValue={trip?.memo ?? ""} placeholder="기억해 둘 것, 다음에 갈 곳…" className="resize-none rounded-[10px] border border-[#D6CBB5] bg-card px-3.5 py-3 text-sm outline-none focus:border-ink" />
      </div>

      <div className="rounded-xl border border-dashed border-line px-4 py-3 text-xs text-muted">
        사진 업로드는 마일스톤 3에서 추가됩니다. 지금은 여행과 도시만 기록해도 지도가 채워져요.
      </div>

      {state?.error ? (
        <p className="text-sm text-v3" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted">
          {summaryText}
        </div>
        <div className="flex gap-2">
          {onCancel || compact ? (
            <button type="button" onClick={onCancel ?? (() => router.back())} className="rounded-[10px] border border-[#D6CBB5] px-[18px] py-[11px] text-sm font-medium hover:bg-bg">
              취소
            </button>
          ) : (
            <Link href={cancelHref} className="rounded-[10px] border border-[#D6CBB5] px-[18px] py-[11px] text-sm font-medium hover:bg-bg">
              취소
            </Link>
          )}
          <button type="submit" disabled={pending} className={`rounded-[10px] px-5 py-[11px] text-sm font-semibold text-card disabled:opacity-60 ${planned ? "bg-plan" : "bg-v3"} hover:brightness-95`}>
            {pending || state?.redirectTo ? "저장 중…" : trip ? "수정 저장" : planned ? "계획 저장" : "기록 저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
