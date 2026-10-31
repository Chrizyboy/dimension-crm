-- Werkvertrag nach der Vorlage Muri (Chris, 31.10.2026): Seite 1 Parteien und Vertragsgegenstand mit
-- Ankreuz-Optionen, Seite 2 Termine, Werklohn mit Zahlungsplan und Unterschriften, danach die AGB.
-- Zahlungsbedingungen einfach wählbar (Vorlage wie 70/30 oder 100 %, oder eigene Anzahlung in CHF),
-- Beträge auf ganze Franken (letzte Rate = Rest). Anzahlungsrechnung direkt aus dem Werkvertrag.
-- Entscheid 0031.

alter table public.werkvertraege add column if not exists angaben jsonb not null default '{}';
comment on column public.werkvertraege.angaben is
  'Angaben im Vertrag: gegenstand, material, beginn, fertig, optionen {monitoring, wartung, divers}, '
  'ansprechperson, zahlung {kondition, anzahlung_rappen, raten [{text, prozent}]}.';

-- Neue Vorlagen vorne; die alten bleiben wählbar (nichts entfernen). Standard (Chris 31.10.2026):
-- normale Anlagen 40/30/30 (Unterzeichnung/Administration, Material, Inbetriebnahme), Batterien 70/30
-- (Material, Inbetriebnahme). «Eigene Raten» frei mit Bezeichnung und Prozent, «Eigene Anzahlung» in CHF.
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('zahlungskondition', '40_30_30', '40 / 30 / 30', '40 / 30 / 30', -7, '{"tranchen": [
    {"anteil": 0.4, "de": "40 % bei Vertragsunterzeichnung (Administration)", "fr": "40 % à la signature du contrat (administration)", "faellig": "unterschrift", "tage": 10},
    {"anteil": 0.3, "de": "30 % Material, vor Beginn der Arbeiten", "fr": "30 % matériel, avant le début des travaux", "faellig": "baubeginn"},
    {"anteil": 0.3, "de": "30 % nach Inbetriebnahme", "fr": "30 % après la mise en service"}]}'),
  ('zahlungskondition', '70_30', '70 / 30', '70 / 30', -6, '{"tranchen": [
    {"anteil": 0.7, "de": "70 % Material, bei Vertragsunterzeichnung", "fr": "70 % matériel, à la signature du contrat", "faellig": "unterschrift", "tage": 10},
    {"anteil": 0.3, "de": "30 % nach Inbetriebnahme", "fr": "30 % après la mise en service"}]}'),
  ('zahlungskondition', '100', '100 % bei Unterzeichnung', '100 % à la signature', -5, '{"tranchen": [
    {"anteil": 1, "de": "100 % bei Vertragsunterzeichnung", "fr": "100 % à la signature du contrat", "faellig": "unterschrift", "tage": 10}]}'),
  ('zahlungskondition', '55_45', '55 / 45 (AGB)', '55 / 45 (CG)', -4, '{"tranchen": [
    {"anteil": 0.55, "de": "55 % bei Vertragsunterzeichnung", "fr": "55 % à la signature du contrat", "faellig": "unterschrift", "tage": 10},
    {"anteil": 0.45, "de": "45 % nach Inbetriebnahme", "fr": "45 % après la mise en service"}]}'),
  ('zahlungskondition', 'anzahlung', 'Eigene Anzahlung (CHF)', 'Acompte libre (CHF)', -3, '{"tranchen": [
    {"betrag": true, "de": "Anzahlung bei Vertragsunterzeichnung", "fr": "Acompte à la signature du contrat", "faellig": "unterschrift", "tage": 10},
    {"anteil": 1, "de": "Saldo nach Inbetriebnahme", "fr": "Solde après la mise en service"}]}'),
  ('zahlungskondition', 'eigene', 'Eigene Raten', 'Échéances libres', -2, '{"eigene": true, "tranchen": []}')
on conflict do nothing;

-- Wer unterschreibt und wer Ansprechperson ist, sind Daten (Administration ändert sie in den Werkverträgen).
-- Telefon: deutscher Vertrag mit der Hauptnummer Muri, französischer mit der Hauptnummer Bulle (Chris 31.10.2026).
insert into public.einstellungen (schluessel, wert) values ('werkvertrag', $j${
  "unterzeichner": "Chris Rosenberg",
  "ansprechperson": "Chris Rosenberg",
  "telefon_de": "+41 56 552 11 25",
  "telefon_fr": "+41 26 919 13 00",
  "email": "info@dimension-solaire.ch",
  "adresse": "Luzernerstrasse 35, 5630 Muri / Chemin des Crêts 4, 1630 Bulle",
  "kondition_pv": "40_30_30",
  "kondition_batterie": "70_30"
}$j$) on conflict do nothing;

