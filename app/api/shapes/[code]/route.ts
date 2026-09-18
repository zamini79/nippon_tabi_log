import { NextResponse } from "next/server";
import { getNationalMap, prefectureIdFromCode } from "@/lib/geo";

export const runtime = "nodejs";

/** 전국 지도 좌표계로 그린 한 현의 상세 경계(outline)와 모든 시·정·촌 경계(paths). 확대해서 볼 때 클라이언트가 필요할 때만 받아간다 (정적 데이터, 오래 캐시) */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const id = prefectureIdFromCode(code);
  if (!id) return NextResponse.json({ error: "unknown prefecture" }, { status: 404 });
  const map = getNationalMap();
  return NextResponse.json(
    { outline: map.detailedOutlineFor(id), paths: map.outlinesFor(id) },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
