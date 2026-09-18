"use client";

type Props = {
  scale: number;
  zoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
};

const btn = "flex size-8 items-center justify-center bg-card text-ink transition-colors hover:bg-land-0 disabled:opacity-35 disabled:hover:bg-card";

/** 지도 확대 버튼 (＋ / － / 전체). 휠·드래그와 같은 상태를 조작한다 */
export function MapZoomControls({ scale, zoomed, onZoomIn, onZoomOut, onReset, className }: Props) {
  return (
    <div className={`flex flex-col items-end gap-1.5 ${className ?? ""}`}>
      <div className="flex flex-col overflow-hidden rounded-[10px] border border-line shadow-sm" role="group" aria-label="지도 확대">
        <button type="button" onClick={onZoomIn} className={btn} aria-label="확대" disabled={scale >= 7.99}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </button>
        <div className="h-px bg-line" />
        <button type="button" onClick={onZoomOut} className={btn} aria-label="축소" disabled={!zoomed}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 8h10" />
          </svg>
        </button>
      </div>
      {zoomed ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-muted shadow-sm hover:bg-land-0 hover:text-ink"
        >
          {scale.toFixed(1)}× · 전체 보기
        </button>
      ) : null}
    </div>
  );
}
