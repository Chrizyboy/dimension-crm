-- Phase 7, Teil 4: «Auftrag erstellen» (V232) und Werkverträge. Aus der angenommenen Offerte entstehen
-- Projekt, Zahlungsplan und Werkvertrag in einem Schritt. Die Zahlungskonditionen sind Daten
-- (Auswahlliste «zahlungskondition»), damit neue Konditionen ohne Programmänderung dazukommen.

comment on column public.werkvertraege.betrag_rappen is 'Pauschalpreis inkl. MWST in Rappen (wie Vertragswert im Projekt).';
comment on column public.projekte.vertragswert_rappen is 'Vertragswert inkl. MWST in Rappen.';

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('zahlungskondition', 'normal', 'Normal 50 / 30 / 20', 'Normal 50 / 30 / 20', 1, '{"tranchen": [
    {"anteil": 0.5, "de": "Anzahlung 50 % bei Vertragsunterzeichnung", "fr": "Acompte 50 % à la signature du contrat", "faellig": "unterschrift", "tage": 10},
    {"anteil": 0.3, "de": "30 % vor Beginn der Arbeiten", "fr": "30 % avant le début des travaux", "faellig": "baubeginn"},
    {"anteil": 0.2, "de": "Schlusszahlung 20 % nach Inbetriebnahme", "fr": "Solde 20 % après la mise en service"}]}'),
  ('zahlungskondition', 'batterie', 'Batterie 80 / 20', 'Batterie 80 / 20', 2, '{"tranchen": [
    {"anteil": 0.8, "de": "Anzahlung 80 % bei Vertragsunterzeichnung", "fr": "Acompte 80 % à la signature du contrat", "faellig": "unterschrift", "tage": 10},
    {"anteil": 0.2, "de": "Schlusszahlung 20 % nach Inbetriebnahme", "fr": "Solde 20 % après la mise en service"}]}'),
  ('werkvertragstatus', 'entwurf', 'Entwurf', 'Brouillon', 1, '{}'),
  ('werkvertragstatus', 'erstellt', 'Erstellt', 'Établi', 2, '{}'),
  ('werkvertragstatus', 'versendet', 'Versendet', 'Envoyé', 3, '{}'),
  ('werkvertragstatus', 'unterschrieben', 'Unterschrieben', 'Signé', 4, '{}'),
  ('werkvertragstatus', 'storniert', 'Storniert', 'Annulé', 5, '{}')
on conflict do nothing;

/** Rundet auf 5 Rappen (Schweizer Rundung). */
create or replace function public.runde_5_rappen(p_rappen numeric) returns bigint
language sql immutable set search_path = '' as $$ select (round(p_rappen / 5) * 5)::bigint $$;
grant execute on function public.runde_5_rappen(numeric) to authenticated;

/**
 * Zahlungsplan aus Vertragswert und Kondition (V232): jede Tranche auf 5 Rappen gerundet,
 * die letzte nimmt den Rest, damit die Summe genau stimmt.
 */
create or replace function public.zahlungsplan_berechnen(p_wert bigint, p_kondition text, p_sprache text,
                                                         p_unterzeichnet date, p_baubeginn date default null)
returns table (nr int, bezeichnung text, betrag_rappen bigint, faellig_am date)
language plpgsql stable set search_path = '' as $$
declare
  t jsonb;
  n int := 0;
  anzahl int;
  benutzt bigint := 0;
  b bigint;
begin
  select eigenschaften -> 'tranchen' into t from public.auswahlwerte
   where liste = 'zahlungskondition' and schluessel = p_kondition and aktiv and geloescht_am is null;
  if t is null then raise exception using message = 'auftrag.kondition_unbekannt'; end if;
  anzahl := jsonb_array_length(t);
  for i in 0 .. anzahl - 1 loop
    n := n + 1;
    b := case when n = anzahl then p_wert - benutzt else public.runde_5_rappen(p_wert * (t -> i ->> 'anteil')::numeric) end;
    benutzt := benutzt + b;
    nr := n;
    bezeichnung := case when p_sprache = 'fr' then t -> i ->> 'fr' else t -> i ->> 'de' end;
    betrag_rappen := b;
    faellig_am := case t -> i ->> 'faellig'
                    when 'unterschrift' then coalesce(p_unterzeichnet, current_date) + coalesce((t -> i ->> 'tage')::int, 0)
                    when 'baubeginn' then p_baubeginn end;
    return next;
  end loop;
end
$$;
grant execute on function public.zahlungsplan_berechnen(bigint, text, text, date, date) to authenticated;

/**
 * Auftrag erstellen (V232). Angaben: standort_id, sprache, kondition, vertragswert_rappen (inkl. MWST),
 * unterzeichnet_am, werkvertrag (true = Werkvertrag anlegen/nachführen).
 * Die Offerte wird «angenommen», das Projekt entsteht (oder wird nachgeführt) mit derselben Nummer.
 * Ist schon eine Tranche verrechnet oder bezahlt, bleibt der Zahlungsplan unverändert.
 */
