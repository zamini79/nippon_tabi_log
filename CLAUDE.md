# 日本タビログ — 나의 일본 여행 지도 (japan-travel-map)

개인용 일본 여행 기록 웹앱. 실제 일본 지도 위에 다녀온 도시·현을 채워가고, 여행별 사진과 앞으로의 계획을 기록한다.
디자인 기준: Claude Design 캔버스 https://claude.ai/artifact/SSNsk7xLVLY54UKLpdCJ3j (6개 화면). 이 캔버스의 레이아웃·색·타이포를 그대로 따른다.

## 스택 (확정)
- Next.js 15 (App Router, TypeScript, Server Components 기본) + Tailwind v4
- Supabase: Postgres + Storage(`trip-photos` private 버킷). **로그인 없음** (2026-09-17 결정) — 개인용 공개 사이트. 읽기는 anon 키(RLS 공개 select), 모든 쓰기는 서버 액션에서 service_role(`lib/supabase/admin.ts`)로만. 테이블에 owner 컬럼 없음
- 지도: `d3-geo`(투영) + 직접 그리는 SVG. Mapbox/Leaflet 같은 타일 지도는 쓰지 않는다 — 지도 자체가 그래픽이고 현 단위 색칠이 핵심이라 SVG가 맞다.
- 이미지: `sharp`로 업로드 시 리사이즈(장변 2000px + 400px 썸네일), `exifr`로 촬영일 추출. 업로드는 Supabase signed upload URL로 클라이언트 → Storage 직접.
- 배포: Vercel (GitHub 연동, main 자동 배포, 프로젝트 `nippon-tabi-log`). 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(서버 전용, 쓰기·시드·이미지 처리).
- 패키지 매니저 pnpm. macOS/zsh 기준으로 명령 작성 (Windows에서도 개발하므로 셸 특화 스크립트 지양, `package.json` scripts로 통일).

## 저장소 구조
```
app/
  (map)/page.tsx            # 1 전국 지도 (홈)
  prefectures/[code]/page.tsx  # 2 현 확대 (code = 01~47)
  prefectures/page.tsx      # 3 47현 채우기
  cities/[id]/page.tsx      # 4 도시 상세 (여행별 카드)
  trips/new/page.tsx        # 5 여행 추가 (route intercept로 모달, 직접 접근 시 페이지)
  trips/[id]/edit/page.tsx
  api/photos/process/route.ts   # 업로드 후 리사이즈·EXIF·DB 반영
components/
  map/JapanMap.tsx          # 전국 SVG. props: mode 'cities' | 'prefectures', stats, lang, onPrefectureClick
  map/PrefectureZoom.tsx    # 현 확대. d3-geo fitExtent로 해당 현 bbox에 맞춤, 이웃 현 옅게
  map/OkinawaInset.tsx
  LangToggle.tsx            # 한글 / 日本語 (zustand + cookie 'lang')
  TripForm.tsx, CitySearch.tsx, PhotoUploader.tsx, StampRow.tsx, ProgressBar.tsx
lib/
  supabase/{server,client,admin}.ts
  geo.ts                    # 투영·경로 생성 (서버에서 1회 계산해 캐시)
  names.ts                  # t(entity, lang) → 이름
data/
  prefectures.json          # 47현 이름·지방
  cities-seed.json          # 주요 도시 48개 시드 (관광지 포함, 이름 갱신용 upsert)
  cities-all.json           # 일본 전체 시(市) 792개 (Wikidata 2026-09-18, ko/ja/en 이름·좌표·현). 없는 것만 추가
  municipalities.topo.json  # 시·구·정·촌 경계 TopoJSON 1.5MB (국토수치정보 N03-21 → smartnews-smri/japan-topography 간략화 1%, 정령지정도시 구 병합). 서버 전용, 국토교통성 출처 표기 필수. **47현 경계도 이 파일에서 시·구·정·촌을 병합해 만든다**(별도 현 GeoJSON 없음, 2026-09-19) — 그래서 현·시 경계 끝단이 정확히 맞는다
supabase/schema.sql
scripts/seed.ts             # prefectures/cities upsert (service role)
```

