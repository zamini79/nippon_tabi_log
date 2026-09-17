"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createCity, type CreateCityState } from "@/app/cities/actions";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { Level } from "@/lib/types";
import { PrefectureZoom, type ZoomCityView, type ZoomNeighborView } from "./PrefectureZoom";

type Props = {
  width: number;
  height: number;
  target: { d: string; level: Level; name_ko: string; name_ja: string };
  neighbors: ZoomNeighborView[];
  cities: ZoomCityView[];
  prefectureId: number;
  mercator: { scale: number; translate: [number, number] };
  startOpen?: boolean;
};

/** geoMercator 역변환: 화면(viewBox) 좌표 → 경위도 */
function invert(p: { x: number; y: number }, m: { scale: number; translate: [number, number] }) {
  const lam = (p.x - m.translate[0]) / m.scale;
  const phi = 2 * Math.atan(Math.exp((m.translate[1] - p.y) / m.scale)) - Math.PI / 2;
  return { lng: (lam * 180) / Math.PI, lat: (phi * 180) / Math.PI };
}

/** 현 확대 지도 + "도시 추가" 패널 (지도를 눌러 위치 지정) */
export function ZoomWithAddCity({ prefectureId, mercator, startOpen, ...zoom }: Props) {
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [picked, setPicked] = useState<{ x: number; y: number } | null>(null);
  const [state, formAction, pending] = useActionState<CreateCityState, FormData>(createCity, null);
  const coords = picked ? invert(picked, mercator) : null;

  useEffect(() => {
    if (state?.cityId) router.push(`/cities/${state.cityId}`);
  }, [state?.cityId, router]);

  return (
    <div className="flex flex-col gap-3">
      <PrefectureZoom {...zoom} pickMode={open} picked={picked} onPick={setPicked} />
      {open ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-dashed border-v3 bg-bg px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">
              {t(zoom.target, lang)}에 도시 추가
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
              닫기
            </button>
          </div>
          <p className="text-xs text-muted">지도에서 도시 위치를 눌러 주세요. 점이 찍힌 자리가 저장돼요.</p>
          <input type="hidden" name="prefecture_id" value={prefectureId} />
          <input type="hidden" name="lat" value={coords ? coords.lat.toFixed(4) : ""} />
          <input type="hidden" name="lng" value={coords ? coords.lng.toFixed(4) : ""} />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input name="name_ko" required placeholder="한글 이름 (예: 미노오)" className="h-10 rounded-[10px] border border-[#D6CBB5] bg-card px-3 text-sm outline-none focus:border-ink" />
            <input name="name_ja" placeholder="일본어 이름 (예: 箕面, 비우면 한글과 같게)" className="h-10 rounded-[10px] border border-[#D6CBB5] bg-card px-3 text-sm outline-none focus:border-ink" />
            <button type="submit" disabled={pending || !coords} className="h-10 rounded-[10px] bg-v3 px-4 text-sm font-semibold text-card disabled:opacity-50 hover:brightness-95">
              {pending ? "저장 중…" : "도시 저장"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted">{coords ? `위치 ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "아직 위치를 고르지 않았어요"}</span>
            {state?.error ? <span className="text-v3" role="alert">{state.error}</span> : null}
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-muted hover:border-ink hover:text-ink">
            + 이 현에 도시 추가
          </button>
        </div>
      )}
    </div>
  );
}
