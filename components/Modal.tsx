"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

/** route intercept 용 모달. 닫으면 이전 화면으로. */
export function Modal({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto w-[min(760px,calc(100vw-32px))] rounded-[22px] bg-card p-0 text-ink shadow-[0_24px_60px_rgba(30,36,41,0.25)] backdrop:bg-[#1E2429]/45 open:flex"
    >
      <div className="flex w-full flex-col gap-5 px-6 py-6 md:px-9 md:pb-7 md:pt-8">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="serif text-[26px] font-bold">{title}</h2>
            {subtitle ? <div className="text-[13px] text-muted">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={close} aria-label="닫기" className="flex size-9 items-center justify-center rounded-full bg-bg hover:bg-land-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ModalCancelButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className="rounded-[10px] border border-[#D6CBB5] px-[18px] py-[11px] text-sm font-medium hover:bg-bg">
      {children}
    </button>
  );
}
