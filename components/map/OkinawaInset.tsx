import type { ReactNode } from "react";

type Props = {
  inset: { x: number; y: number; w: number; h: number };
  label: ReactNode;
};

/** 오키나와 인셋 박스 (점선 테두리 + 라벨). 경로는 JapanMap 이 같은 좌표계로 그린다. */
export function OkinawaInset({ inset, label }: Props) {
  return (
    <g aria-hidden="true">
      <rect
        x={inset.x}
        y={inset.y}
        width={inset.w}
        height={inset.h}
        rx="10"
        fill="none"
        stroke="#D6CBB5"
        strokeDasharray="4 4"
      />
      <text x={inset.x + 12} y={inset.y + 20} fontSize="11" fill="var(--muted)" className="lb" style={{ fontWeight: 500, stroke: "none" }}>
        {label}
      </text>
    </g>
  );
}
