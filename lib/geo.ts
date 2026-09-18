import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { geoContains, geoMercator, geoPath, type GeoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { feature as topoFeature, merge as topoMerge } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { GeometryCollection, MultiPolygon as TopoMultiPolygon, Objects, Polygon as TopoPolygon, Topology } from "topojson-specification";

/**
 * 투영·경로 생성. 서버에서 1회 계산해 모듈 캐시에 둔다.
 * 경계 데이터(TopoJSON 1.5MB) 는 클라이언트 번들에 넣지 않고, 완성된 path 문자열만 넘긴다.
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

/* ---------- 경계 데이터: 시·구·정·촌 TopoJSON 하나에서 현 경계까지 만든다 (같은 데이터라 끝단이 정확히 맞는다) ---------- */

type MuniProps = { N03_001: string; N03_002: string | null; N03_003: string | null; N03_004: string | null; N03_007: string };
type MuniGeom = TopoPolygon<MuniProps> | TopoMultiPolygon<MuniProps>;
type PrefRow = { id: number; name_ko: string; name_ko_short: string; name_ja: string; name_en: string; region: string; region_ko: string; region_ja: string };

/** 전국 지도용 간략화 수준: 점의 상위 35% 만 남긴다 (현 경계 path 총 ≈350K 자, 기존 GeoJSON 과 비슷) */
const SIMPLIFY_QUANTILE = 0.35;

type TopoBundle = {
  /** 원본(간략화 1%) — 현 확대 화면·시 경계·확대 시 상세 현 경계 */
  raw: Topology;
  /** 전국 지도용으로 더 간략화한 것. 원본과 점을 공유하므로 확대 시 상세본으로 바꿔도 어긋남 없이 겹친다 */
  simplified: Topology;
  objectName: string;
  prefRows: PrefRow[];
  prefIdByName: Map<string, number>;
};

let bundleCache: TopoBundle | null = null;

function isMuniGeom(g: { type: string | null }): g is MuniGeom {
  return g.type === "Polygon" || g.type === "MultiPolygon";
}

function loadTopology(): TopoBundle {
  if (bundleCache) return bundleCache;
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "municipalities.topo.json"), "utf8")) as Topology;
  const objectName = Object.keys(raw.objects)[0];
  const collection = raw.objects[objectName] as GeometryCollection<MuniProps>;
  // 제외: 북방영토 6개 촌(01695–01700), 소속 미정지
  collection.geometries = collection.geometries.filter((g) => {
    const p = g.properties as MuniProps | undefined;
    if (!p?.N03_001) return false;
    if (/^(0169[5-9]|01700)$/.test(p.N03_007 ?? "")) return false;
    if ((p.N03_004 ?? "").endsWith("所属未定地")) return false;
    return true;
  });
  const prefRows = JSON.parse(readFileSync(path.join(process.cwd(), "data", "prefectures.json"), "utf8")) as PrefRow[];
  const prefIdByName = new Map(prefRows.map((r) => [r.name_ja, r.id]));
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- topojson-simplify 의 타입 시그니처가 Objects<{}> 를 요구
  const pre = presimplify(raw as Topology<Objects<{}>>);
  const simplified = simplify(pre, quantile(pre, SIMPLIFY_QUANTILE)) as Topology;
  bundleCache = { raw, simplified, objectName, prefRows, prefIdByName };
  return bundleCache;
}

function muniGeometries(topo: Topology, objectName: string, nameJa: string): MuniGeom[] {
  const collection = topo.objects[objectName] as GeometryCollection<MuniProps>;
  return collection.geometries.filter((g): g is MuniGeom => isMuniGeom(g) && (g.properties as MuniProps | undefined)?.N03_001 === nameJa);
}

/** 한 토폴로지에서 47현 MultiPolygon 을 시·구·정·촌 병합으로 만든다 (오키나와 외에는 lat<30.5 도서 제외) */
function buildPrefFeatures(topo: Topology): PrefFeature[] {
  const { objectName, prefRows } = loadTopology();
  return prefRows.map((r) => {
    const merged = topoMerge(topo, muniGeometries(topo, objectName, r.name_ja));
    const coordinates = r.id === OKINAWA_ID ? merged.coordinates : merged.coordinates.filter((poly) => poly[0].some(([, lat]) => lat >= SOUTH_LIMIT));
    return {
      type: "Feature",
      properties: { id: r.id, code: String(r.id).padStart(2, "0"), name_ko: r.name_ko, name_ja: r.name_ja, name_en: r.name_en, region: r.region, region_ko: r.region_ko, region_ja: r.region_ja },
      geometry: { type: "MultiPolygon", coordinates },
    };
  });
}

