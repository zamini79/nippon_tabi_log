"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deletePhoto, setCoverPhoto, updatePhotoCaption, updatePhotoVisit } from "@/app/photos/actions";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import type { City, PhotoView } from "@/lib/types";

type VisitOption = { id: string; city: City };

type Props = {
  photos: PhotoView[];
  visits?: VisitOption[];
  /** 편집 모드: 도시 지정·캡션·대표·삭제 */
  editable?: boolean;
  coverPhotoId?: string | null;
  /** 그리드에 보이는 최대 개수 (나머지는 +N) */
  max?: number;
  rowHeight?: number;
};

function fmtTaken(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function PhotoGrid({ photos, visits = [], editable, coverPhotoId, max = 6, rowHeight = 104 }: Props) {
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visitName = (id: string | null) => {
    if (!id) return null;
    const v = visits.find((x) => x.id === id);
    return v ? t(v.city, lang) : null;
  };

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : Math.min(photos.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (photos.length === 0) return null;

  const shown = editable ? photos : photos.slice(0, max);
  const rest = photos.length - shown.length;
  const firstSpans = !editable && shown.length % 2 === 1;
  const current = open !== null ? photos[open] : null;

  return (
    <>
      <div className={`grid gap-2 ${editable ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid-cols-2"}`} style={{ gridAutoRows: rowHeight }}>
        {shown.map((p, i) => {
          const isLast = !editable && rest > 0 && i === shown.length - 1;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(i)}
              className={`relative overflow-hidden rounded-[10px] bg-land-0 text-left ${firstSpans && i === 0 ? "col-span-2" : ""}`}
              aria-label={p.caption ?? `사진 ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbUrl} alt={p.caption ?? ""} loading="lazy" className="size-full object-cover transition-transform hover:scale-[1.03]" />
              {isLast ? (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-semibold text-card">+{rest}</span>
              ) : null}
              {editable && coverPhotoId === p.id ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-ink">대표</span>
              ) : null}
              {p.visit_id && visitName(p.visit_id) ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-bg">{visitName(p.visit_id)}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
        className="m-auto max-h-[100dvh] w-[min(1100px,100vw)] bg-transparent p-0 backdrop:bg-[#1E2429]/85"
      >
        {current ? (
          <div className="flex flex-col gap-3 p-3 md:p-4">
            <div className="relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={current.caption ?? ""} className="max-h-[78dvh] w-auto max-w-full rounded-xl object-contain" />
              {open !== null && open > 0 ? (
                <button type="button" onClick={() => setOpen(open - 1)} aria-label="이전" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/85 px-3 py-2 text-sm">
                  ‹
                </button>
              ) : null}
              {open !== null && open < photos.length - 1 ? (
                <button type="button" onClick={() => setOpen(open + 1)} aria-label="다음" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/85 px-3 py-2 text-sm">
                  ›
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(null)} aria-label="닫기" className="absolute right-2 top-2 rounded-full bg-card/85 px-2.5 py-1 text-sm">
                ✕
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3 text-muted">
                <span className="text-ink">
                  {open !== null ? open + 1 : 0} / {photos.length}
                </span>
                {fmtTaken(current.taken_at) ? <span>촬영 {fmtTaken(current.taken_at)}</span> : <span>촬영일 없음</span>}
                <span>{visitName(current.visit_id) ?? "여행 전체"}</span>
                {!editable && current.caption ? <span className="text-ink">{current.caption}</span> : null}
              </div>
              {editable ? <EditControls photo={current} visits={visits} isCover={coverPhotoId === current.id} onChanged={() => router.refresh()} onDeleted={() => { setOpen(null); router.refresh(); }} /> : null}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function EditControls({ photo, visits, isCover, onChanged, onDeleted }: { photo: PhotoView; visits: VisitOption[]; isCover: boolean; onChanged: () => void; onDeleted: () => void }) {
  const lang = useLang();
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setCaption(photo.caption ?? ""), [photo.id, photo.caption]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={photo.visit_id ?? ""}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          await updatePhotoVisit(photo.id, e.target.value || null);
          setBusy(false);
          onChanged();
        }}
        className="rounded-lg border border-line bg-card px-2 py-1.5 text-xs outline-none"
        aria-label="사진의 도시"
      >
        <option value="">여행 전체</option>
        {visits.map((v) => (
          <option key={v.id} value={v.id}>
            {t(v.city, lang)}
          </option>
        ))}
      </select>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={async () => {
          if ((photo.caption ?? "") === caption.trim()) return;
          setBusy(true);
          await updatePhotoCaption(photo.id, caption);
          setBusy(false);
          onChanged();
        }}
        placeholder="캡션"
        className="w-40 rounded-lg border border-line bg-card px-2 py-1.5 text-xs outline-none focus:border-ink"
        aria-label="캡션"
      />
      <button
        type="button"
        disabled={busy || isCover}
        onClick={async () => {
          setBusy(true);
          await setCoverPhoto(photo.trip_id, photo.id);
          setBusy(false);
          onChanged();
        }}
        className="rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-bg disabled:opacity-50"
      >
        {isCover ? "대표 사진" : "대표로"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!confirm("이 사진을 지울까요?")) return;
          setBusy(true);
          await deletePhoto(photo.id);
          setBusy(false);
          onDeleted();
        }}
        className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-bg hover:text-v3"
      >
        삭제
      </button>
    </div>
  );
}