## 데이터 모델 (supabase/schema.sql 참조)
- `trips` (여행) — status `done | planned`, 기간, 메모, 대표사진
- `visits` (여행 × 도시) — **같은 도시를 여러 번 간 기록은 visits 행 수로 표현**. 도시 방문 횟수 = done 여행의 visits 수
- `photos` — trip 필수, visit 선택(없으면 여행 전체 사진)
- `cities` — 시드 48개 + 전체 시 792개(2026-09-18 추가, 합쳐서 796) + 사용자가 추가하는 `is_custom` 도시. 현(prefecture_id)에 속함. 이름은 접미 없이(札幌/삿포로) 저장
- 현 방문 횟수 = 그 현의 도시를 포함한 **distinct 여행 수** (한 여행에서 오사카·미노오를 가도 오사카부는 1회). 뷰 `v_prefecture_stats`, `v_city_stats` 사용
- 색 단계: 0 미방문 / 1회 / 2회 / 3회+ / 계획(planned만 있음). 도시 점 크기도 같은 3단계

## 지도 구현 규칙
- 경계 LOD(2026-09-19): 전국 지도는 토폴로지를 `topojson-simplify`(quantile 0.35)로 간략화한 현 경계(path 총 ≈350K자), 현 확대 화면·`/api/shapes/[code]`·시 경계는 원본(간략화 1%). 두 본은 같은 점을 공유하므로 3배 이상 확대 시 화면에 보이는 현들을 API 의 상세 `outline` 으로 바꿔 그리면(JapanMap `prefDetail`) 시 구분선·색칠과 어긋나지 않는다. 북방영토 6개 촌·소속미정지는 제외
- 투영: `geoMercator`. 본토는 `fitExtent`로 컨테이너에 맞추고, 오키나와(id 47)는 별도 인셋 박스에 따로 투영 (좌하단, 점선 테두리). 오가사와라 등 lat<30.5 도서는 이미 데이터에서 제외됨
- 전국 지도: 현 경계 `stroke #FFFDF9 0.9px`, 도시 점은 lat/lng를 같은 투영으로. 현 `<path>` hover 시 이름 툴팁, click → `/prefectures/[code]`
- 현 확대: 해당 현 bbox + 여백으로 fitExtent, 이웃 현은 opacity .55, 그 안의 도시 점 + 이름. 브레드크럼 `전국 › 지방 › 현 (› 도시)`
- SVG 경로는 서버 컴포넌트에서 `d3-geo` `geoPath`로 생성해 문자열로 넘긴다 (클라이언트 번들에 geojson 350KB를 넣지 않는다). 확대 뷰용은 요청 시 같은 함수를 bbox에 맞춰 호출
- 라벨 겹침: 전국 지도에서는 방문/계획 현·도시만 라벨. `paint-order: stroke` 흰 테두리 글자
- 시 단위 색칠(2026-09-18): 3배 이상 확대하면 현 전체 대신 다녀온·계획한 시(市) 경계만 색칠한다. `lib/geo.ts` `municipalityFeature(prefectureId, name_ja)` 가 접미(市·町·村·区) 뗀 이름으로 경계를 찾고(같은 이름이면 市 > 区 > 町村, 도쿄 23구는 `topojson.merge` 로 합쳐 `東京`), `NationalMap.shapeFor` / `ZoomMap.shapeFor` 가 path d 를 만든다. 방문·계획 도시에만 `MapCity.d` / `ZoomCityView.d` 를 넣고, 경계가 있는 시를 가진 현만 현 색을 뺀다(사용자 추가 도시·섬 등 경계 없는 곳은 점만). 현 확대 화면은 항상 시 단위. 같은 배율부터 보고 있는 현의 모든 시·정·촌 구분선(`.mb`, 모래색 0.8px)을 그린다 — 전국 지도는 `/api/shapes/[code]`(하루 캐시)로 그 현만 받아오고(`NationalMap.outlinesFor`), 현 확대 화면은 `ZoomMap.outlinesFor` 를 props 로. 구분선 목록은 이름 중복(府中市/府中町)과 무관하게 전체(`municipalityShapesOf`)
- 확대·이동(2026-09-18): `components/map/useMapZoom.ts` 가 viewBox 를 바꿔 휠(커서 중심)·드래그 이동·＋/－/전체 버튼(`MapZoomControls`, 배지는 버튼 위)을 제공. 전국 지도는 최대 40배(가장 작은 현이 꽉 차는 배율), 현 확대는 8배. 전국 지도에서 현을 클릭하면 페이지 이동 대신 그 현의 `bbox`(lib/geo, 본섬 기준)로 애니메이션 확대(`fitTo`), 이미 보고 있는 현(화면 중심이 든 가장 작은 현, 2.5배 이상)을 다시 클릭하거나 왼쪽 위 패널의 '현 화면 →'을 누르면 `/prefectures/[code]`. 6배 이상이면 화면 안 미방문 도시도 표시하고, 화면 밖 현 경로는 그리지 않는다(컬링). 점 반지름·글자 크기·라벨 겹침 거리는 `zoom.screenK`(화면 1px 당 viewBox 단위 = max(1/배율, viewBox폭/실제 그려진 폭), ResizeObserver 로 측정)를 곱해 모바일 축소·확대와 무관하게 같은 픽셀 크기(라벨 12px)를 유지하고, 경계선은 `vector-effect: non-scaling-stroke`. 전체 보기 상태에서 축소 방향 휠은 페이지 스크롤로 넘긴다. 터치는 두 손가락 핀치(중심 고정)로 확대·축소, 전체 보기에서 한 손가락은 페이지 스크롤(touch-action pan-y), 확대 뒤 한 손가락은 지도 이동(touch-action none, touchmove preventDefault). 드래그 뒤 click 은 삼킨다(현/도시 링크 오작동 방지). 도시 추가 클릭 좌표는 `toViewBox()` 로 변환

