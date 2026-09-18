import { ImageResponse } from "next/og";
import { getCities, getCityStats, getPrefectureStats, getTrips } from "@/lib/data";
import { getNationalMap, OKINAWA_ID } from "@/lib/geo";
import { levelOf } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "日本タビログ — 지금까지 채운 도시와 현";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FILL: Record<string, string> = { "0": "#E6DCC8", "1": "#F0C9BC", "2": "#E09B87", "3": "#C9412F", plan: "#DCE7EF" };

/** Google Fonts 에서 필요한 글자만 TTF 로 받아 Satori 에 넘긴다 (실패하면 글자 없이 지도만) */
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();
function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}:${text}`;
  if (!fontCache.has(key)) {
    fontCache.set(
      key,
      (async () => {
        try {
          const css = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
            { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36" } },
          ).then((r) => r.text());
          const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
          if (!url) return null;
          return await fetch(url).then((r) => r.arrayBuffer());
        } catch {
          return null;
        }
      })(),
    );
  }
  return fontCache.get(key)!;
}

export default async function OpenGraphImage() {
  const [prefStats, cityStats, cities, trips] = await Promise.all([getPrefectureStats(), getCityStats(), getCities(), getTrips()]);
  const map = getNationalMap(700, 760);
  const statById = new Map(prefStats.map((s) => [s.prefecture_id, s]));
  const cityStatById = new Map(cityStats.map((s) => [s.city_id, s]));

  // 지도 SVG (현재 방문 상태로 색칠 + 방문 도시 점)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.width} ${map.height}" width="${map.width}" height="${map.height}">`;
  for (const p of map.prefectures) {
    const s = statById.get(p.id);
    const level = levelOf(s?.visit_count ?? 0, s?.planned_count ?? 0);
    const dash = level === "plan" ? ` stroke="#3B6B8F" stroke-width="1.4" stroke-dasharray="3 2"` : ` stroke="#FFFDF9" stroke-width="0.9"`;
    svg += `<path d="${p.d}" fill="${FILL[String(level)]}"${dash} stroke-linejoin="round"/>`;
  }
  svg += `<rect x="${map.inset.x}" y="${map.inset.y}" width="${map.inset.w}" height="${map.inset.h}" rx="10" fill="none" stroke="#D6CBB5" stroke-dasharray="4 4"/>`;
  for (const c of cities) {
    const s = cityStatById.get(c.id);
    const n = s?.visit_count ?? 0;
    if (n === 0 && !(s?.planned_count ?? 0)) continue;
    const [x, y] = map.project(c.lng, c.lat, c.prefecture_id);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (c.prefecture_id === OKINAWA_ID && (x < map.inset.x || x > map.inset.x + map.inset.w)) continue;
    const r = n >= 3 ? 11 : n === 2 ? 9 : n === 1 ? 7 : 7;
    svg += n > 0
      ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#C9412F" stroke="#FFFDF9" stroke-width="2.5"/>`
      : `<circle cx="${x}" cy="${y}" r="${r}" fill="#DCE7EF" stroke="#3B6B8F" stroke-width="2" stroke-dasharray="3 2"/>`;
  }
  svg += `</svg>`;
  const mapSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  const visitedCities = cityStats.filter((s) => s.visit_count > 0).length;
  const visitedPrefs = prefStats.filter((s) => s.visit_count > 0).length;
  const doneTrips = trips.filter((t) => t.status === "done").length;
  const pct = Math.round((visitedPrefs / 47) * 100);

  const title = "日本タビログ";
  const lines = [`${visitedCities}개 도시`, `${visitedPrefs} / 47현`, `${doneTrips}번의 여행`, `${pct}% 채웠어요`];
  const bodyChars = Array.from(new Set((lines.join("") + "0123456789/%").split(""))).join("");
  // 제목은 일본어(가타카나) → Noto Serif JP, 본문 수치는 한국어 → IBM Plex Sans KR
  const [display, body] = await Promise.all([loadFont("Noto Serif JP", 700, title), loadFont("IBM Plex Sans KR", 500, bodyChars)]);
  const fonts = [
    ...(display ? [{ name: "display", data: display, weight: 700 as const, style: "normal" as const }] : []),
    ...(body ? [{ name: "body", data: body, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const canText = fonts.length > 0;
  const displayFamily = display ? "display" : "body";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: 1200, height: 630, background: "#F4EFE6", color: "#1E2429", fontFamily: "body" }}>
        <div style={{ display: "flex", width: 560, height: 630, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <img src={mapSrc} width={540} height={586} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 22, padding: "60px 64px 60px 24px", width: 640, height: 630 }}>
          {canText ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", fontFamily: displayFamily, fontSize: 56, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15, height: 66, flexShrink: 0 }}>{title}</div>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14, height: 56, flexShrink: 0 }}>
                {lines.slice(0, 3).map((l) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", height: 56, padding: "0 18px", borderRadius: 14, background: "#FFFDF9", border: "1px solid #E3DBCC", fontSize: 24, fontWeight: 500 }}>
                    {l}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 552, flexShrink: 0 }}>
                <div style={{ display: "flex", width: 552, height: 14, borderRadius: 999, background: "#EDE4D3", overflow: "hidden" }}>
                  <div style={{ display: "flex", width: Math.max(14, Math.round(552 * pct / 100)), height: 14, background: "#C9412F" }} />
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#6B655B", height: 30 }}>{lines[3]}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", width: 552, height: 14, borderRadius: 999, background: "#EDE4D3", overflow: "hidden" }}>
              <div style={{ display: "flex", width: Math.max(14, Math.round(552 * pct / 100)), height: 14, background: "#C9412F" }} />
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
