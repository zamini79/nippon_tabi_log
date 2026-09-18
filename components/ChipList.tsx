"use client";

import { useState, type ReactNode } from "react";

/** 칩이 많을 때 처음 N개만 보이고 "+N 더보기" 로 펼치는 래퍼 */
export function ChipList({ children, limit = 12, extra }: { children: ReactNode[]; limit?: number; extra?: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? children : children.slice(0, limit);
  const hidden = children.length - items.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items}
      {hidden > 0 ? (
        <button type="button" onClick={() => setExpanded(true)} className="rounded-full border border-line px-2.5 py-[5px] text-xs text-muted hover:border-ink hover:text-ink">
          +{hidden} 더보기
        </button>
      ) : null}
      {expanded && children.length > limit ? (
        <button type="button" onClick={() => setExpanded(false)} className="rounded-full px-2.5 py-[5px] text-xs text-muted hover:text-ink">
          접기
        </button>
      ) : null}
      {extra}
    </div>
  );
}