let featureCache: PrefFeature[] | null = null;
let detailedCache: PrefFeature[] | null = null;

/** 전국 지도용 현 경계 (간략화본) */
function loadFeatures(): PrefFeature[] {
  if (!featureCache) featureCache = buildPrefFeatures(loadTopology().simplified);
  return featureCache;
}
/** 상세 현 경계 (원본) — 현 확대 화면, 확대 시 교체용, 경계 안 판정 */
function loadDetailedFeatures(): PrefFeature[] {
  if (!detailedCache) detailedCache = buildPrefFeatures(loadTopology().raw);
  return detailedCache;
}

/* ---------- 시·구·정·촌 경계 (국토수치정보 N03 → smartnews-smri/japan-topography 간략화 1% TopoJSON) ---------- */

type MuniFeature = Feature<GeoPolygon | MultiPolygon, MuniProps>;
type Shape = Feature<Geometry>;

/** 접미(市·町·村·区)를 뗀 이름. DB 의 name_ja 는 접미 없이 저장된다 */
function stemName(name: string): string {
  return name.replace(/(市|町|村|区)$/u, "");
}
function muniRank(p: MuniProps): number {
  if (p.N03_003 && !p.N03_004) return 3; // 정령지정도시(구 병합)
  const n = p.N03_004 ?? "";
  return n.endsWith("市") ? 3 : n.endsWith("区") ? 2 : 1; // 같은 이름이면 市 > 区 > 町村
}

let muniCache: Map<string, Shape> | null = null;
/** 현별 전체 시·정·촌 목록 (이름 중복과 무관하게 모두, 구분선용) */
let muniByPref: Map<number, Shape[]> | null = null;

/** key `${prefectureId}|${stem}` → 경계. 도쿄 23구는 하나로 병합해 `13|東京` 으로도 넣는다 */
function loadMunicipalities(): Map<string, Shape> {
  if (muniCache) return muniCache;
  const { raw: topo, objectName, prefIdByName } = loadTopology();
  const collection = topo.objects[objectName] as GeometryCollection<MuniProps>;
  const fc = topoFeature(topo, collection) as FeatureCollection<GeoPolygon | MultiPolygon, MuniProps>;

  const map = new Map<string, Shape>();
  const rank = new Map<string, number>();
  const byPref = new Map<number, Shape[]>();
  fc.features.forEach((f: MuniFeature) => {
    const pid = prefIdByName.get(f.properties.N03_001);
    const name = f.properties.N03_003 ?? f.properties.N03_004;
    if (!pid || !name) return;
    byPref.set(pid, [...(byPref.get(pid) ?? []), f as Shape]);
    const key = `${pid}|${stemName(name)}`;
    const r = muniRank(f.properties);
    if ((rank.get(key) ?? -1) >= r) return;
    rank.set(key, r);
    map.set(key, f as Shape);
  });
  // 도쿄 23구 → '東京' (DB 의 도쿄 도시). 구 사이 경계를 지우고 하나의 MultiPolygon 으로
  const wards = collection.geometries.filter(
    (g): g is TopoPolygon<MuniProps> | TopoMultiPolygon<MuniProps> =>
      (g.type === "Polygon" || g.type === "MultiPolygon") && /^131(0[1-9]|1\d|2[0-3])$/.test((g.properties as MuniProps | undefined)?.N03_007 ?? ""),
  );
  if (wards.length) {
    const tokyoId = prefIdByName.get("東京都");
    if (tokyoId) map.set(`${tokyoId}|東京`, { type: "Feature", properties: {}, geometry: topoMerge(topo, wards) });
  }
  muniCache = map;
  muniByPref = byPref;
  return map;
}

/** 한 현의 모든 시·정·촌(·구) 경계 (도쿄는 23구가 각각) */
export function municipalityShapesOf(prefectureId: number): Shape[] {
  loadMunicipalities();
  // 이름이 같은 시·정(府中市/府中町 등)도 모두 포함해야 하므로 이름 기준 map 이 아니라 전체 목록을 쓴다
  return muniByPref?.get(prefectureId) ?? [];
}

/** DB 도시(name_ja 접미 없음) 에 해당하는 시·정·촌 경계. 없으면 null (사용자 추가 도시, 섬·온천지 등) */
export function municipalityFeature(prefectureId: number, nameJa: string): Shape | null {
  return loadMunicipalities().get(`${prefectureId}|${stemName(nameJa)}`) ?? null;
}

