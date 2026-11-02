-- Handbuch: Prozesse und Videos einem Bereich zuordnen (Entscheid 0043).
-- Dann erscheinen sie im Kapitel des Bereichs und in der Hilfe (F1). Leer = nur in ihrem eigenen Reiter.
alter table public.handbuch_eintraege add column bereich text
  check (bereich is null or bereich ~ '^[a-z][a-z0-9-]*$');

comment on column public.handbuch_eintraege.bereich is
  'Modul-id (z. B. «quotes»), in dessen Handbuch-Kapitel der Eintrag erscheint; null = nur im Reiter Prozesse/Videos.';

-- Eigene Funktion statt neuer Parameter an handbuch_speichern: die bestehende Unterschrift bleibt gleich.
create or replace function public.handbuch_bereich_setzen(p_id uuid, p_bereich text)
returns void
language plpgsql set search_path = '' as $$
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'handbuch.kein_recht';
  end if;
  update public.handbuch_eintraege
     set bereich = nullif(trim(coalesce(p_bereich, '')), '')
   where id = p_id and geloescht_am is null;
end;
$$;

revoke execute on function public.handbuch_bereich_setzen(uuid, text) from public, anon;
grant execute on function public.handbuch_bereich_setzen(uuid, text) to authenticated;
