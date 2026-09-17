import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon } from "geojson";

/**
 * 투영·경로 생성. 서버에서 1회 계산해 모듈 캐시에 둔다.
 * GeoJSON(350KB) 은 클라이언트 번들에 넣지 않고, 완성된 path 문자열만 넘긴다.
 */

export type PrefProps = {
  id: number;
  code: string;
  name_ko: string;
  name_ja: string;
  name_en: string;
  region: string;
  region_ko: string;
  region_ja: string;
};
type PrefFeature = Feature<MultiPolygon, PrefProps>;

export const OKINAWA_ID = 47;
/** 이 위도보다 남쪽에만 있는 도서(오가사와라 등)는 본토 지도에서 제외 */
const SOUTH_LIMIT = 30.5;

let featureCache: PrefFeature[] | null = null;

function loadFeatures(): PrefFeature[] {
  if (featureCache) return featureCache;
  const file = path.join(process.cwd(), "data", "japan-prefectures.geojson");
  const raw = JSON.parse(readFileSync(file, "utf8")) as FeatureCollection<MultiPolygon, PrefProps>;
  featureCache = raw.features.map((f) => {
    if (f.properties.id === OKINAWA_ID) return f;
    const coordinates = f.geometry.coordinates.filter((poly) =>
      poly[0].some(([, lat]) => lat >= SOUTH_LIMIT),
    );
    return { ...f, geometry: { ...f.geometry, coordinates } };
  });
  return featureCache;
}

export type Bbox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

function bboxOf(f: PrefFeature): Bbox {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const poly of f.geometry.coordinates)
    for (const ring of poly)
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return [minX, minY, maxX, maxY];
}

function intersects(a: Bbox, b: Bbox) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

type Polygon = MultiPolygon["coordinates"][number];

function polygonBbox(poly: Polygon): Bbox {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const [x, y] of poly[0]) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * 가장 큰 폴리곤(본섬)과 그 주변(bbox 를 각 방향으로 grow 배 확장한 범위 안에 중심이 있는) 폴리곤만 남긴다.
 * 이즈·오가사와라(도쿄), 사키시마(오키나와), 아마미(가고시마) 같은 원거리 도서가 fitExtent 를 망치는 것을 막는다.
 */
function mainCluster(f: PrefFeature, grow = 1): PrefFeature {
  const polys = f.geometry.coordinates;
  if (polys.length <= 1) return f;
  const boxes = polys.map(polygonBbox);
  const area = (b: Bbox) => (b[2] - b[0]) * (b[3] - b[1]);
  const largest = boxes.reduce((best, b) => (area(b) > area(best) ? b : best), boxes[0]);
  const w = largest[2] - largest[0], h = largest[3] - largest[1];
  const zone: Bbox = [largest[0] - w * grow, largest[1] - h * grow, largest[2] + w * grow, largest[3] + h * grow];
  const keep = polys.filter((_, i) => {
    const b = boxes[i];
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    return cx >= zone[0] && cx <= zone[2] && cy >= zone[1] && cy <= zone[3];
  });
  return { ...f, geometry: { ...f.geometry, coordinates: keep } };
}

export type Point = [x: number, y: number];
export type Projector = (lng: number, lat: number, prefectureId: number) => Point;

/** 인셋 박스 밖으로 나가는 점을 안쪽 여백까지 끌어온다 (사키시마 제도 등 개략 위치) */
function clampInto(p: Point, box: { x: number; y: number; w: number; h: number }, m: number): { point: Point; clamped: boolean } {
  const x = Math.min(Math.max(p[0], box.x + m), box.x + box.w - m);
  const y = Math.min(Math.max(p[1], box.y + m), box.y + box.h - m);
  return { point: [x, y], clamped: x !== p[0] || y !== p[1] };
}

export type NationalPrefecturePath = {
  id: number;
  code: string;
  d: string;
  labelX: number;
  labelY: number;
};

export type NationalMap = {
  width: number;
  height: number;
  /** 오키나와 인셋 박스 (좌하단, 점선) */
  inset: { x: number; y: number; w: number; h: number };
  prefectures: NationalPrefecturePath[];
  project: Projector;
  /** 인셋 범위 밖이라 개략 위치로 끌어온 점인지 */
  isApproximate: (lng: number, lat: number, prefectureId: number) => boolean;
};

const nationalCache = new Map<string, NationalMap>();

