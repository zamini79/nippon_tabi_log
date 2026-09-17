import Link from "next/link";

export function ComingSoon({ title, milestone, detail }: { title: string; milestone: number; detail?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-16">
      <div className="serif text-[28px] font-bold">{title}</div>
      <p className="text-sm text-muted">
        이 화면은 마일스톤 {milestone}에서 구현됩니다.
        {detail ? ` ${detail}` : ""}
      </p>
      <Link href="/" className="text-sm font-medium text-v3">
        전국 지도로 돌아가기 →
      </Link>
    </div>
  );
}