## 언어 전환
- 모든 지명(도시·현·지방)은 DB에 `name_ko`/`name_ja` 둘 다 있음. `lang` 상태는 zustand + cookie, 서버 렌더에서도 cookie 읽어 초기값. 전환은 클라이언트에서 즉시(재조회 없음)
- 현 이름 접미 규칙: 도쿄도/京都府/大阪府/北海道/그 외 -현/-県. `prefectures.name_ko`에 이미 반영됨, 짧은 이름은 `name_ko_short`
- 일본어 표시 시 폰트 스택에 `Noto Serif JP` 추가

## 디자인 토큰 (캔버스와 동일)
```
--bg #F4EFE6  --card #FFFDF9  --line #E3DBCC  --ink #1E2429  --muted #6B655B
--v1 #F0C9BC  --v2 #E09B87  --v3 #C9412F(주홍, 강조색)  --plan #3B6B8F  --plan-bg #DCE7EF  --land #E6DCC8
display: 'Gowun Batang' (Google Fonts)  body: 'IBM Plex Sans KR'  ja: 'Noto Serif JP'
radius: 카드 16~20px, 칩 999px. 이모지·그라데이션 사용 금지. 아이콘은 인라인 stroke SVG
```

## 화면별 요구사항
1. **전국 지도(홈)**: 필터(전체/다녀온 곳/계획), 범례, 요약 3칸(도시·여행·현 13/47), 47현 진행 바, 다가오는 여행(D-day), 최근 여행 3개
2. **현 확대**: 위 규칙. 오른쪽에 현 스탬프(연도), 현 방문/도시/사진 수, 이 현의 도시 목록(방문 횟수 배지, 계획은 점선), 아직 안 간 곳 칩 + 도시 추가, 이웃 현 요약
3. **47현 채우기**: 전국 choropleth + 지방별(8개) 진행 바와 47현 칩. "다음 목표" 문구는 규칙 기반: 미방문 현이 가장 많이 몰린 지방 하나 제안
4. **도시 상세**: 방문 스탬프 행 + `+`, 여행별 카드(제목·기간·사진 그리드·함께 간 도시 칩·메모), 다음 방문 아이디어(planned trip 연결), 이 도시로 채운 현
5. **여행 추가/수정**: status 토글, 제목, 기간, 도시 다중 선택(검색, "N회째/첫 방문" 표시), **선택한 도시 → 채워지는 현 자동 표시("나라현 · 새 현!")**, 사진 드롭존(사진별 도시 지정 선택), 메모. 저장 후 도시 상세로
6. **모바일**: 홈은 지도+요약+최근 여행, 하단 탭 4개. 데스크톱(md 이상)은 왼쪽 세로 메뉴(`SideNav`) : 지도 : 세부 = 1 : 6 : 3 (2026-09-18), 서비스명 표시는 `日本タビログ`. 여행 중 사진 업로드가 주 용도 → 업로드 UX 우선