/** Rundet auf ganze Franken (Werkverträge, Chris 27.10.2026). */
create or replace function public.runde_franken(p_rappen numeric) returns bigint
language sql immutable set search_path = '' as $$ select (round(p_rappen / 100) * 100)::bigint $$;
grant execute on function public.runde_franken(numeric) to authenticated;

/**
 * Eigene Raten [{text, prozent}] als Tranchen: Bezeichnung in beiden Sprachen gleich, erste Rate 10 Tage nach
 * Unterzeichnung fällig (sie ist die Anzahlungsrechnung). Zusammen genau 100 %, jede Rate mit Text, höchstens 6.
 */
create or replace function intern.eigene_tranchen(p_raten jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  t jsonb := '[]';
  summe numeric := 0;
  r jsonb;
  i int := 0;
begin
  if jsonb_typeof(p_raten) is distinct from 'array' or jsonb_array_length(p_raten) = 0
     or jsonb_array_length(p_raten) > 6 then
    raise exception using message = 'auftrag.raten_fehlen';
  end if;
  for r in select value from jsonb_array_elements(p_raten) loop
    if nullif(trim(coalesce(r ->> 'text', '')), '') is null then raise exception using message = 'auftrag.raten_text'; end if;
    if coalesce((r ->> 'prozent')::numeric, 0) <= 0 then raise exception using message = 'auftrag.raten_summe'; end if;
    summe := summe + (r ->> 'prozent')::numeric;
    t := t || jsonb_build_array(jsonb_build_object('anteil', (r ->> 'prozent')::numeric / 100,
           'de', trim(r ->> 'text'), 'fr', trim(r ->> 'text')) ||
           case when i = 0 then '{"faellig": "unterschrift", "tage": 10}'::jsonb else '{}'::jsonb end);
    i := i + 1;
  end loop;
  if summe <> 100 then raise exception using message = 'auftrag.raten_summe'; end if;
  return t;
end
$$;

/**
 * Zahlungsplan aus Vertragswert und Zahlungsbedingung. p_zahlung: {"kondition": "70_30"} oder
 * {"kondition": "anzahlung", "anzahlung_rappen": 400000} oder {"kondition": "eigene", "raten": [{"text", "prozent"}]}. Jede Rate auf ganze Franken, die letzte nimmt
 * den Rest, damit die Summe genau stimmt. Eine Anzahlung ab dem Vertragswert ergibt eine einzige Rate.
 */
create or replace function public.zahlungsplan_vorschlag(p_wert bigint, p_zahlung jsonb, p_sprache text,
                                                         p_unterzeichnet date, p_baubeginn date default null)
returns table (nr int, bezeichnung text, betrag_rappen bigint, faellig_am date)
language plpgsql stable set search_path = '' as $$
declare
  kond text := coalesce(nullif(p_zahlung ->> 'kondition', ''), 'normal');
  fix bigint := nullif(p_zahlung ->> 'anzahlung_rappen', '')::bigint;
  t jsonb;
  anzahl int;
  n int := 0;
  benutzt bigint := 0;
  b bigint;
begin
  select eigenschaften -> 'tranchen' into t from public.auswahlwerte
   where liste = 'zahlungskondition' and schluessel = kond and aktiv and geloescht_am is null;
  if t is null then raise exception using message = 'auftrag.kondition_unbekannt'; end if;
  if kond = 'eigene' then
    t := intern.eigene_tranchen(p_zahlung -> 'raten');
  end if;
  if t -> 0 ? 'betrag' then
    if fix is null or fix <= 0 then raise exception using message = 'auftrag.anzahlung_fehlt'; end if;
    if fix >= p_wert then t := jsonb_build_array(t -> 0 || '{"anteil": 1}'); end if;
  end if;
  anzahl := jsonb_array_length(t);
  for i in 0 .. anzahl - 1 loop
    n := n + 1;
    b := case when n = anzahl then p_wert - benutzt
              when t -> i ? 'betrag' then fix
              else public.runde_franken(p_wert * (t -> i ->> 'anteil')::numeric) end;
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
grant execute on function public.zahlungsplan_vorschlag(bigint, jsonb, text, date, date) to authenticated;

/** Alte Schnittstelle: Kondition als Schlüssel, rechnet jetzt wie zahlungsplan_vorschlag (ganze Franken). */
create or replace function public.zahlungsplan_berechnen(p_wert bigint, p_kondition text, p_sprache text,
                                                         p_unterzeichnet date, p_baubeginn date default null)
returns table (nr int, bezeichnung text, betrag_rappen bigint, faellig_am date)
language sql stable set search_path = '' as $$
  select * from public.zahlungsplan_vorschlag(p_wert, jsonb_build_object('kondition', p_kondition), p_sprache,
                                              p_unterzeichnet, p_baubeginn)
$$;

/** Nur bekannte Angaben übernehmen; leere Texte entfernen. */
create or replace function intern.werkvertrag_angaben(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, v), '{}')
    from jsonb_each(coalesce(p, '{}')) e(k, v)
   where k in ('gegenstand', 'material', 'beginn', 'fertig', 'optionen', 'ansprechperson')
     and v <> '""'::jsonb and v <> 'null'::jsonb
