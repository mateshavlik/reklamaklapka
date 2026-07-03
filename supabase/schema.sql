-- ============================================================
--  REKLAMA KLAPKA — Volné reklamní plochy
--  Supabase schéma: tabulka + RLS + Storage
--  Spusť CELÉ v Supabase → SQL Editor → New query → Run.
-- ============================================================

-- 1) TABULKA -------------------------------------------------
create table if not exists public.plochy (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  nazev        text not null,
  adresa       text,
  gps          text,                       -- "50.681,14.531" nebo odkaz na mapu
  rozmery      text,                       -- např. "6 × 3 m"
  popis        text,
  stav         text not null default 'volna',   -- 'volna' | 'obsazena'
  hlavni_foto  text,                        -- veřejná URL hlavní fotky
  fotky        jsonb not null default '[]', -- pole veřejných URL fotek galerie
  skryta       boolean not null default false,
  pripnuta     boolean not null default false,
  poradi       integer not null default 0
);

-- auto updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_plochy_updated on public.plochy;
create trigger trg_plochy_updated before update on public.plochy
  for each row execute function public.set_updated_at();

-- 2) RLS (Row Level Security) --------------------------------
alter table public.plochy enable row level security;

-- Veřejnost (anon) smí ČÍST jen neskryté plochy
drop policy if exists "public read visible" on public.plochy;
create policy "public read visible" on public.plochy
  for select to anon, authenticated
  using (skryta = false);

-- Přihlášený admin smí číst/přidávat/upravovat/mazat vše
drop policy if exists "auth read all" on public.plochy;
create policy "auth read all" on public.plochy
  for select to authenticated using (true);

drop policy if exists "auth insert" on public.plochy;
create policy "auth insert" on public.plochy
  for insert to authenticated with check (true);

drop policy if exists "auth update" on public.plochy;
create policy "auth update" on public.plochy
  for update to authenticated using (true) with check (true);

drop policy if exists "auth delete" on public.plochy;
create policy "auth delete" on public.plochy
  for delete to authenticated using (true);

-- 3) STORAGE (fotky ploch) -----------------------------------
insert into storage.buckets (id, name, public)
values ('plochy-fotky', 'plochy-fotky', true)
on conflict (id) do nothing;

-- Veřejné čtení fotek
drop policy if exists "plochy public read" on storage.objects;
create policy "plochy public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'plochy-fotky');

-- Nahrávání / mazání jen pro přihlášeného admina
drop policy if exists "plochy auth upload" on storage.objects;
create policy "plochy auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plochy-fotky');

drop policy if exists "plochy auth update" on storage.objects;
create policy "plochy auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'plochy-fotky');

drop policy if exists "plochy auth delete" on storage.objects;
create policy "plochy auth delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'plochy-fotky');

-- 4) (volitelné) index pro řazení
create index if not exists plochy_sort_idx
  on public.plochy (pripnuta desc, poradi asc, created_at desc);

-- HOTOVO. Admin uživatele vytvoř v Supabase → Authentication → Users → Add user.
