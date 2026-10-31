-- Anmelde-Mails nur in einer Sprache (Chris 31.10.2026): Die Vorlagen in supabase/templates/ wählen Deutsch oder
-- Französisch nach `sprache` in den Login-Metadaten (`.Data.sprache`). Diese Datei hält den Wert aktuell:
--  - Wer auf der Anmeldeseite DE/FR wählt und einen Code anfordert, setzt ihn vorher mit `anmelde_sprache`.
--  - Ändert sich `personen.sprache` (Mein Konto, Administration), zieht der Trigger nach.
--  - Ein neues Login-Konto (erste Anmeldung, Einladung) übernimmt die Sprache der Person, ausser die App gibt sie mit.

-- 1. Personen-Sprache ins Login übernehmen.
create or replace function intern.sprache_ins_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('sprache', new.sprache)
  where (id = new.auth_user_id or lower(email) = lower(new.email))
    and coalesce(raw_user_meta_data ->> 'sprache', '') is distinct from new.sprache;
  return new;
end;
$$;
revoke execute on function intern.sprache_ins_login() from public, anon, authenticated;

drop trigger if exists sprache_ins_login on public.personen;
create trigger sprache_ins_login after insert or update of sprache, email, auth_user_id on public.personen
  for each row execute function intern.sprache_ins_login();

-- 2. Neues Login-Konto: Sprache der Person, falls die App keine mitgibt.
create or replace function intern.sprache_neues_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sprache text;
begin
  if coalesce(new.raw_user_meta_data ->> 'sprache', '') not in ('de', 'fr') then
    select sprache into v_sprache from public.personen
    where lower(email) = lower(new.email) and geloescht_am is null
    limit 1;
    new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('sprache', coalesce(v_sprache, 'de'));
  end if;
  return new;
end;
$$;
revoke execute on function intern.sprache_neues_login() from public, anon, authenticated;

drop trigger if exists sprache_neues_login on auth.users;
create trigger sprache_neues_login before insert on auth.users
  for each row execute function intern.sprache_neues_login();

-- 3. Anmeldeseite: gewählte Sprache vor dem Code-Versand setzen. Ohne Anmeldung aufrufbar, darum bewusst schmal:
--    ändert nur den Schlüssel «sprache» eines bestehenden Kontos, gibt nie etwas zurück (verrät also nicht, ob es
--    die Adresse gibt) und nimmt nur «de» oder «fr» an.
create or replace function public.anmelde_sprache(p_email text, p_sprache text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sprache not in ('de', 'fr') or p_email is null then
    return;
  end if;
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('sprache', p_sprache)
  where lower(email) = lower(trim(p_email))
    and coalesce(raw_user_meta_data ->> 'sprache', '') is distinct from p_sprache;
end;
$$;
revoke execute on function public.anmelde_sprache(text, text) from public;
grant execute on function public.anmelde_sprache(text, text) to anon, authenticated;

-- 4. Bestehende Konten einmal nachführen.
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('sprache', p.sprache)
from public.personen p
where (p.auth_user_id = u.id or lower(p.email) = lower(u.email))
  and coalesce(u.raw_user_meta_data ->> 'sprache', '') is distinct from p.sprache;
