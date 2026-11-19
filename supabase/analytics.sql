-- CampusNotes analytics: run this once in Supabase > SQL Editor.
create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  text        not null,           -- anonymous random id kept in the browser
  event       text        not null,           -- page_view | module_view | summary_generated | quiz_completed | module_completed | tutor_message
  course_id   text,
  module_id   text,
  value       numeric,                        -- e.g. quiz score in percent
  meta        jsonb       not null default '{}'::jsonb
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_idx   on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_module_idx  on public.analytics_events (module_id);

-- The app writes through the server (service key), so the public API gets no direct access.
alter table public.analytics_events enable row level security;
