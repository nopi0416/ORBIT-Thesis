create table if not exists public.tblbudgetconfigurationlogs (
  log_id uuid not null default gen_random_uuid(),
  budget_id uuid not null,
  action_type character varying(50) null,
  description text null,
  performed_by uuid not null,
  performed_at timestamp with time zone null default now(),
  old_value text null,
  new_value text null,
  ip_address character varying(45) null,
  user_agent text null,
  constraint tblbudgetconfigurationlogs_pkey primary key (log_id),
  constraint fk_budget_config_log_budget foreign key (budget_id)
    references public.tblbudgetconfiguration (budget_id)
    on delete cascade
) tablespace pg_default;

create index if not exists idx_budget_config_logs_budget_id
  on public.tblbudgetconfigurationlogs using btree (budget_id)
  tablespace pg_default;

create index if not exists idx_budget_config_logs_performed_by
  on public.tblbudgetconfigurationlogs using btree (performed_by)
  tablespace pg_default;

create index if not exists idx_budget_config_logs_performed_at
  on public.tblbudgetconfigurationlogs using btree (performed_at desc)
  tablespace pg_default;
