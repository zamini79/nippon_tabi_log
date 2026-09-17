-- 로그인 제거 (2026-09-17 결정): owner 컬럼과 auth.uid() 기반 정책을 없애고 공개 읽기로 전환.
-- 쓰기는 서버(service_role)에서만 — anon 에게 insert/update/delete 정책을 주지 않는다. MCP apply_migration 으로 적용 완료.

drop view if exists public.v_city_stats;
drop view if exists public.v_prefecture_stats;

drop policy if exists "cities read"   on public.cities;
drop policy if exists "cities insert" on public.cities;
drop policy if exists "cities update" on public.cities;
drop policy if exists "trips owner"   on public.trips;
drop policy if exists "visits owner"  on public.visits;
drop policy if exists "photos owner"  on public.photos;
drop policy if exists "trip-photos owner rw" on storage.objects;

drop index if exists public.visits_owner_city_id_idx;
alter table public.cities drop column if exists owner;
alter table public.trips  drop column if exists owner;
alter table public.visits drop column if exists owner;
alter table public.photos drop column if exists owner;
create index if not exists visits_city_id_idx on public.visits (city_id);

create policy "cities public read" on public.cities for select using (true);
create policy "trips public read"  on public.trips  for select using (true);
create policy "visits public read" on public.visits for select using (true);
create policy "photos public read" on public.photos for select using (true);

create view public.v_city_stats with (security_invoker = true) as
select
  c.id as city_id, c.prefecture_id, c.name_ko, c.name_ja, c.lat, c.lng,
  count(*) filter (where t.status = 'done')    as visit_count,
  count(*) filter (where t.status = 'planned') as planned_count,
  max(t.end_date)   filter (where t.status = 'done') as last_visit,
  min(t.start_date) filter (where t.status = 'done') as first_visit
from public.cities c
join public.visits v on v.city_id = c.id
join public.trips  t on t.id = v.trip_id
group by c.id;

create view public.v_prefecture_stats with (security_invoker = true) as
select
  p.id as prefecture_id, p.region,
  count(distinct t.id) filter (where t.status = 'done')    as visit_count,
  count(distinct t.id) filter (where t.status = 'planned') as planned_count,
  count(distinct c.id) filter (where t.status = 'done')    as city_count
from public.prefectures p
join public.cities c on c.prefecture_id = p.id
join public.visits v on v.city_id = c.id
join public.trips  t on t.id = v.trip_id
group by p.id;
