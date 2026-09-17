/**
 * prefectures / cities 시드 (service_role 로 upsert)
 * 실행: pnpm seed   (.env.local 의 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용)
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local)");
  process.exit(1);
}

type PrefSeed = {
  id: number;
  name_ko: string;
  name_ko_short: string;
  name_ja: string;
  name_en: string;
  region: string;
  region_ko: string;
  region_ja: string;
};
type CitySeed = {
  name_ko: string;
  name_ja: string;
  name_en: string;
  prefecture_id: number;
  lat: number;
  lng: number;
};

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8")) as T;
}

async function main() {
  const supabase = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const prefectures = readJson<PrefSeed[]>("data/prefectures.json").map((p) => ({
    ...p,
    code: String(p.id).padStart(2, "0"),
  }));
  const { error: pErr } = await supabase.from("prefectures").upsert(prefectures, { onConflict: "id" });
  if (pErr) throw pErr;
  console.log(`prefectures: ${prefectures.length} upserted`);

  const cities = readJson<CitySeed[]>("data/cities-seed.json").map((c) => ({
    ...c,
    is_custom: false,
  }));
  const { error: cErr } = await supabase
    .from("cities")
    .upsert(cities, { onConflict: "prefecture_id,name_ja", ignoreDuplicates: false });
  if (cErr) throw cErr;
  console.log(`cities: ${cities.length} upserted`);

  const { count } = await supabase.from("cities").select("*", { count: "exact", head: true });
  console.log(`cities in db: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