$$;

-- Fahrplan: Projekte aus «Auftrag erstellen» bekamen bisher keine Ablauf-Vorlage und damit keinen Fahrplan.
-- Batterie ohne PV-Leistung = Speicher-Nachrüstung, sonst Photovoltaik (wie der Import).
create or replace function intern.ablauf_fuer_offerte(o public.offerten) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.ablauf_vorlagen
   where geloescht_am is null and aktiv
     and schluessel = case when nullif(trim(coalesce(o.batterie, '')), '') is not null
                                and coalesce(o.leistung_kwp, 0) = 0 then 'speicher' else 'pv' end
   limit 1
$$;

update public.projekte p
   set ablauf_vorlage_id = coalesce(
         (select intern.ablauf_fuer_offerte(o) from public.offerten o where o.id = p.offerte_id),
         (select id from public.ablauf_vorlagen where schluessel = 'pv' and geloescht_am is null))
 where p.ablauf_vorlage_id is null and p.geloescht_am is null;

/**
 * Auftrag erstellen (V232), erweitert: p.kondition (Vorlage oder «anzahlung» mit p.anzahlung_rappen) und
 * p.angaben (Texte des Vertrags). Sonst wie bisher: Offerte angenommen, Projekt, Zahlungsplan (nur solange
 * nichts verrechnet ist) und Werkvertrag. Ein schon versendeter Vertrag wird zur neuen Version.
 */
