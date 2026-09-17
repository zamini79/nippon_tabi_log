# 나의 일본 여행 지도

개인용 일본 여행 기록 웹앱. 다녀온 도시·현을 실제 지도 위에 채워가고, 여행별 사진과 계획을 기록한다.
사양·규칙은 `CLAUDE.md`, 스키마는 `supabase/schema.sql` 참조.

## 시작하기

```bash
corepack pnpm install
cp .env.example .env.local   # Supabase 값 채우기
corepack pnpm seed           # prefectures 47 · cities 48 upsert (service role)
corepack pnpm dev
```

### Supabase 준비 (1회)

1. 프로젝트 생성 후 SQL Editor 에서 `supabase/migrations/20260917000000_init.sql` 실행
2. Storage 에 `trip-photos` 버킷(private) 생성 — 정책은 위 SQL 에 포함
3. Authentication → URL Configuration: Site URL 과 Redirect URLs 에 `http://localhost:3000/auth/confirm`, 배포 도메인 `/auth/confirm` 추가
4. (권장) Authentication → Email Templates → Magic Link 본문을 아래로 바꾸면 다른 기기에서 링크를 열어도 로그인된다
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">로그인</a>
   ```
5. `.env.local` 의 `AUTH_ALLOWED_EMAIL` 에 본인 이메일을 넣으면 그 주소만 로그인 링크를 받을 수 있다

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
- `lib/supabase` 서버·브라우저·admin 클라이언트, `middleware.ts` 세션 갱신·로그인 보호
- `data/` 47현 GeoJSON, 현·도시 시드 JSON
