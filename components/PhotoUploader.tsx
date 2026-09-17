"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createUploadTarget } from "@/app/photos/actions";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/names";
import { PHOTO_BUCKET } from "@/lib/photo-paths";
import { createClient } from "@/lib/supabase/client";
import type { City } from "@/lib/types";

type VisitOption = { id: string; city: City };
type Item = { key: string; name: string; status: "uploading" | "processing" | "done" | "error"; message?: string; preview: string };

type Props = {
  tripId: string;
  visits: VisitOption[];
  /** 초기 도시 지정. undefined 면 "여행 전체" */
  defaultVisitId?: string | null;
  /** compact: 버튼 하나 + 상태 목록 (도시 상세 카드용) */
  compact?: boolean;
};

const CONCURRENCY = 3;

/** 파일 → 서명 URL 로 Storage 직접 업로드 → /api/photos/process 로 리사이즈·EXIF·DB 반영 */
export function PhotoUploader({ tripId, visits, defaultVisitId = null, compact }: Props) {
  const lang = useLang();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [visitId, setVisitId] = useState<string | "">(defaultVisitId ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = items.some((i) => i.status === "uploading" || i.status === "processing");

  const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function uploadOne(file: File, key: string) {
    try {
      const target = await createUploadTarget(tripId, file.name);
      if ("error" in target) throw new Error(target.error);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      update(key, { status: "processing" });
      const res = await fetch("/api/photos/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trip_id: tripId, visit_id: visitId || null, orig_path: target.path }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `처리 실패 (${res.status})`);
      update(key, { status: "done" });
    } catch (e) {
      update(key, { status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  async function onFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (files.length === 0) return;
    const newItems: Item[] = files.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, status: "uploading", preview: URL.createObjectURL(f) }));
    setItems((prev) => [...newItems, ...prev]);
    // 동시 3개까지
    const queue = files.map((f, i) => ({ f, key: newItems[i].key }));
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const next = queue.shift()!;
        await uploadOne(next.f, next.key);
      }
    });
    await Promise.all(workers);
    router.refresh();
  }

  const select = visits.length > 0 && (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>사진의 도시</span>
      <select value={visitId} onChange={(e) => setVisitId(e.target.value)} className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink outline-none focus:border-ink">
        <option value="">여행 전체</option>
        {visits.map((v) => (
          <option key={v.id} value={v.id}>
            {t(v.city, lang)}
          </option>
        ))}
      </select>
    </label>
  );

  const statusList = items.length > 0 && (
    <ul className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li key={it.key} className="relative size-16 overflow-hidden rounded-lg bg-land-0" title={it.message ?? it.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.preview} alt="" className={`size-full object-cover ${it.status === "done" ? "" : "opacity-60"}`} />
          <span
            className={`absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-center text-[10px] leading-tight ${
              it.status === "error" ? "bg-v3 text-card" : it.status === "done" ? "bg-ink/70 text-bg" : "bg-card/85 text-ink"
            }`}
          >
            {it.status === "uploading" ? "올리는 중" : it.status === "processing" ? "처리 중" : it.status === "done" ? "완료" : "실패"}
          </span>
        </li>
      ))}
    </ul>
  );
  const errors = items.filter((i) => i.status === "error");

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*,.heic,.heif"
      multiple
      className="hidden"
      onChange={(e) => {
        if (e.target.files) void onFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-dashed border-sand px-3 py-2 text-xs text-muted hover:border-ink hover:text-ink disabled:opacity-60">
            <UploadIcon />
            {busy ? "올리는 중…" : "사진 올리기"}
          </button>
          {select}
        </div>
        {statusList}
        {errors.length ? <p className="text-xs text-v3">{errors[0].message}</p> : null}
        {input}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed px-4 py-6 text-xs text-muted transition-colors ${
          dragging ? "border-v3 bg-v1/30" : "border-sand hover:border-ink"
        }`}
        aria-label="사진 올리기"
      >
        <UploadIcon />
        <span>{busy ? "올리는 중…" : "끌어다 놓기 또는 눌러서 선택"}</span>
        <span className="text-[11px] text-sand">JPEG·PNG·WebP · 장변 2000px 로 줄여 저장돼요</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {select || <span />}
        <span className="text-xs text-muted">지정하지 않으면 여행 전체 사진으로 들어가요</span>
      </div>
      {statusList}
      {errors.length ? (
        <ul className="text-xs text-v3">
          {errors.slice(0, 3).map((e) => (
            <li key={e.key}>
              {e.name}: {e.message}
            </li>
          ))}
        </ul>
      ) : null}
      {input}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 11V3M4.5 6.5L8 3l3.5 3.5M2.5 11.5v1.5h11v-1.5" />
    </svg>
  );
}
