"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import type { NextGoal, RegionSummary } from "@/lib/goal";
import { t, tRegion, tShort } from "@/lib/names";
import type { City, CountStat, Prefecture } from "@/lib/types";

type Props = { regions: RegionSummary[]; stats: Record<number, CountStat> };

/** 지방별 진행 바 + 47현 칩 */
export function RegionBoard({ regions, stats }: Props) {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-4">
      {regions.map((r) => (
        <section key={r.region} className="flex flex-col gap-2">
          <div className="grid grid-cols-[96px_1fr_44px] items-center gap-3 text-[13px] md:grid-cols-[110px_1fr_44px]">
            <span className="font-semibold">{tRegion(r, lang)}</span>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-land-0" role="progressbar" aria-valuenow={r.done} aria-valuemin={0} aria-valuemax={r.total}>
              <div className="h-1.5 bg-v3" style={{ width: `${(r.done / r.total) * 100}%` }} />
              <div className="h-1.5 bg-[#8FB3D0]" style={{ width: `${(r.planned / r.total) * 100}%` }} />
            </div>
            <span className="whitespace-nowrap text-right text-muted">
              {r.done}/{r.total}
              {r.cityCount > 0 ? <span className="ml-1 text-[11px]">· {r.cityCount}시</span> : null}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.prefectures.map((p) => (
              <PrefChip key={p.id} p={p} stat={stats[p.id]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PrefChip({ p, stat }: { p: Prefecture; stat?: CountStat }) {
  const lang = useLang();
  const n = stat?.visit_count ?? 0;
  const planned = n === 0 && (stat?.planned_count ?? 0) > 0;
  const cls =
    n >= 3
      ? "bg-v3 border-v3 text-card font-semibold"
      : n === 2
        ? "bg-v2 border-v2 text-ink"
        : n === 1
          ? "bg-v1 border-v1 text-ink"
          : planned
            ? "border-dashed border-plan bg-plan-bg text-plan"
            : "border-line bg-card text-muted hover:border-ink hover:text-ink";
  return (
    <Link href={`/prefectures/${p.code}`} className={`flex items-center gap-1 rounded-full border px-[9px] py-1 text-xs ${cls}`} title={t(p, lang)}>
      {tShort(p, lang)}
      {n > 0 ? (
        <span className="text-[10px] opacity-80">
          {n}회{(stat?.city_count ?? 0) > 0 ? ` · ${stat!.city_count}시` : ""}
        </span>
      ) : null}
    </Link>
  );
}

/** 다음 목표 카드 (규칙 기반) */
export function NextGoalCard({ goal, seedCities }: { goal: NextGoal | null; seedCities: City[] }) {
  const lang = useLang();
  if (!goal) {
    return (
      <div className="rounded-2xl border border-line bg-card px-5 py-[18px] text-sm">
        <div className="text-xs font-semibold tracking-[0.5px] text-v3">다음 목표</div>
        <div className="mt-1 text-[13px] text-muted">모든 현을 다녀왔거나 계획에 넣었어요. 47현 완주가 눈앞이에요.</div>
      </div>
    );
  }
  const names = goal.unvisited.slice(0, 3).map((p) => tShort(p, lang)).join("·");
  const more = goal.unvisited.length > 3 ? ` 등 ${goal.unvisited.length}현` : "";
  const firstUnvisited = goal.unvisited[0];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card px-5 py-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tracking-[0.5px] text-v3">다음 목표</div>
        <span className="text-xs text-muted">미방문 {goal.unvisited.length}현</span>
      </div>
      <div className="serif text-xl font-bold">{tRegion(goal.region, lang)}</div>
      <p className="text-[13px] text-[#3F4A55]">
        아직 안 간 현이 가장 많이 몰린 지방이에요. {names}
        {more}부터 채워 보면 어때요?
        {seedCities.length ? (
          <>
            {" "}
            {seedCities.map((c) => t(c, lang)).join("·")} 같은 도시로 시작할 수 있어요.
          </>
        ) : null}
      </p>
      <div className="flex gap-2 pt-1">
        <Link
          href={seedCities[0] ? `/trips/new?status=planned&city=${seedCities[0].id}` : "/trips/new?status=planned"}
          className="rounded-lg bg-plan px-3.5 py-2 text-[13px] font-semibold text-card hover:brightness-95"
        >
          계획에 넣기
        </Link>
        {firstUnvisited ? (
          <Link href={`/prefectures/${firstUnvisited.code}`} className="rounded-lg border border-line px-3.5 py-2 text-[13px] hover:bg-bg">
            {t(firstUnvisited, lang)} 보기
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** 요약 카드 하단 문구: "○○ 여행을 다녀오면 N현 · P%" */
export function PlannedGainText({ title, gain, after, prefNames }: { title: string; gain: number; after: number; prefNames: Prefecture[] }) {
  const lang = useLang();
  if (gain === 0) return <>계획 중인 여행이 새 현을 채우지는 않아요</>;
  return (
    <>
      {title} 여행을 다녀오면 {after}현 · {Math.round((after / 47) * 100)}% ({prefNames.map((p) => tShort(p, lang)).join("·")})
    </>
  );
}
