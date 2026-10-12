-- Read only. Request with the explicit WorkBuddy applicationId, one statement.
SELECT jsonb_build_object(
  'target_matches',current_database()='postgres-lgjvhh7s' AND current_user='cloudbase_postgres_postgres_lgjvhh7s',
  'database',current_database(),'operator',current_user,'server_version',current_setting('server_version'),
  'private_schema',to_regnamespace('beauty_review_private') IS NOT NULL,
  'pgcrypto',(SELECT jsonb_agg(jsonb_build_object('version',e.extversion,'schema',n.nspname,'owner',pg_get_userbyid(e.extowner))) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto'),
  'role_parents',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'parent',p.rolname)) FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles p ON p.oid=m.roleid WHERE r.rolname IN ('anon','authenticated')),
  'auth_uid_type',pg_get_function_result('auth.uid()'::regprocedure),
  'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',udt_name,'nullable',is_nullable,'default',column_default,'identity',is_identity) ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('user_products','user_profiles')),
  'rls',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity,'owner',pg_get_userbyid(c.relowner))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('user_products','user_profiles')),
  'policies',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname='public' AND tablename IN ('user_products','user_profiles')),
  'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'definition',pg_get_constraintdef(c.oid))) FROM pg_constraint c WHERE c.conrelid IN ('public.user_products'::regclass,'public.user_profiles'::regclass)),
  'effective_column_writes',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'table',c.table_name,'column',c.column_name,'insert',has_column_privilege(r.rolname,'public.'||c.table_name,c.column_name,'INSERT'),'update',has_column_privilege(r.rolname,'public.'||c.table_name,c.column_name,'UPDATE'),'references',has_column_privilege(r.rolname,'public.'||c.table_name,c.column_name,'REFERENCES'))) FROM pg_roles r CROSS JOIN information_schema.columns c WHERE r.rolname IN ('anon','authenticated') AND c.table_schema='public' AND c.table_name IN ('user_products','user_profiles'))
) AS deployment_preflight;