create or replace function public.auftrag_erstellen(p_offerte uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  std uuid;
  spr text;
  kond text := coalesce(nullif(p ->> 'kondition', ''), 'normal');
  wert bigint := nullif(p ->> 'vertragswert_rappen', '')::bigint;
  unterz date := coalesce(nullif(p ->> 'unterzeichnet_am', '')::date, current_date);
  pr public.projekte;
  wv public.werkvertraege;
  firma uuid;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if o.status in ('verloren', 'archiviert') then raise exception using message = 'auftrag.offerte_verloren'; end if;
  if wert is null or wert <= 0 then raise exception using message = 'auftrag.wert_fehlt'; end if;
  std := coalesce(nullif(p ->> 'standort_id', '')::uuid, o.standort_id);
  spr := coalesce(nullif(p ->> 'sprache', ''), (select sprache from public.standorte where id = std), o.sprache);
  select firma_id into firma from public.standorte where id = std;

  update public.offerten set status = 'angenommen', entscheid = 'angenommen',
         entscheid_am = coalesce(entscheid_am, unterz), entscheid_von = intern.mein_vorname()
   where id = o.id;

  select * into pr from public.projekte where offerte_id = o.id and geloescht_am is null order by erstellt_am desc limit 1;
  if pr.id is null then
    insert into public.projekte (nummer, kontakt_id, objekt_id, offerte_id, verkaufschance_id, titel, status, standort_id,
                                 verantwortlich_id, unterzeichnet_am, vertragswert_rappen, vertrag_sprache, zahlungskonditionen)
    values (case when exists (select 1 from public.projekte where nummer = o.nummer) then o.nummer || '-A' else o.nummer end,
            o.kontakt_id, o.objekt_id, o.id, o.verkaufschance_id, o.titel, 'auftrag', std,
            o.verantwortlich_id, unterz, wert, spr, kond)
    returning * into pr;
  else
    update public.projekte set standort_id = std, unterzeichnet_am = unterz, vertragswert_rappen = wert,
           vertrag_sprache = spr, zahlungskonditionen = kond
     where id = pr.id returning * into pr;
  end if;

  if not exists (select 1 from public.zahlungsplan z where z.projekt_id = pr.id and z.geloescht_am is null
                  and (z.rechnung_nr is not null or z.bezahlt_am is not null or z.abaninja_id is not null)) then
    -- Papierkorb statt Löschen: der alte Plan bleibt nachvollziehbar.
    update public.zahlungsplan set geloescht_am = now() where projekt_id = pr.id and geloescht_am is null;
    insert into public.zahlungsplan (projekt_id, bezeichnung, betrag_rappen, faellig_am)
    select pr.id, z.bezeichnung, z.betrag_rappen, z.faellig_am
      from public.zahlungsplan_berechnen(wert, kond, spr, unterz, pr.baubeginn) z order by z.nr;
  end if;

  if coalesce((p ->> 'werkvertrag')::boolean, true) then
    select * into wv from public.werkvertraege
     where offerte_id = o.id and geloescht_am is null and status <> 'storniert' order by erstellt_am desc limit 1;
    if wv.id is null then
      insert into public.werkvertraege (nummer, offerte_id, projekt_id, kontakt_id, firma_id, sprache, betrag_rappen,
                                        status, erstellt_datum, notiz)
      values (case when exists (select 1 from public.werkvertraege where nummer = o.nummer)
                   then o.nummer || '-' || (select count(*) + 1 from public.werkvertraege where nummer like o.nummer || '%')
                   else o.nummer end,
              o.id, pr.id, o.kontakt_id, firma, spr, wert, 'erstellt', current_date, kond);
    elsif wv.status in ('entwurf', 'erstellt') then
      update public.werkvertraege
         set projekt_id = pr.id, firma_id = firma, sprache = spr, betrag_rappen = wert, notiz = kond,
             version = case when betrag_rappen is distinct from wert or sprache is distinct from spr then version + 1 else version end,
             erstellt_datum = current_date
       where id = wv.id;
    end if;
  end if;

  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, pr.id,
    format('Auftrag erstellt: %s · CHF %s inkl. MWST', o.nummer, to_char(wert / 100.0, 'FM999G999G990D00')),
    jsonb_build_object('offerte_id', o.id, 'projekt_id', pr.id, 'kondition', kond, 'meilenstein', true));
  return pr.id;
end
$$;
revoke execute on function public.auftrag_erstellen(uuid, jsonb) from public, anon;
grant execute on function public.auftrag_erstellen(uuid, jsonb) to authenticated;

/**
 * Stand eines Werkvertrags: erstellt, versendet (von Hand bestätigt; der Versand selbst kommt mit dem
 * Ausgangskorb in Phase 8), unterschrieben (Datum Pflicht, nicht in der Zukunft), storniert (Grund Pflicht).
 */
