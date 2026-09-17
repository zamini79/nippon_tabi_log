-- 나의 일본 여행 지도 — Supabase schema v0.2
-- 변경 이력은 supabase/migrations/ 에 새 파일로. 이 파일은 항상 현재 전체 스키마.
-- 실행: Supabase SQL Editor 또는 `supabase db push`
-- 원칙: 개인용(단일 사용자). 모든 사용자 데이터 테이블은 owner = auth.uid() RLS.

create extension if not exists "pgcrypto";

-- ---------- 정적 참조 데이터 (공개 읽기) ----------
create table if not exists prefectures (
  id            smallint primary key,          -- 1(北海道) ~ 47(沖縄), JIS X 0401
  code          char(2) not null unique,
  name_ko       text not null,                 -- 오사카부
  name_ko_short text not null,                 -- 오사카
  name_ja       text not null,                 -- 大阪府
  name_en       text not null,
  region        text not null,                 -- hokkaido | tohoku | kanto | chubu | kansai | chugoku | shikoku | kyushu
  region_ko     text not null,
  region_ja     text not null
);

create table if not exists cities (
  id            uuid primary key default gen_random_uuid(),
  prefecture_id smallint not null references prefectures(id),
  name_ko       text not null,
  name_ja       text not null,
  name_en       text,
  lat           double precision not null,
  lng           double precision not null,
  is_custom     boolean not null default false, -- 사용자가 직접 추가한 도시
  owner         uuid references auth.users(id), -- is_custom=true 일 때만
  created_at    timestamptz not null default now(),
  unique (prefecture_id, name_ja)
);

-- ---------- 사용자 데이터 ----------
create type trip_status as enum ('done', 'planned');

create table if not exists trips (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) default auth.uid(),
  title       text not null,                   -- "가을 단풍, 교토와 나라까지"
  status      trip_status not null default 'done',
  start_date  date,
  end_date    date,
  companions  smallint,                        -- 동행 인원(본인 포함)
  memo        text,
  cover_photo uuid,                            -- photos.id (FK는 photos 생성 후 추가)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- 여행 × 도시 = 방문 1회. 같은 도시를 여러 여행에서 가면 여러 행.
create table if not exists visits (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) default auth.uid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  city_id     uuid not null references cities(id),
  seq         smallint not null default 1,     -- 여행 내 방문 순서
  nights      smallint,
  memo        text,
  created_at  timestamptz not null default now(),
  unique (trip_id, city_id)
);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users(id) default auth.uid(),
  trip_id       uuid not null references trips(id) on delete cascade,
  visit_id      uuid references visits(id) on delete set null, -- null = 여행 전체 사진
  storage_path  text not null,                 -- trip-photos/{owner}/{trip_id}/{uuid}.jpg
  width         int,
  height        int,
  taken_at      timestamptz,                   -- EXIF
  caption       text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

alter table trips
  add constraint trips_cover_photo_fk foreign key (cover_photo) references photos(id) on delete set null;

create index on visits (owner, city_id);
create index on photos (trip_id, sort_order);
create index on cities (prefecture_id);

-- ---------- 집계 뷰 (지도 색칠용) ----------
-- 도시별 방문 횟수 / 계획 여부
create or replace view v_city_stats with (security_invoker = true) as
select
  c.id as city_id, c.prefecture_id, c.name_ko, c.name_ja, c.lat, c.lng,
  v.owner,
  count(*) filter (where t.status = 'done')    as visit_count,
  count(*) filter (where t.status = 'planned') as planned_count,
  max(t.end_date) filter (where t.status = 'done') as last_visit,
  min(t.start_date) filter (where t.status = 'done') as first_visit
from cities c
join visits v on v.city_id = c.id
join trips  t on t.id = v.trip_id
group by c.id, v.owner;

-- 현별 방문 횟수 = 그 현의 도시를 포함한 여행 수(distinct trip)
create or replace view v_prefecture_stats with (security_invoker = true) as
select
  p.id as prefecture_id, p.region, v.owner,
  count(distinct t.id) filter (where t.status = 'done')    as visit_count,
  count(distinct t.id) filter (where t.status = 'planned') as planned_count,
  count(distinct c.id) filter (where t.status = 'done')    as city_count
from prefectures p
join cities c on c.prefecture_id = p.id
join visits v on v.city_id = c.id
join trips  t on t.id = v.trip_id
group by p.id, v.owner;

-- ---------- RLS ----------
alter table prefectures enable row level security;
alter table cities      enable row level security;
alter table trips       enable row level security;
alter table visits      enable row level security;
alter table photos      enable row level security;

create policy "prefectures public read" on prefectures for select using (true);
create policy "cities read"   on cities for select using (is_custom = false or owner = auth.uid());
create policy "cities insert" on cities for insert with check (is_custom = true and owner = auth.uid());
create policy "cities update" on cities for update using (owner = auth.uid());

create policy "trips owner"  on trips  for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "visits owner" on visits for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "photos owner" on photos for all using (owner = auth.uid()) with check (owner = auth.uid());

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trips_updated_at before update on trips for each row execute function set_updated_at();

-- ---------- Storage ----------
-- 버킷: trip-photos (private). 대시보드에서 생성 후 아래 정책 적용.
-- insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', false);
create policy "trip-photos owner rw" on storage.objects
  for all using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check  (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 시드 ----------
-- data/prefectures.json → prefectures, data/cities-seed.json → cities (is_custom=false, owner=null)
-- scripts/seed.ts 에서 service_role 키로 upsert.
