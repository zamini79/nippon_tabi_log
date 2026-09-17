-- 보안 어드바이저(function_search_path_mutable): 트리거 함수 search_path 고정. MCP apply_migration 으로 적용 완료.
alter function public.set_updated_at() set search_path = '';
