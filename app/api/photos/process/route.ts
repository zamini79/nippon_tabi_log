import exifr from "exifr";
import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { PHOTO_BUCKET, isUuid, thumbPath } from "@/lib/photo-paths";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAIN_EDGE = 2000;
const THUMB_EDGE = 400;

/**
 * 2) 업로드 완료 후 호출. 원본을 내려받아 sharp 로 장변 2000px 본 이미지 + 400px 썸네일(JPEG)을 만들고,
 *    exifr 로 촬영일을 뽑아 photos 행을 만든다. EXIF(위치 포함)는 출력에서 제거된다. 원본은 지운다.
 */
export async function POST(req: NextRequest) {
  let body: { trip_id?: string; visit_id?: string | null; orig_path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const tripId = body.trip_id ?? "";
  const visitId = body.visit_id ?? null;
  const origPath = body.orig_path ?? "";
  if (!isUuid(tripId) || !origPath.startsWith(`${tripId}/orig/`)) {
    return NextResponse.json({ error: "경로가 올바르지 않아요." }, { status: 400 });
  }
  if (visitId !== null && !isUuid(visitId)) return NextResponse.json({ error: "visit id 오류" }, { status: 400 });

  const admin = createAdminClient();
  const storage = admin.storage.from(PHOTO_BUCKET);

  if (visitId) {
    const { data: visit } = await admin.from("visits").select("trip_id").eq("id", visitId).maybeSingle();
    if (!visit || visit.trip_id !== tripId) return NextResponse.json({ error: "이 여행의 도시가 아니에요." }, { status: 400 });
  }

  const { data: blob, error: dlErr } = await storage.download(origPath);
  if (dlErr || !blob) return NextResponse.json({ error: "원본을 읽을 수 없어요." }, { status: 404 });
  const input = Buffer.from(await blob.arrayBuffer());

  let takenAt: string | null = null;
  try {
    const exif = (await exifr.parse(input, { pick: ["DateTimeOriginal", "CreateDate"] })) as
      | { DateTimeOriginal?: Date | string; CreateDate?: Date | string }
      | undefined;
    const raw = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) takenAt = raw.toISOString();
    else if (typeof raw === "string") {
      const d = new Date(raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
      if (!Number.isNaN(d.getTime())) takenAt = d.toISOString();
    }
  } catch {
    // EXIF 없음 — 무시
  }

  const id = crypto.randomUUID();
  const mainPath = `${tripId}/${id}.jpg`;
  let main: { data: Buffer; info: OutputInfo };
  let thumb: Buffer;
  try {
    const base = sharp(input, { failOn: "none" }).rotate();
    main = await base
      .clone()
      .resize({ width: MAIN_EDGE, height: MAIN_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    thumb = await base
      .clone()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    await storage.remove([origPath]);
    const msg = e instanceof Error ? e.message : String(e);
    const heic = /heif|heic|unsupported image format/i.test(msg);
    return NextResponse.json(
      { error: heic ? "이 형식(HEIC 등)은 처리할 수 없어요. JPEG 로 바꿔 올려주세요." : `이미지를 처리할 수 없어요: ${msg}` },
      { status: 415 },
    );
  }

  const up1 = await storage.upload(mainPath, main.data, { contentType: "image/jpeg", upsert: true });
  const up2 = await storage.upload(thumbPath(mainPath), thumb, { contentType: "image/jpeg", upsert: true });
  if (up1.error || up2.error) {
    return NextResponse.json({ error: up1.error?.message ?? up2.error?.message }, { status: 500 });
  }

  const { count } = await admin.from("photos").select("id", { count: "exact", head: true }).eq("trip_id", tripId);
  const { data: photo, error: insErr } = await admin
    .from("photos")
    .insert({
      id,
      trip_id: tripId,
      visit_id: visitId,
      storage_path: mainPath,
      width: main.info.width,
      height: main.info.height,
      taken_at: takenAt,
      sort_order: count ?? 0,
    })
    .select("*")
    .single();
  if (insErr || !photo) {
    await storage.remove([mainPath, thumbPath(mainPath), origPath]);
    return NextResponse.json({ error: insErr?.message ?? "저장 실패" }, { status: 500 });
  }

  // 대표 사진이 없으면 첫 사진을 대표로
  await admin.from("trips").update({ cover_photo: photo.id }).eq("id", tripId).is("cover_photo", null);
  await storage.remove([origPath]);

  return NextResponse.json({ photo });
}
