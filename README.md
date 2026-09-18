# 日本タビログ (나의 일본 여행 지도)

개인용 일본 여행 기록 웹앱. 다녀온 도시·현을 실제 지도 위에 채워가고, 여행별 사진과 계획을 기록한다.
사양·규칙은 `CLAUDE.md`, 스키마는 `supabase/schema.sql` 참조.

## 데이터 출처
- `data/municipalities.topo.json`: 「国土数値情報（行政区域データ）」（国土交通省）을 スマートニュース メディア研究所가 간략화(1%)·정령지정도시 병합한 [japan-topography](https://github.com/smartnews-smri/japan-topography)(N03-21, 2021-01-01) 파일. 국토교통성 출처 표기가 필요하다.

## 시작하기

```bash
corepack pnpm install
cp .env.example .env.local   # Supabase 값 채우기
corepack pnpm seed           # prefectures 47 · cities 48 upsert (service role)
corepack pnpm dev
```

### Supabase 준비 (1회)

1. SQL Editor 에서 `supabase/migrations/` 파일을 순서대로 실행 (또는 MCP `apply_migration`)
2. `supabase/seed.sql` 실행 → 현 47 · 도시 48
3. `trip-photos` 비공개 버킷은 마이그레이션 SQL 이 생성한다

로그인은 없다. 읽기는 anon 키로 공개, 쓰기는 서버에서 service_role 키로만 수행하므로 `SUPABASE_SERVICE_ROLE_KEY` 를 Vercel 환경변수에도 넣어야 한다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 (Turbopack) |
| `pnpm build` / `pnpm start` | 프로덕션 빌드·실행 |
| `pnpm seed` | 참조 데이터 시드 |
| `pnpm typecheck` / `pnpm lint` | 타입·린트 검사 |

## 구조

- `app/(map)` 전국 지도(홈) · `app/prefectures/[code]` 현 확대 · `app/prefectures` 47현
- `components/map` SVG 지도 컴포넌트 (경로 문자열은 서버에서 `lib/geo.ts` 가 생성)
- `lib/supabase` 서버(anon 읽기)·admin(service_role 쓰기) 클라이언트
- `data/` 47현 GeoJSON, 현·도시 시드 JSON
