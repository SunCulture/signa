create table public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  source text not null default 'blog_header',
  status text not null default 'subscribed',
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_normalized
    check (email = lower(btrim(email))),
  constraint newsletter_subscribers_email_length
    check (char_length(email) between 3 and 320),
  constraint newsletter_subscribers_email_format
    check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint newsletter_subscribers_source
    check (source in ('blog_header', 'blog_footer')),
  constraint newsletter_subscribers_status
    check (status in ('subscribed', 'unsubscribed'))
);

comment on table public.newsletter_subscribers is
  'Email subscriptions collected by the Signa marketing site.';

alter table public.newsletter_subscribers enable row level security;

revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on sequence public.newsletter_subscribers_id_seq from anon, authenticated;

grant all on table public.newsletter_subscribers to service_role;
grant all on sequence public.newsletter_subscribers_id_seq to service_role;
