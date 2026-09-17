import Link from "next/link";

export type Stamp = { key: string; year: string; month?: string; planned?: boolean };

const TILTS = [-6, 4, -3, 5, -2, 3];

/** 방문 스탬프 행 (연도/월 원형) + 추가 버튼 */
export function StampRow({ stamps, addHref, size = 52 }: { stamps: Stamp[]; addHref?: string; size?: number }) {
  const font = size >= 48 ? "text-[11px]" : "text-[10px]";
  return (
    <div className="flex flex-wrap gap-2">
      {stamps.map((s, i) => (
        <div
          key={s.key}
          className={`flex flex-col items-center justify-center rounded-full leading-[1.1] ${font} ${
            s.planned ? "border-2 border-dashed border-plan text-plan" : "bg-v3 text-card"
          }`}
          style={{ width: size, height: size, transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
          title={s.planned ? "계획" : "방문"}
        >
          <span className="font-semibold">{s.year}</span>
          {s.month ? <span>{s.month}</span> : null}
        </div>
      ))}
      {addHref ? (
        <Link
          href={addHref}
          aria-label="여행 추가"
          className="flex items-center justify-center rounded-full border-2 border-dashed border-sand text-lg text-[#8A8378] hover:border-ink hover:text-ink"
          style={{ width: size, height: size }}
        >
          +
        </Link>
      ) : null}
    </div>
  );
}