## 마일스톤 (이 순서로, 각 단계 끝에 Vercel preview 배포) — 2026-09-18 기준 1~5 모두 완료, 프로덕션 https://nippon-tabi-log.vercel.app
1. 프로젝트 생성, Supabase 연결, schema 적용, seed. 빈 지도(전국·현 확대)가 실제 경계로 그려짐 (로그인은 제거됨)
2. trips/visits CRUD + 지도 색칠·점 크기·통계 뷰 연동. 언어 토글
3. 사진 업로드(signed URL → Storage → process route) + 도시 상세 갤러리
4. 계획(planned) 흐름, D-day, 47현 화면, 다음 목표 제안
5. 모바일 다듬기, OG 이미지(현재 지도 스냅샷), PWA 홈화면 추가

## 작업 규칙
- 매 작업 전 이 파일과 `supabase/schema.sql`을 읽는다. 스키마 변경은 `supabase/migrations/`에 새 파일로, schema.sql도 갱신
- 서버 액션 사용, API route는 파일 처리에만. 읽기는 서버 컴포넌트에서 anon 클라이언트, 쓰기는 서버 액션에서 admin(service_role) 클라이언트. 클라이언트 번들에 service_role 이 들어가지 않는지 항상 확인
- 지명 텍스트를 코드에 하드코딩하지 않는다 — 항상 `t()`
- 확인 안 된 라이브러리 API는 추측하지 말고 문서를 확인. 커밋 메시지는 한국어, 작은 단위

## 배포 메모 (2026-09-18)
- Vercel: `vercel.json` 에 `framework: nextjs`, `installCommand: npx pnpm@12.4.2 install --frozen-lockfile`, `buildCommand: next build --turbopack`. pnpm 12 의 자체 버전 관리 래퍼가 Vercel 에서 깨지므로 pnpm 을 거치지 않고 실행한다
- pnpm 은 `pnpm-workspace.yaml` 의 `nodeLinker: hoisted` (평탄한 node_modules). isolated 레이아웃에서는 sharp 의 `@img/sharp-linux-x64` 가 함수 번들에 들어가지 않는다. `next.config.ts` 의 `outputFileTracingIncludes` 로 `node_modules/@img/**` 를 처리 라우트에 포함
- 서버 액션의 `redirect()` 는 route-intercept 모달 안에서 라우터를 움직이지 않는다 → `saveTrip` 은 `{ redirectTo }` 를 돌려주고 클라이언트가 이동
- Satori(OG 이미지): Fragment 는 행 컨테이너처럼 배치되니 column div 로 감싼다. Google Fonts 는 옛 UA 로 요청하면 WOFF 로 온다
