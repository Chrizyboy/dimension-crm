-- Spesen Schritt 2 (3.11.2026, Chris: Firmenkarte «Ja, mit Abgleich»): Die Buchhaltung liest den Auszug der
-- Firmenkarte ein; jede Kartenbuchung wird mit einer Firmenkarten-Spese (Beleg) verbunden. Was ohne Beleg bleibt,
-- sieht die Buchhaltung und kann bei der Person nachfordern (Glocke) oder mit Grund erledigen.
-- Zuordnung nur über Datenbank-Funktionen, damit Regeln (eindeutig, nicht doppelt) an einem Ort liegen.

create table public.firmenkarte_buchungen (
  id uuid primary key default gen_random_uuid(),
  datum date not null,
  betrag_rappen bigint not null check (betrag_rappen <> 0),
  text text not null default '',
  karte text,
  person_id uuid references public.personen (id),
  spese_id uuid references public.spesen (id),
  erledigt_grund text,
  erledigt_am timestamptz,
  erledigt_von text,
  nachgefordert_am timestamptz,
  datei text,
  schluessel text not null unique,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now(),
  geloescht_am timestamptz
);
comment on table public.firmenkarte_buchungen is
  'Zeilen aus dem Auszug der Firmenkarte. Abgeglichen = spese_id gesetzt oder erledigt_grund. Nur Recht «finanzen».';
comment on column public.firmenkarte_buchungen.schluessel is
  'Datum|Betrag|Text|Karte|Nr: derselbe Auszug zweimal eingelesen gibt keine Doppelten.';
create unique index firmenkarte_buchungen_spese on public.firmenkarte_buchungen (spese_id)
  where spese_id is not null and geloescht_am is null;
select intern.richte_fachtabelle_ein('firmenkarte_buchungen', 'finanzen');

/** Kartenende («1234») → Person, gesetzt beim Zuordnen einer Person; Einstellung finanzen.spesen.karten. */
create or replace function intern.firmenkarte_person(p_karte text) returns uuid
language sql stable set search_path = '' as $$
  select nullif((select wert -> 'spesen' -> 'karten' ->> right(p_karte, 4)
                   from public.einstellungen where schluessel = 'finanzen'), '')::uuid
   where coalesce(p_karte, '') <> ''
$$;

/**
 * Offene Kartenbuchungen automatisch mit Firmenkarten-Spesen verbinden: gleicher Betrag, Datum ±3 Tage,
 * gleiche Person (falls bekannt), Spese nicht zurückgezogen/abgelehnt und noch nicht verbunden. Nur wenn genau
 * eine Spese passt und diese Spese genau zu einer Buchung passt, damit nie falsch geraten wird.
 */
create or replace function intern.firmenkarte_zuordnen() returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with kandidat as (
    select b.id as buchung_id, s.id as spese_id
      from public.firmenkarte_buchungen b
      join public.spesen s
        on s.bezahlt_mit = 'firmenkarte' and s.geloescht_am is null
       and s.status not in ('storniert', 'abgelehnt')
       and s.betrag_rappen = b.betrag_rappen
       and abs(s.datum - b.datum) <= 3
       and (b.person_id is null or s.person_id = b.person_id)
       and not exists (select 1 from public.firmenkarte_buchungen x
                        where x.spese_id = s.id and x.geloescht_am is null)
     where b.spese_id is null and b.erledigt_grund is null and b.geloescht_am is null
  ), eindeutig as (
    select k.buchung_id, min(k.spese_id::text)::uuid as spese_id
      from kandidat k
     group by k.buchung_id
    having count(*) = 1
       and (select count(*) from kandidat k2 where k2.spese_id = min(k.spese_id::text)::uuid) = 1
  )
  update public.firmenkarte_buchungen b
     set spese_id = e.spese_id,
         person_id = coalesce(b.person_id, (select s.person_id from public.spesen s where s.id = e.spese_id))
    from eindeutig e
   where b.id = e.buchung_id;
  get diagnostics n = row_count;
  return n;
end
$$;

/** Neue Firmenkarten-Spese sucht sofort ihre Kartenbuchung (Beleg kommt oft erst nach dem Auszug). */
create or replace function intern.spesen_karte_suchen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.bezahlt_mit = 'firmenkarte' then
    perform intern.firmenkarte_zuordnen();
  end if;
  return null;
end
$$;
create trigger karte_suchen after insert or update of betrag_rappen, datum, bezahlt_mit on public.spesen
  for each row execute function intern.spesen_karte_suchen();

/**
 * Auszug einlesen: p_zeilen = [{datum, betrag_rappen, text, karte}]. Gleiche Zeilen (auch aus einem früher
 * eingelesenen Auszug) werden übersprungen; zwei gleiche Zeilen im selben Auszug zählen als zwei Buchungen.
 * Gibt {neu, doppelt, zugeordnet} zurück.
 */
