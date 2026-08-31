-- ============================================================
-- DyadIQ — Supabase-Setup
-- Einmal komplett in den SQL Editor von Supabase kopieren
-- (Dashboard → SQL Editor → New query → Run).
-- ============================================================

-- 1) Abgaben der Gruppen -------------------------------------
create table if not exists public.submissions (
  id            bigint generated always as identity primary key,
  created_at    timestamptz  not null default now(),
  task          smallint     not null check (task between 1 and 3),
  group_name    text         not null check (char_length(group_name) between 1 and 60),
  answers       jsonb        not null default '{}'::jsonb,
  -- Altlast aus einer früheren Aufgabenfassung ("Kernaussage"); wird nicht
  -- mehr gefüllt, bleibt aber für alte Probelaeufe erhalten.
  key_statement text
);

-- 2) Zustand der Session (genau eine Zeile) -------------------
create table if not exists public.session_state (
  id              smallint    primary key default 1 check (id = 1),
  discussion_open boolean     not null default false,
  reveal_open     boolean     not null default false,
  updated_at      timestamptz not null default now()
);

insert into public.session_state (id) values (1)
  on conflict (id) do nothing;

-- 3) Row Level Security --------------------------------------
alter table public.submissions   enable row level security;
alter table public.session_state enable row level security;

drop policy if exists "read submissions"   on public.submissions;
drop policy if exists "insert submissions" on public.submissions;
drop policy if exists "delete submissions" on public.submissions;
drop policy if exists "read state"         on public.session_state;
drop policy if exists "update state"       on public.session_state;

-- Jeder mit dem Link darf Abgaben lesen, neue anlegen und löschen.
-- Ändern ist nicht möglich. Löschen braucht es, damit die Moderation
-- Probeläufe wieder aufräumen kann; die Schaltflächen dafür sind nur
-- über ?presenter=CODE sichtbar.
create policy "read submissions"   on public.submissions
  for select to anon using (true);
create policy "insert submissions" on public.submissions
  for insert to anon with check (true);
create policy "delete submissions" on public.submissions
  for delete to anon using (true);

-- Zustand darf gelesen und umgeschaltet werden.
-- (Die Moderationsansicht ist nur über ?presenter=CODE erreichbar –
--  das ist eine Hürde, kein echter Schutz. Für eine Präsentation
--  in der eigenen Zenturie ist das ausreichend.)
create policy "read state"   on public.session_state
  for select to anon using (true);
create policy "update state" on public.session_state
  for update to anon using (true) with check (true);

-- Hinweis zum Feld answers: es enthaelt
--   { "items": [ { "label": "Frage 1", "value": "B P3 – ..." }, ... ] }
-- also die vollstaendigen Antworten in Anzeigereihenfolge. value ist ein
-- String oder, bei Mehrfachauswahl, ein Array von Strings.

-- ============================================================
-- Nach der Präsentation aufräumen:
--   truncate public.submissions;
--   update public.session_state set discussion_open = false, reveal_open = false where id = 1;
-- ============================================================
