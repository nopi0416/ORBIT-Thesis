CREATE TABLE IF NOT EXISTS public.tblusersession (
  session_id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  otp_code text null,
  is_verified boolean null default false,
  expires_at timestamp with time zone null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint tblusersession_pkey primary key (session_id)
);

CREATE INDEX IF NOT EXISTS idx_tblusersession_user_id
  ON public.tblusersession (user_id);

CREATE INDEX IF NOT EXISTS idx_tblusersession_verified
  ON public.tblusersession (is_verified);
