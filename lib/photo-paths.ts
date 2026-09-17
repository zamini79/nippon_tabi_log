/** 클라이언트·서버 공용 상수/헬퍼 (server-only 아님) */
export const PHOTO_BUCKET = "trip-photos";

/** 본 이미지 경로 → 썸네일 경로 */
export const thumbPath = (storagePath: string) => storagePath.replace(/\.jpg$/, "_t.jpg");

export const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif", "tif", "tiff", "gif", "avif"];

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