create or replace function public.werkvertrag_status(p_id uuid, p_ziel text, p jsonb default '{}') returns void
language plpgsql security invoker set search_path = '' as $$
declare
  w public.werkvertraege;
  d date := nullif(p ->> 'datum', '')::date;
  g text := nullif(trim(coalesce(p ->> 'grund', '')), '');
begin
  select * into w from public.werkvertraege where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  case p_ziel
    when 'erstellt' then
      update public.werkvertraege set status = 'erstellt', versendet_am = null where id = w.id;
    when 'versendet' then
      update public.werkvertraege set status = 'versendet', versendet_am = coalesce(d::timestamptz, now()) where id = w.id;
    when 'unterschrieben' then
      if d is null then raise exception using message = 'stand.datum_fehlt'; end if;
      if d > current_date then raise exception using message = 'werkvertrag.datum_zukunft'; end if;
      update public.werkvertraege set status = 'unterschrieben', unterschrieben_am = d,
             unterschrift = coalesce(unterschrift, '{}'::jsonb) || jsonb_build_object('erfasst_von', intern.mein_vorname(), 'erfasst_am', now())
       where id = w.id;
      if w.projekt_id is not null then
        update public.projekte set unterzeichnet_am = d where id = w.projekt_id;
      end if;
    when 'storniert' then
      update public.werkvertraege set status = 'storniert',
             notiz = concat_ws(E'\n', notiz, 'Storniert: ' || intern.pflicht(g, 'stand.grund_fehlt'))
       where id = w.id;
    else
      raise exception using message = 'stand.unbekannt';
  end case;
  perform intern.vermerke(w.kontakt_id, null, w.projekt_id,
    concat_ws(' · ', 'Werkvertrag ' || w.nummer || ': ' ||
      (select text_de from public.auswahlwerte where liste = 'werkvertragstatus' and schluessel = p_ziel), g),
    jsonb_build_object('werkvertrag_id', w.id, 'status', p_ziel));
end
$$;
revoke execute on function public.werkvertrag_status(uuid, text, jsonb) from public, anon;
grant execute on function public.werkvertrag_status(uuid, text, jsonb) to authenticated;

/** Werkverträge mit Kunde, Objekt, Firma und Zahlungsplan für Liste und PDF. */
create or replace view public.werkvertraege_liste with (security_invoker = true) as
select
  w.id, w.nummer, w.status, w.sprache, w.version, w.betrag_rappen, w.erstellt_datum, w.versendet_am,
  w.unterschrieben_am, w.notiz, w.offerte_id, w.projekt_id, w.kontakt_id, w.firma_id, w.geaendert_am,
  intern.kontaktname(k) as name, k.kundennummer, k.anrede, k.vorname, k.nachname, k.firma as kontakt_firma,
  k.email, k.telefon,
  ko.strasse as kontakt_strasse, ko.plz as kontakt_plz, ko.ort as kontakt_ort,
  ob.strasse as objekt_strasse, ob.plz as objekt_plz, ob.ort as objekt_ort,
  f.name as firma_name, f.strasse as firma_strasse, f.plz as firma_plz, f.ort as firma_ort, f.mwst_nr as firma_mwst_nr,
  o.nummer as offerte_nummer, o.titel, o.leistung_kwp, o.anzahl_module, o.wechselrichter, o.batterie, o.betrag_rappen as offerte_rappen,
  o.angebot_am,
  p.nummer as projekt_nummer, p.baubeginn, p.zahlungskonditionen, st.kuerzel as standort,
  coalesce((select jsonb_agg(jsonb_build_object('bezeichnung', z.bezeichnung, 'betrag_rappen', z.betrag_rappen,
                                                'faellig_am', z.faellig_am, 'bezahlt_am', z.bezahlt_am) order by z.faellig_am nulls last, z.erstellt_am)
              from public.zahlungsplan z where z.projekt_id = w.projekt_id and z.geloescht_am is null), '[]') as zahlungsplan,
  lower(concat_ws(' ', w.nummer, intern.kontaktname(k), ob.ort, ob.plz, o.nummer)) as suchtext
from public.werkvertraege w
join public.kontakte k on k.id = w.kontakt_id
left join public.offerten o on o.id = w.offerte_id
left join public.projekte p on p.id = w.projekt_id
left join public.objekte ob on ob.id = coalesce(p.objekt_id, o.objekt_id)
left join lateral (select x.strasse, x.plz, x.ort from public.objekte x
                    where x.kontakt_id = k.id and x.geloescht_am is null order by x.erstellt_am limit 1) ko on true
left join public.standorte st on st.id = coalesce(p.standort_id, o.standort_id)
-- Verträge aus der Vorlage haben keine Firma gespeichert: dann gilt die Firma des Standorts.
left join public.firmen f on f.id = coalesce(w.firma_id, st.firma_id)
where w.geloescht_am is null;
grant select on public.werkvertraege_liste to authenticated;
