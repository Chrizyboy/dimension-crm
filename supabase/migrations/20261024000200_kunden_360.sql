-- Phase 5, Teil 2: Kundenübersicht, Zeitachse (360°), Dublettenprüfung und Datenexport.
-- Alles läuft mit den Rechten der aufrufenden Person (security invoker), RLS bleibt also wirksam.

revoke execute on function public.kundenstand(uuid) from public, anon;

-- Indizes für die Kundenakte: alles, was an einem Kontakt hängt, wird oft gesucht.
create index if not exists objekte_kontakt_idx on public.objekte (kontakt_id);
create index if not exists verkaufschancen_kontakt_idx on public.verkaufschancen (kontakt_id);
create index if not exists offerten_kontakt_idx on public.offerten (kontakt_id);
create index if not exists projekte_kontakt_idx on public.projekte (kontakt_id);
create index if not exists werkvertraege_kontakt_idx on public.werkvertraege (kontakt_id);
create index if not exists aktivitaeten_kontakt_idx on public.aktivitaeten (kontakt_id, zeitpunkt desc);
create index if not exists dokumente_bezug_idx on public.dokumente (bezug_tabelle, bezug_id);

/**
 * Telefonnummer nur als Ziffern in Schweizer Schreibweise (0…), damit «+41 76 123 45 67»,
 * «0041761234567» und «076 123 45 67» gleich sind (V170: Kundensuche nach Telefon).
 */
create or replace function intern.telefon_ziffern(nummer text) returns text
language sql immutable set search_path = '' as $$
  select case
    when d like '0041%' then '0' || substr(d, 5)
    when d like '41%' and length(d) = 11 then '0' || substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(nummer, ''), '\D', '', 'g') as d) x
$$;
grant execute on function intern.telefon_ziffern(text) to authenticated;

/** Anzeigename eines Kontakts: Firma bei Firmen, sonst Vor- und Nachname. */
create or replace function intern.kontaktname(k public.kontakte) returns text
language sql immutable set search_path = '' as $$
  select coalesce(
    nullif(case when k.art = 'firma' then k.firma else concat_ws(' ', k.vorname, k.nachname) end, ''),
    nullif(k.firma, ''), nullif(concat_ws(' ', k.vorname, k.nachname), ''), '–')
$$;
grant execute on function intern.kontaktname(public.kontakte) to authenticated;

-- Eine Zeile pro Kontakt mit allem, was Liste, Suche und Kopf der Kundenakte brauchen.
create or replace view public.kunden_uebersicht with (security_invoker = true) as
select
  k.id, k.kundennummer, k.art, k.kontaktart, k.anrede, k.vorname, k.nachname, k.firma,
  intern.kontaktname(k) as name,
  k.email, k.telefon, k.sprache, k.werbesperre, k.einwilligung, k.notiz,
  k.erstellt_am, k.geaendert_am, k.geloescht_am,
  o.id as objekt_id, o.strasse, o.plz, o.ort,
  (select count(*) from public.objekte x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_objekte,
  s.stand, s.stand_datum, s.bezug_tabelle as stand_tabelle, s.bezug_id as stand_bezug,
  a.reihenfolge as stand_rang, a.eigenschaften ->> 'gruppe' as stand_gruppe,
  (select max(z.zeitpunkt) from public.aktivitaeten z where z.kontakt_id = k.id and z.geloescht_am is null) as letzter_kontakt,
  (select count(*) from public.offerten x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_offerten,
  (select count(*) from public.projekte x where x.kontakt_id = k.id and x.geloescht_am is null)::int as anzahl_projekte,
  -- Mögliche Dublette: gleiche E-Mail oder gleiche Telefonnummer bei einem anderen Kontakt (V170).
  -- Mögliche Dublette: gleiche E-Mail oder gleiche Telefonnummer bei einem anderen Kontakt (V170).
  -- Einmal gruppiert statt pro Zeile gesucht: das hält die Liste auch mit RLS schnell.
  (de.email is not null or dt.ziffern is not null) as moegliche_dublette,
  lower(concat_ws(' ', intern.kontaktname(k), k.firma, k.email, o.strasse, o.plz, o.ort,
    'k' || lpad(k.kundennummer::text, 4, '0'), k.kundennummer::text,
    (select string_agg(x.nummer, ' ') from public.offerten x where x.kontakt_id = k.id and x.geloescht_am is null))) as suchtext,
  intern.telefon_ziffern(k.telefon) as telefon_ziffern
from public.kontakte k
left join lateral (
  select x.id, x.strasse, x.plz, x.ort from public.objekte x
   where x.kontakt_id = k.id and x.geloescht_am is null
   order by x.erstellt_am limit 1
) o on true
left join lateral public.kundenstand(k.id) s on true
left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand
left join (
  select lower(x.email) as email from public.kontakte x
   where x.geloescht_am is null and x.email is not null group by 1 having count(*) > 1
) de on de.email = lower(k.email)
left join (
  select intern.telefon_ziffern(x.telefon) as ziffern from public.kontakte x
   where x.geloescht_am is null and length(intern.telefon_ziffern(x.telefon)) >= 9 group by 1 having count(*) > 1
) dt on dt.ziffern = intern.telefon_ziffern(k.telefon);

grant select on public.kunden_uebersicht to authenticated;
revoke all on public.kunden_uebersicht from anon;

/**
 * Mögliche Dubletten vor dem Anlegen: gleiche E-Mail, gleiche Telefonnummer oder gleicher Name.
 * Liefert höchstens 5 Treffer mit dem Grund, damit die Person entscheiden kann.
 */
create or replace function public.moegliche_dubletten(p_name text, p_email text, p_telefon text, p_ohne uuid default null)
returns table (id uuid, kundennummer int, name text, ort text, grund text)
language sql stable security invoker set search_path = '' as $$
  select u.id, u.kundennummer, u.name, u.ort,
         case
           when nullif(trim(p_email), '') is not null and lower(u.email) = lower(trim(p_email)) then 'email'
           when length(intern.telefon_ziffern(p_telefon)) >= 9 and u.telefon_ziffern = intern.telefon_ziffern(p_telefon) then 'telefon'
           else 'name'
         end
    from public.kunden_uebersicht u
   where u.geloescht_am is null
     and (p_ohne is null or u.id <> p_ohne)
     and ((nullif(trim(p_email), '') is not null and lower(u.email) = lower(trim(p_email)))
       or (length(intern.telefon_ziffern(p_telefon)) >= 9 and u.telefon_ziffern = intern.telefon_ziffern(p_telefon))
       or (length(trim(coalesce(p_name, ''))) >= 3 and lower(u.name) = lower(trim(p_name))))
   order by u.kundennummer
   limit 5
$$;
revoke execute on function public.moegliche_dubletten(text, text, text, uuid) from public, anon;
grant execute on function public.moegliche_dubletten(text, text, text, uuid) to authenticated;