/** 경계를 주어진 투영으로 그린 path d. within 이 있으면 그 상자 안에 완전히 들어올 때만 (인셋 밖으로 새지 않게) */
function shapePath(pathGen: GeoPath, f: Shape | null, within?: { x: number; y: number; w: number; h: number }): string | null {
  if (!f) return null;
  if (within) {
    const [[x0, y0], [x1, y1]] = pathGen.bounds(f);
    if (x0 < within.x || y0 < within.y || x1 > within.x + within.w || y1 > within.y + within.h) return null;
  }
  return pathGen(f) || null;
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
  /** 본섬 기준 경계 상자 [x0, y0, x1, y1] (전국 지도 좌표). 클릭 시 이 범위로 확대 */
  bbox: [number, number, number, number];
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
  /** 도시(시·정·촌) 경계 path. 경계 데이터가 없거나 인셋 밖이면 null */
  shapeFor: (prefectureId: number, nameJa: string) => string | null;
  /** 한 현의 모든 시·정·촌 경계 path (확대 시 구분선용) */
  outlinesFor: (prefectureId: number) => string[];
  /** 상세(원본) 현 경계 path — 확대 시 간략화본을 이것으로 바꿔 시 경계와 끝단을 맞춘다 */
  detailedOutlineFor: (prefectureId: number) => string | null;
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
    const [[x0, y0], [x1, y1]] = p.bounds(mainCluster(f, 0.6));
    return { id: f.properties.id, code: f.properties.code, d: p(f) ?? "", labelX: cx, labelY: cy, bbox: [x0, y0, x1, y1] as [number, number, number, number] };
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

  const shapeFor = (prefectureId: number, nameJa: string) => {
    const f = municipalityFeature(prefectureId, nameJa);
    return prefectureId === OKINAWA_ID ? shapePath(okPath, f, inset) : shapePath(mainPath, f);
  };

  const outlinesFor = (prefectureId: number) =>
    municipalityShapesOf(prefectureId)
      .map((f) => (prefectureId === OKINAWA_ID ? shapePath(okPath, f, inset) : shapePath(mainPath, f)))
      .filter((d): d is string => !!d);

  const detailedOutlineFor = (prefectureId: number) => {
    const f = loadDetailedFeatures().find((x) => x.properties.id === prefectureId);
    if (!f) return null;
    return prefectureId === OKINAWA_ID ? okPath(f) || null : mainPath(f) || null;
  };

  const result: NationalMap = { width, height, inset, prefectures, project, isApproximate, shapeFor, outlinesFor, detailedOutlineFor };
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
  /** 도시(시·정·촌) 경계 path (이 확대 투영 기준) */
  shapeFor: (prefectureId: number, nameJa: string) => string | null;
  /** 한 현의 모든 시·정·촌 경계 path (구분선용) */
  outlinesFor: (prefectureId: number) => string[];
};

const zoomCache = new Map<string, ZoomMap>();

/** 현 확대. 해당 현 bbox + 여백으로 fitExtent, 이웃 현은 같은 투영으로 옅게. */
export function getPrefectureZoom(id: number, width = 790, height = 670): ZoomMap {
  const key = `${id}:${width}x${height}`;
  const hit = zoomCache.get(key);
  if (hit) return hit;

  const features = loadDetailedFeatures();
  const target = features.find((f) => f.properties.id === id);
  if (!target) throw new Error(`prefecture ${id} not found`);

  const pad = Math.round(Math.min(width, height) * 0.09);
  const focus = mainCluster(target);
  const proj: GeoProjection = geoMercator().fitExtent(
    [[pad, pad], [width - pad, height - pad]],
    focus,
  );
  // 확대 화면은 소수 2자리면 충분 (0.01 단위 = 8배 확대 시 0.1px). 경로 문자열이 15% 안팎 줄어든다
  const pathGen = geoPath(proj).digits(2);

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
    shapeFor: (prefectureId, nameJa) => shapePath(pathGen, municipalityFeature(prefectureId, nameJa)),
    outlinesFor: (prefectureId) => municipalityShapesOf(prefectureId).map((f) => shapePath(pathGen, f)).filter((d): d is string => !!d),
  };
  zoomCache.set(key, result);
  return result;
}

export function prefectureIdFromCode(code: string): number | null {
  if (!/^\d{2}$/.test(code)) return null;
  const id = Number(code);
  return id >= 1 && id <= 47 ? id : null;
}

/** 경위도가 해당 현 경계(원거리 도서 포함) 안에 있는지 */
export function isInsidePrefecture(prefectureId: number, lng: number, lat: number): boolean {
  const f = loadDetailedFeatures().find((x) => x.properties.id === prefectureId);
  return f ? geoContains(f, [lng, lat]) : false;
}
