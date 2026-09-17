-- 원격 프로젝트에는 schema v0.1(security_invoker 없음)이 SQL Editor 로 먼저 적용됨.
-- 뷰가 RLS 를 우회하지 않도록 security_invoker 적용 (schema.sql v0.2 와 동기화). MCP apply_migration 으로 적용 완료.
alter view public.v_city_stats set (security_invoker = true);
alter view public.v_prefecture_stats set (security_invoker = true);