create or replace function public.auftrag_erstellen(p_offerte uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  std uuid;
  spr text;
  kond text := coalesce(nullif(p ->> 'kondition', ''), 'normal');
  zahlung jsonb;
  wert bigint := nullif(p ->> 'vertragswert_rappen', '')::bigint;
  unterz date := coalesce(nullif(p ->> 'unterzeichnet_am', '')::date, current_date);
  -- Ohne «angaben» bleiben die gespeicherten Texte (z. B. Aufruf aus einer Online-Annahme).
  ang jsonb := case when p ? 'angaben' then intern.werkvertrag_angaben(p -> 'angaben') end;
  pr public.projekte;
  wv public.werkvertraege;
  firma uuid;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if o.status in ('verloren', 'archiviert') then raise exception using message = 'auftrag.offerte_verloren'; end if;
  if wert is null or wert <= 0 then raise exception using message = 'auftrag.wert_fehlt'; end if;
  zahlung := jsonb_strip_nulls(jsonb_build_object('kondition', kond,
               'anzahlung_rappen', case when kond = 'anzahlung' then nullif(p ->> 'anzahlung_rappen', '')::bigint end,
               'raten', case when kond = 'eigene' then p -> 'raten' end));
  -- Prüft die Bedingung, bevor etwas gespeichert wird (z. B. Anzahlung fehlt).
  perform 1 from public.zahlungsplan_vorschlag(wert, zahlung, 'de', unterz);
  std := coalesce(nullif(p ->> 'standort_id', '')::uuid, o.standort_id);
  spr := coalesce(nullif(p ->> 'sprache', ''), (select sprache from public.standorte where id = std), o.sprache);
  select firma_id into firma from public.standorte where id = std;

  update public.offerten set status = 'angenommen', entscheid = 'angenommen',
         entscheid_am = coalesce(entscheid_am, unterz), entscheid_von = intern.mein_vorname()
   where id = o.id;

  select * into pr from public.projekte where offerte_id = o.id and geloescht_am is null order by erstellt_am desc limit 1;
  if pr.id is null then
    insert into public.projekte (nummer, kontakt_id, objekt_id, offerte_id, verkaufschance_id, titel, status, standort_id,
                                 verantwortlich_id, unterzeichnet_am, vertragswert_rappen, vertrag_sprache, zahlungskonditionen,
                                 ablauf_vorlage_id)
    values (case when exists (select 1 from public.projekte where nummer = o.nummer) then o.nummer || '-A' else o.nummer end,
            o.kontakt_id, o.objekt_id, o.id, o.verkaufschance_id, o.titel, 'auftrag', std,
            o.verantwortlich_id, unterz, wert, spr, kond, intern.ablauf_fuer_offerte(o))
    returning * into pr;
  else
    update public.projekte set standort_id = std, unterzeichnet_am = unterz, vertragswert_rappen = wert,
           vertrag_sprache = spr, zahlungskonditionen = kond,
           ablauf_vorlage_id = coalesce(ablauf_vorlage_id, intern.ablauf_fuer_offerte(o))
     where id = pr.id returning * into pr;
  end if;

  if not exists (select 1 from public.zahlungsplan z where z.projekt_id = pr.id and z.geloescht_am is null
                  and (z.rechnung_nr is not null or z.bezahlt_am is not null or z.abaninja_id is not null
                       or exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id
                                     and r.geloescht_am is null and r.status <> 'storniert'))) then
    -- Papierkorb statt Löschen: der alte Plan bleibt nachvollziehbar.
    update public.zahlungsplan set geloescht_am = now() where projekt_id = pr.id and geloescht_am is null;
    insert into public.zahlungsplan (projekt_id, bezeichnung, betrag_rappen, faellig_am)
    select pr.id, z.bezeichnung, z.betrag_rappen, z.faellig_am
      from public.zahlungsplan_vorschlag(wert, zahlung, spr, unterz, pr.baubeginn) z order by z.nr;
  end if;

  if coalesce((p ->> 'werkvertrag')::boolean, true) then
    select * into wv from public.werkvertraege
     where offerte_id = o.id and geloescht_am is null and status <> 'storniert' order by erstellt_am desc limit 1;
    if wv.id is null then
      insert into public.werkvertraege (nummer, offerte_id, projekt_id, kontakt_id, firma_id, sprache, betrag_rappen,
                                        status, erstellt_datum, notiz, angaben)
      values (case when exists (select 1 from public.werkvertraege where nummer = o.nummer)
                   then o.nummer || '-' || (select count(*) + 1 from public.werkvertraege where nummer like o.nummer || '%')
                   else o.nummer end,
              o.id, pr.id, o.kontakt_id, firma, spr, wert, 'erstellt', current_date, kond,
              coalesce(ang, '{}') || jsonb_build_object('zahlung', zahlung));
    elsif wv.status in ('entwurf', 'erstellt', 'versendet') then
      ang := coalesce(ang, intern.werkvertrag_angaben(wv.angaben)) || jsonb_build_object('zahlung', zahlung);
      update public.werkvertraege
         set projekt_id = pr.id, firma_id = firma, sprache = spr, betrag_rappen = wert, notiz = kond,
             angaben = ang,
             version = case when wv.status = 'versendet' or betrag_rappen is distinct from wert
                              or sprache is distinct from spr or angaben is distinct from ang
                            then version + 1 else version end,
             status = 'erstellt', versendet_am = null, erstellt_datum = current_date
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
 * Anzahlungsrechnung zum Werkvertrag: erste Rate des Zahlungsplans. Gibt es dazu schon eine Rechnung im CRM,
 * kommt sie zurück (ein Entwurf wird gestellt). Ist die Rate schon anderswo verrechnet (AbaNinja) oder
 * bezahlt, gibt es einen Fehler statt einer zweiten Rechnung. Braucht das Recht «finanzen».
 */
