create table public.docs_page_feedback (
  id bigint generated always as identity primary key,
  response_id uuid not null unique,
  path text not null,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint docs_page_feedback_path_length
    check (char_length(path) between 2 and 180),
  constraint docs_page_feedback_path_format
    check (
      path ~ '^/(docs(/.*)?|guides(/.*)?|resources(/.*)?|compliance|qualified-electronic-signature)$'
    )
);

comment on table public.docs_page_feedback is
  'Anonymous helpfulness responses submitted from Signa documentation pages.';

alter table public.docs_page_feedback enable row level security;

revoke all on table public.docs_page_feedback from anon, authenticated;
revoke all on sequence public.docs_page_feedback_id_seq from anon, authenticated;

grant select, insert, update on table public.docs_page_feedback to service_role;
grant usage, select on sequence public.docs_page_feedback_id_seq to service_role;
