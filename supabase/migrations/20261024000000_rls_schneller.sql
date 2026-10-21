-- Phase 5, Teil 0: Zugriffsregeln schneller machen.
-- Gemessen: Die Kundenübersicht (658 Kontakte) brauchte als angemeldete Person 27 Sekunden, weil
-- `intern.hat_recht()` für jede einzelne Zeile neu lief. In `(select …)` verpackt rechnet Postgres
-- das Recht einmal pro Abfrage aus (Empfehlung von Supabase). Die Regeln selbst bleiben gleich.

do $$
declare
  r record;
  muster constant text := '^intern\.hat_recht\(''(\w+)''::text\)$';
  recht text;
begin
  for r in
    select tablename, policyname, cmd, qual, with_check from pg_policies
     where schemaname = 'public' and (qual ~ muster or with_check ~ muster)
  loop
    recht := substring(coalesce(r.qual, r.with_check) from muster);
    if r.cmd = 'INSERT' then
      execute format('alter policy %I on public.%I with check ((select intern.hat_recht(%L)))', r.policyname, r.tablename, recht);
    elsif r.cmd = 'UPDATE' then
      execute format('alter policy %I on public.%I using ((select intern.hat_recht(%L))) with check ((select intern.hat_recht(%L)))',
                     r.policyname, r.tablename, recht, recht);
    else
      execute format('alter policy %I on public.%I using ((select intern.hat_recht(%L)))', r.policyname, r.tablename, recht);
    end if;
  end loop;
end;
$$;

-- Neue Fachtabellen bekommen die schnelle Form gleich von Anfang an.
create or replace function intern.richte_fachtabelle_ein(p_tabelle text, p_recht text default 'basis')
returns void
language plpgsql
as $$
begin
  execute format($f$
    alter table public.%1$I
      add column if not exists erstellt_am  timestamptz not null default now(),
      add column if not exists erstellt_von uuid default auth.uid(),
      add column if not exists geaendert_am timestamptz not null default now(),
      add column if not exists geloescht_am timestamptz,
      -- Herkunft aus der Vorlage V233: alte ID und der vollständige alte Datensatz,
      -- damit beim Import nie ein Feld verloren geht.
      add column if not exists alt_id   text unique,
      add column if not exists alt_daten jsonb
  $f$, p_tabelle);
  execute format('create trigger protokoll after insert or update or delete on public.%I
                  for each row execute function intern.protokolliere()', p_tabelle);
  execute format('create trigger geaendert before update on public.%I
                  for each row execute function intern.setze_geaendert_am()', p_tabelle);
  execute format('alter table public.%I enable row level security', p_tabelle);
  execute format('create policy lesen on public.%I for select to authenticated using ((select intern.hat_recht(%L)))', p_tabelle, p_recht);
  execute format('create policy anlegen on public.%I for insert to authenticated with check ((select intern.hat_recht(%L)))', p_tabelle, p_recht);
  insert into intern.tabellen_leserecht (tabelle, recht) values (p_tabelle, p_recht)
    on conflict (tabelle) do update set recht = excluded.recht;
  execute format('create policy aendern on public.%I for update to authenticated using ((select intern.hat_recht(%L))) with check ((select intern.hat_recht(%L)))',
                 p_tabelle, p_recht, p_recht);
end;
$$;