create or replace function public.werkvertrag_anzahlungsrechnung(p_werkvertrag uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  w public.werkvertraege;
  z public.zahlungsplan;
  r public.rechnungen;
  v_id uuid;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into w from public.werkvertraege where id = p_werkvertrag and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if w.status = 'storniert' then raise exception using errcode = 'P0001', message = 'werkvertrag.storniert'; end if;
  select * into z from public.zahlungsplan
   where projekt_id = w.projekt_id and geloescht_am is null
   order by faellig_am nulls last, betrag_rappen desc limit 1;
  if not found then raise exception using errcode = 'P0001', message = 'werkvertrag.kein_zahlungsplan'; end if;
  select * into r from public.rechnungen
   where zahlungsplan_id = z.id and geloescht_am is null and status <> 'storniert' order by erstellt_am desc limit 1;
  if r.id is null then
    if z.rechnung_nr is not null or z.abaninja_id is not null or z.bezahlt_am is not null then
      raise exception using errcode = 'P0001', message = 'werkvertrag.anzahlung_verrechnet';
    end if;
    v_id := public.rechnung_entwurf(jsonb_build_object('zahlungsplan_id', z.id, 'sprache', w.sprache));
    select * into r from public.rechnungen where id = v_id;
  end if;
  if r.status = 'entwurf' then perform public.rechnung_stellen(r.id); end if;
  return r.id;
end
$$;
revoke execute on function public.werkvertrag_anzahlungsrechnung(uuid) from public, anon;
grant execute on function public.werkvertrag_anzahlungsrechnung(uuid) to authenticated;

/** Werkverträge wie bisher, dazu Angaben, Telefon/Mail der Firma und die Anzahlung (erste Rate). */
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
  lower(concat_ws(' ', w.nummer, intern.kontaktname(k), ob.ort, ob.plz, o.nummer)) as suchtext,
  -- neu (Werkvertrag nach Vorlage Muri)
  w.angaben, f.telefon as firma_telefon, f.email as firma_email,
  (select jsonb_build_object('betrag_rappen', z.betrag_rappen, 'rechnung_nr', coalesce(r.nummer, z.rechnung_nr),
                             'rechnung_id', r.id, 'rechnung_status', r.status, 'bezahlt_am', z.bezahlt_am,
                             'abaninja', z.abaninja_id is not null)
     from public.zahlungsplan z
     left join lateral (select x.id, x.nummer, x.status from public.rechnungen x
                         where x.zahlungsplan_id = z.id and x.geloescht_am is null and x.status <> 'storniert'
                         order by x.erstellt_am desc limit 1) r on true
    where z.projekt_id = w.projekt_id and z.geloescht_am is null
    order by z.faellig_am nulls last, z.betrag_rappen desc limit 1) as anzahlung
from public.werkvertraege w
join public.kontakte k on k.id = w.kontakt_id
left join public.offerten o on o.id = w.offerte_id
left join public.projekte p on p.id = w.projekt_id
left join public.objekte ob on ob.id = coalesce(p.objekt_id, o.objekt_id)
left join lateral (select x.strasse, x.plz, x.ort from public.objekte x
                    where x.kontakt_id = k.id and x.geloescht_am is null order by x.erstellt_am limit 1) ko on true
left join public.standorte st on st.id = coalesce(p.standort_id, o.standort_id)
left join public.firmen f on f.id = coalesce(w.firma_id, st.firma_id)
where w.geloescht_am is null;
grant select on public.werkvertraege_liste to authenticated;

-- Wer unterschreibt und wer Ansprechperson ist, ändert nur die Administration (wie Regeln der Monitore).
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte', 'werkvertrag') and auth.uid() is not null
     and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  if new.schluessel = 'automationen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'automation.kein_recht';
  end if;
  if new.schluessel = 'ki' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return new;
end
$$;

-- ---------- Eigene Unterschrift (Chris 31.10.2026) ----------
-- Jede Person legt ihre Unterschrift selbst ab (Mein Konto) und setzt sie in Dokumente ein, die sie aus dem
-- CRM unterschreibt. Privater Speicher, Ordner = Person; nur die Person selbst liest und ändert ihn, auch die
-- Administration nicht (eine Unterschrift setzt nur, wer sie besitzt).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('unterschriften', 'unterschriften', false, 1048576, array['image/png'])
on conflict (id) do nothing;
create policy "unterschrift lesen" on storage.objects for select to authenticated
  using (bucket_id = 'unterschriften' and (storage.foldername(name))[1] = intern.meine_person_id()::text);
create policy "unterschrift ablegen" on storage.objects for insert to authenticated
  with check (bucket_id = 'unterschriften' and (storage.foldername(name))[1] = intern.meine_person_id()::text);
create policy "unterschrift ersetzen" on storage.objects for update to authenticated
  using (bucket_id = 'unterschriften' and (storage.foldername(name))[1] = intern.meine_person_id()::text);
create policy "unterschrift entfernen" on storage.objects for delete to authenticated
  using (bucket_id = 'unterschriften' and (storage.foldername(name))[1] = intern.meine_person_id()::text);
