-- Registrier-Link pro Person (Chris 2.11.2026): Für Personen ohne Firmen-Mail (Montage) erfasst die Administration
-- Name und Rolle und bekommt einen persönlichen Link fürs Handy. Die Person öffnet ihn, gibt ihre private
-- Mailadresse ein und bestätigt sie mit dem Code aus der Mail. Danach ist sie angemeldet.
-- Sicherheit: Der Link gilt 14 Tage und einmal, in der Datenbank liegt nur sein Hash. Eine Adresse, die schon einer
-- anderen Person gehört, wird abgelehnt. Wer den Link hat, kann nur die eigene Adresse setzen, sonst nichts.

create table intern.registrier_links (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.personen (id),
  hash        text not null unique,
  gueltig_bis timestamptz not null default now() + interval '14 days',
  benutzt_am  timestamptz,
  erstellt_am timestamptz not null default now(),
  erstellt_von uuid references public.personen (id)
);
comment on table intern.registrier_links is 'Registrier-Links fürs Handy (nur Hash des Schlüssels), siehe registrier_link_erstellen.';

/** Hash eines Link-Schlüssels (der Schlüssel selbst wird nie gespeichert). */
create or replace function intern.registrier_hash(p_schluessel text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(p_schluessel, ''), 'UTF8')), 'hex')
$$;

/** Freies technisches Kürzel aus dem Vornamen («Diogo Semedo» → diogo, diogo2 …). */
create or replace function intern.freies_kuerzel(p_name text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  basis text := nullif(regexp_replace(lower(translate(split_part(trim(p_name), ' ', 1),
                  'äöüàâéèêëîïôûùçÄÖÜÀÂÉÈÊËÎÏÔÛÙÇ', 'aouaaeeeeiiouucaouaaeeeeiiouuc')), '[^a-z0-9]', '', 'g'), '');
  k text;
begin
  basis := coalesce(basis, 'person');
  for i in 1..99 loop
    k := case when i = 1 then basis else basis || i end;
    if not exists (select 1 from public.personen where kuerzel = k) then return k; end if;
  end loop;
  return basis || extract(epoch from now())::bigint;
end
$$;

/**
 * Erstellt einen neuen Registrier-Link für eine erfasste Person ohne Anmeldung (nur Administration). Ältere offene
 * Links der Person verfallen. Gibt den Schlüssel einmal zurück; die App baut daraus den Link.
 */
create or replace function public.registrier_link_erstellen(p_person uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_schluessel text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not intern.hat_recht('admin') then raise exception using errcode = '42501', message = 'registrierung.kein_recht'; end if;
  if not exists (select 1 from public.personen where id = p_person and aktiv and geloescht_am is null and auth_user_id is null) then
    raise exception using errcode = 'P0001', message = 'registrierung.schon_angemeldet';
  end if;
  update intern.registrier_links set gueltig_bis = least(gueltig_bis, now())
   where person_id = p_person and benutzt_am is null;
  insert into intern.registrier_links (person_id, hash, erstellt_von)
  values (p_person, intern.registrier_hash(v_schluessel), intern.meine_person_id());
  return v_schluessel;
end
$$;
revoke execute on function public.registrier_link_erstellen(uuid) from public, anon;
grant execute on function public.registrier_link_erstellen(uuid) to authenticated;

/**
 * Neue Person ohne Mail erfassen und gleich den Link erstellen (nur Administration).
 * Gibt {person_id, schluessel} zurück.
 */
create or replace function public.person_mit_link_anlegen(p_name text, p_rolle text, p_sprache text default 'de',
                                                          p_standort uuid default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not intern.hat_recht('admin') then raise exception using errcode = '42501', message = 'registrierung.kein_recht'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception using errcode = 'P0001', message = 'registrierung.name_fehlt'; end if;
  insert into public.personen (kuerzel, name, rolle, sprache, standort_id)
  values (intern.freies_kuerzel(p_name), trim(p_name), p_rolle, coalesce(p_sprache, 'de'), p_standort)
  returning id into v_id;
  return jsonb_build_object('person_id', v_id, 'schluessel', public.registrier_link_erstellen(v_id));
end
$$;
revoke execute on function public.person_mit_link_anlegen(text, text, text, uuid) from public, anon;
grant execute on function public.person_mit_link_anlegen(text, text, text, uuid) to authenticated;

/** Für die Anmeldeseite ohne Login: Vorname und Sprache zum Link, oder null, wenn er nicht (mehr) gilt. */
create or replace function public.registrier_link_pruefen(p_schluessel text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('vorname', split_part(p.name, ' ', 1), 'sprache', p.sprache)
    from intern.registrier_links l join public.personen p on p.id = l.person_id
   where l.hash = intern.registrier_hash(p_schluessel) and l.benutzt_am is null and l.gueltig_bis > now()
     and p.aktiv and p.geloescht_am is null and p.auth_user_id is null
$$;

/**
 * Link einlösen: setzt die private Mailadresse der Person, danach schickt die App den Anmeldecode an diese Adresse.
 * Der Link ist damit verbraucht.
 */
create or replace function public.registrier_link_einloesen(p_schluessel text, p_email text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l intern.registrier_links;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_sprache text;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception using errcode = 'P0001', message = 'registrierung.email_ungueltig';
  end if;
  select * into l from intern.registrier_links
   where hash = intern.registrier_hash(p_schluessel) and benutzt_am is null and gueltig_bis > now() for update;
  if not found or not exists (select 1 from public.personen
                               where id = l.person_id and aktiv and geloescht_am is null and auth_user_id is null) then
    raise exception using errcode = 'P0001', message = 'registrierung.link_ungueltig';
  end if;
  if exists (select 1 from public.personen where email = v_email and id <> l.person_id) then
    raise exception using errcode = 'P0001', message = 'registrierung.email_vergeben';
  end if;
  update public.personen set email = v_email where id = l.person_id returning sprache into v_sprache;
  update intern.registrier_links set benutzt_am = now() where id = l.id;
  return jsonb_build_object('email', v_email, 'sprache', v_sprache);
end
$$;
revoke execute on function public.registrier_link_pruefen(text) from public;
revoke execute on function public.registrier_link_einloesen(text, text) from public;
grant execute on function public.registrier_link_pruefen(text) to anon, authenticated;
grant execute on function public.registrier_link_einloesen(text, text) to anon, authenticated;
