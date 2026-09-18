import type { ReactNode } from "react";

type Props = {
  inset: { x: number; y: number; w: number; h: number };
  label: ReactNode;
  /** 확대 배율의 역수 (글자·점선을 화면 크기로 유지) */
  k?: number;
};

/** 오키나와 인셋 박스 (점선 테두리 + 라벨). 경로는 JapanMap 이 같은 좌표계로 그린다. */
export function OkinawaInset({ inset, label, k = 1 }: Props) {
  return (
    <g aria-hidden="true">
      <rect
        x={inset.x}
        y={inset.y}
        width={inset.w}
        height={inset.h}
        rx={10 * k}
        fill="none"
        stroke="#D6CBB5"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
      <text x={inset.x + 12 * k} y={inset.y + 20 * k} fill="var(--muted)" className="lb" style={{ fontWeight: 500, stroke: "none", fontSize: 11 * k }}>
        {label}
      </text>
    </g>
  );
}