/** 전국 지도. 본토는 fitExtent, 오키나와는 인셋에 별도 투영. */
export function getNationalMap(width = 700, height = 760): NationalMap {
  const key = `${width}x${height}`;
  const hit = nationalCache.get(key);
  if (hit) return hit;

  const features = loadFeatures();
  const mainland = features.filter((f) => f.properties.id !== OKINAWA_ID);
  const okinawa = features.find((f) => f.properties.id === OKINAWA_ID)!;

  const pad = 8;
  const main: GeoProjection = geoMercator().fitExtent(
    [[pad, pad], [width - pad, height - pad]],
    { type: "FeatureCollection", features: mainland },
  );

  const inset = {
    x: 12,
    y: Math.round(height * 0.385),
    w: Math.round(width * 0.266),
    h: Math.round(height * 0.195),
  };
  const ok: GeoProjection = geoMercator().fitExtent(
    [[inset.x + 14, inset.y + 26], [inset.x + inset.w - 14, inset.y + inset.h - 12]],
    mainCluster(okinawa, 0.6),
  );

  const mainPath = geoPath(main);
  const okPath = geoPath(ok);

  const prefectures = features.map((f) => {
    const p = f.properties.id === OKINAWA_ID ? okPath : mainPath;
    const [cx, cy] = p.centroid(f);
    return { id: f.properties.id, code: f.properties.code, d: p(f) ?? "", labelX: cx, labelY: cy };
  });

  const rawProject = (lng: number, lat: number, prefectureId: number): Point => {
    const proj = prefectureId === OKINAWA_ID ? ok : main;
    return (proj([lng, lat]) ?? [NaN, NaN]) as Point;
  };
  const project: Projector = (lng, lat, prefectureId) => {
    const p = rawProject(lng, lat, prefectureId);
    if (prefectureId !== OKINAWA_ID || !Number.isFinite(p[0])) return p;
    return clampInto(p, inset, 14).point;
  };
  const isApproximate = (lng: number, lat: number, prefectureId: number) => {
    if (prefectureId !== OKINAWA_ID) return false;
    const p = rawProject(lng, lat, prefectureId);
    return Number.isFinite(p[0]) && clampInto(p, inset, 14).clamped;
  };

  const result: NationalMap = { width, height, inset, prefectures, project, isApproximate };
  nationalCache.set(key, result);
  return result;
}

export type ZoomNeighbor = { id: number; code: string; d: string; labelX: number; labelY: number };

export type ZoomMap = {
  width: number;
  height: number;
  target: { id: number; code: string; d: string };
  neighbors: ZoomNeighbor[];
  project: Projector;
  isApproximate: (lng: number, lat: number) => boolean;
  /** geoMercator 의 scale/translate — 클라이언트에서 클릭 위치 → 경위도 역변환에 사용 */
  mercator: { scale: number; translate: [number, number] };
};

const zoomCache = new Map<string, ZoomMap>();

/** 현 확대. 해당 현 bbox + 여백으로 fitExtent, 이웃 현은 같은 투영으로 옅게. */
export function getPrefectureZoom(id: number, width = 790, height = 670): ZoomMap {
  const key = `${id}:${width}x${height}`;
  const hit = zoomCache.get(key);
  if (hit) return hit;

  const features = loadFeatures();
  const target = features.find((f) => f.properties.id === id);
  if (!target) throw new Error(`prefecture ${id} not found`);

  const pad = Math.round(Math.min(width, height) * 0.09);
  const focus = mainCluster(target);
  const proj: GeoProjection = geoMercator().fitExtent(
    [[pad, pad], [width - pad, height - pad]],
    focus,
  );
  const pathGen = geoPath(proj);

  const tb = bboxOf(focus);
  const grow = 0.6;
  const w = tb[2] - tb[0], h = tb[3] - tb[1];
  const area: Bbox = [tb[0] - w * grow, tb[1] - h * grow, tb[2] + w * grow, tb[3] + h * grow];

  const neighbors = features
    .filter((f) => f.properties.id !== id && intersects(bboxOf(f), area))
    .map((f) => {
      const [cx, cy] = pathGen.centroid(mainCluster(f));
      const m = 24;
      const inside = cx >= m && cx <= width - m && cy >= m && cy <= height - m;
      return {
        id: f.properties.id,
        code: f.properties.code,
        d: pathGen(f) ?? "",
        // 화면 밖이면 NaN → 라벨 생략
        labelX: inside ? cx : NaN,
        labelY: inside ? cy : NaN,
      };
    });

  const box = { x: 0, y: 0, w: width, h: height };
  const rawProject = (lng: number, lat: number): Point => (proj([lng, lat]) ?? [NaN, NaN]) as Point;
  const project: Projector = (lng, lat) => {
    const p = rawProject(lng, lat);
    return Number.isFinite(p[0]) ? clampInto(p, box, 18).point : p;
  };
  const isApproximate = (lng: number, lat: number) => {
    const p = rawProject(lng, lat);
    return Number.isFinite(p[0]) && clampInto(p, box, 18).clamped;
  };

  const result: ZoomMap = {
    width,
    height,
    target: { id, code: target.properties.code, d: pathGen(target) ?? "" },
    neighbors,
    project,
    isApproximate,
    mercator: { scale: proj.scale(), translate: proj.translate() as [number, number] },
  };
  zoomCache.set(key, result);
  return result;
}

export function prefectureIdFromCode(code: string): number | null {
  if (!/^\d{2}$/.test(code)) return null;
  const id = Number(code);
  return id >= 1 && id <= 47 ? id : null;
}