create or replace function public.firmenkarte_einlesen(p_zeilen jsonb, p_datei text default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_neu int;
  v_alle int := jsonb_array_length(coalesce(p_zeilen, '[]'));
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  with z as (
    select (e ->> 'datum')::date as datum, (e ->> 'betrag_rappen')::bigint as betrag,
           coalesce(e ->> 'text', '') as text, nullif(e ->> 'karte', '') as karte
      from jsonb_array_elements(coalesce(p_zeilen, '[]')) e
  ), nummeriert as (
    select z.*, row_number() over (partition by datum, betrag, text, karte) as nr from z
  ), neu as (
    insert into public.firmenkarte_buchungen (datum, betrag_rappen, text, karte, person_id, datei, schluessel)
    select n.datum, n.betrag, n.text, n.karte, intern.firmenkarte_person(n.karte), p_datei,
           concat_ws('|', n.datum, n.betrag, n.text, coalesce(n.karte, ''), n.nr)
      from nummeriert n
     where n.betrag <> 0
    on conflict (schluessel) do nothing
    returning 1
  )
  select count(*) into v_neu from neu;
  return jsonb_build_object('neu', v_neu, 'doppelt', v_alle - v_neu, 'zugeordnet', intern.firmenkarte_zuordnen());
end
$$;

/** Von Hand verbinden (p_spese) oder lösen (p_spese = null). Die Spese muss Firmenkarte sein. */
create or replace function public.firmenkarte_verbinden(p_buchung uuid, p_spese uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_spese is not null and not exists (select 1 from public.spesen
                                          where id = p_spese and bezahlt_mit = 'firmenkarte' and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'finanzen.karte_keine_firmenkarte';
  end if;
  if p_spese is not null and exists (select 1 from public.firmenkarte_buchungen
                                      where spese_id = p_spese and id <> p_buchung and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'finanzen.karte_schon_verbunden';
  end if;
  update public.firmenkarte_buchungen
     set spese_id = p_spese, erledigt_grund = null, erledigt_am = null, erledigt_von = null,
         person_id = coalesce((select person_id from public.spesen where id = p_spese), person_id)
   where id = p_buchung and geloescht_am is null;
end
$$;

/** Person einer Buchung setzen und für das Kartenende merken; danach erneut automatisch zuordnen. */
create or replace function public.firmenkarte_person_setzen(p_buchung uuid, p_person uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_karte text;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.firmenkarte_buchungen set person_id = p_person where id = p_buchung returning karte into v_karte;
  if coalesce(v_karte, '') <> '' and p_person is not null then
    update public.einstellungen
       set wert = jsonb_set(wert, '{spesen,karten}',
                            coalesce(wert -> 'spesen' -> 'karten', '{}') || jsonb_build_object(right(v_karte, 4), p_person))
     where schluessel = 'finanzen';
    update public.firmenkarte_buchungen set person_id = p_person
     where karte = v_karte and person_id is null and spese_id is null and geloescht_am is null;
  end if;
  return intern.firmenkarte_zuordnen();
end
$$;

/** Ohne Beleg erledigen (z. B. Abo, Gebühr, privat und abgezogen) oder mit p_grund = null wieder öffnen. */
create or replace function public.firmenkarte_erledigen(p_buchung uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_grund is not null and btrim(p_grund) = '' then
    raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt';
  end if;
  update public.firmenkarte_buchungen
     set erledigt_grund = nullif(btrim(p_grund), ''),
         erledigt_am = case when p_grund is null then null else now() end,
         erledigt_von = case when p_grund is null then null else intern.mein_vorname() end
   where id = p_buchung and spese_id is null and geloescht_am is null;
end
$$;

/** Fehlende Belege bei den Personen nachfordern: eine Glocke je Person mit Anzahl und Total. */
create or replace function public.firmenkarte_nachfordern(p_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  for r in
    select b.person_id, count(*) as anzahl, sum(b.betrag_rappen) as total,
           string_agg(to_char(b.datum, 'DD.MM.') || ' ' || b.text, ', ' order by b.datum) as liste
      from public.firmenkarte_buchungen b
     where b.id = any (p_ids) and b.spese_id is null and b.erledigt_grund is null
       and b.geloescht_am is null and b.person_id is not null
     group by b.person_id
  loop
    perform intern.spesen_glocke(r.person_id, 'warnung',
      'Beleg zur Firmenkarte fehlt (' || r.anzahl || ')', 'Justificatif carte d''entreprise manquant (' || r.anzahl || ')',
      intern.spesen_chf(r.total::bigint) || ': ' || left(r.liste, 300) || '. Bitte als Spese «Firmenkarte» mit Beleg erfassen.',
      intern.spesen_chf(r.total::bigint) || ' : ' || left(r.liste, 300) || '. Merci de saisir la dépense « carte d''entreprise » avec justificatif.');
    n := n + 1;
  end loop;
  update public.firmenkarte_buchungen set nachgefordert_am = now()
   where id = any (p_ids) and spese_id is null and erledigt_grund is null and person_id is not null;
  return n;
end
$$;

/** Abgleich-Liste: Buchung, Person, verbundene Spese (mit Beleg) und Stand offen/verbunden/erledigt. */
create view public.firmenkarte_abgleich with (security_invoker = true) as
select b.id, b.datum, b.betrag_rappen, b.text, b.karte, b.person_id, pe.name as person, b.spese_id,
       s.datum as spese_datum, s.zweck as spese_zweck, s.kategorie as spese_kategorie, s.beleg_id,
       b.erledigt_grund, b.erledigt_am, b.erledigt_von, b.nachgefordert_am, b.datei, b.erstellt_am,
       case when b.spese_id is not null then 'verbunden' when b.erledigt_grund is not null then 'erledigt' else 'offen' end
         as stand
  from public.firmenkarte_buchungen b
  left join public.personen pe on pe.id = b.person_id
  left join public.spesen s on s.id = b.spese_id
 where b.geloescht_am is null;
