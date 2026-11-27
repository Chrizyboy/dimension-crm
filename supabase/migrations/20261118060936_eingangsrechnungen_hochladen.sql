-- Eingangsrechnungen hochladen (Chris 27.11.2026): Wer eine Lieferantenrechnung bekommt (Scan oder Mail), schiebt
-- das PDF ins CRM. Die KI liest die Angaben aus (Vorschlag, gespeichert erst nach Klick). Daraus entstehen der
-- Dateiname «JJJJMMTT_Rechnungssteller_Rechnungsnummer_Grund.pdf», das Jahr der Ablage (Jahr der Leistungsperiode,
-- nicht des Rechnungsdatums) und der Hinweis auf eine Abgrenzung, wenn die Periode in ein anderes Jahr fällt.
-- Der Zeitplan legt das PDF in SharePoint ab (Bibliothek «Administration», «Compta/factures <Jahr>»).
-- Freigabe (Pop-up 27.11.): eine Person aus einstellungen.finanzen.eingang.pruefer_ids (Erich oder Chris) reicht,
-- nie die Person, die hochgeladen hat.

alter table public.eingangsrechnungen drop constraint if exists eingangsrechnungen_quelle_check;
alter table public.eingangsrechnungen add constraint eingangsrechnungen_quelle_check
  check (quelle in ('hand', 'abaninja', 'upload'));

alter table public.eingangsrechnungen
  add column if not exists grund            text,
  add column if not exists mwst_rappen      bigint check (mwst_rappen is null or mwst_rappen >= 0),
  add column if not exists iban             text,
  add column if not exists referenz         text,
  add column if not exists periode_von      date,
  add column if not exists periode_bis      date,
  add column if not exists hochgeladen_von  uuid references public.personen (id),
  add column if not exists ablage_item_id   text,
  add column if not exists ablage_url       text,
  add column if not exists ablage_name      text,
  add column if not exists ablage_jahr_ist  integer,
  add column if not exists ablage_fehler    text,
  add column if not exists ablage_versucht_am timestamptz,
  add column if not exists abaninja_ausgang_id uuid references public.ausgangskorb (id);
alter table public.eingangsrechnungen drop constraint if exists eingangsrechnungen_periode_check;
alter table public.eingangsrechnungen add constraint eingangsrechnungen_periode_check
  check (periode_von is null or periode_bis is null or periode_bis >= periode_von);
create index if not exists eingangsrechnungen_ablage_idx on public.eingangsrechnungen (id)
  where geloescht_am is null and dokument_id is not null and quelle = 'upload';

comment on column public.eingangsrechnungen.grund is 'Kurzer Rechnungsgrund für den Dateinamen, z. B. «KIA EV9».';
comment on column public.eingangsrechnungen.periode_von is 'Leistungsperiode (z. B. Verkehrssteuer 01.01.–31.12.2027): bestimmt Ablage-Jahr und Abgrenzung.';

/** Wer Eingangsrechnungen freigibt: einstellungen.finanzen.eingang.pruefer_ids, sonst Erich und Chris. */
create or replace function intern.eingang_pruefer() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null
        and p.id::text in (select jsonb_array_elements_text(intern.fin_cfg() #> '{eingang,pruefer_ids}'))),
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null
        and p.kuerzel in ('erich', 'chris')),
    '{}')
$$;

/** Zeichen, die SharePoint/Windows in Dateinamen nicht erlaubt, ersetzen; Leerraum zusammenziehen. */
create or replace function intern.eingang_namensteil(p text) returns text
language sql immutable set search_path = '' as $$
  select nullif(left(trim(both ' .' from regexp_replace(regexp_replace(coalesce(p, ''), '[\\/:*?"<>|#%_]+', '-', 'g'),
                                                   '\s+', ' ', 'g')), 80), '')
$$;

/** Dateiname wie in Compta: «20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9.pdf». */
create or replace function intern.eingang_dateiname(p_datum date, p_lieferant text, p_nummer text, p_grund text)
returns text
language sql immutable set search_path = '' as $$
  select concat_ws('_', to_char(p_datum, 'YYYYMMDD'), intern.eingang_namensteil(p_lieferant),
                   intern.eingang_namensteil(p_nummer), intern.eingang_namensteil(p_grund)) || '.pdf'
$$;

/** Jahr der Ablage: Beginn der Leistungsperiode, sonst Rechnungsdatum. */
create or replace function intern.eingang_ablage_jahr(p_datum date, p_von date) returns integer
language sql immutable set search_path = '' as $$
  select extract(year from coalesce(p_von, p_datum, (now() at time zone 'Europe/Zurich')::date))::integer
$$;

/**
 * Abgrenzung: Anteil der Periode je Jahr (Tage, Betrag in Rappen, Rest im letzten Jahr). «noetig», wenn ein Teil
 * nicht im Jahr des Rechnungsdatums liegt (z. B. Rechnung 2026 für das Jahr 2027).
 */
create or replace function intern.eingang_abgrenzung(p_datum date, p_von date, p_bis date, p_betrag bigint)
returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_total integer;
  v_jahre jsonb := '[]';
  v_rest bigint := p_betrag;
  v_y integer;
  v_tage integer;
  v_anteil bigint;
  v_letztes integer;
begin
  if p_von is null or p_bis is null or p_bis < p_von then return null; end if;
  v_total := p_bis - p_von + 1;
  v_letztes := extract(year from p_bis)::integer;
  for v_y in extract(year from p_von)::integer .. v_letztes loop
    v_tage := least(p_bis, make_date(v_y, 12, 31)) - greatest(p_von, make_date(v_y, 1, 1)) + 1;
    v_anteil := case when v_y = v_letztes then v_rest else round(p_betrag::numeric * v_tage / v_total)::bigint end;
    v_rest := v_rest - v_anteil;
    v_jahre := v_jahre || jsonb_build_object('jahr', v_y, 'tage', v_tage, 'rappen', v_anteil);
  end loop;
  return jsonb_build_object(
    'noetig', p_datum is not null and (extract(year from p_von)::integer <> extract(year from p_datum)::integer
                                       or v_letztes <> extract(year from p_datum)::integer),
    'buchungsjahr', extract(year from p_datum)::integer,
    'jahre', v_jahre);
end
$$;

/** Vor dem Speichern: hochgeladene Rechnungen gehen direkt zur Freigabe (ohne Zweitvisum). */
create or replace function intern.eingang_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ab bigint := coalesce((intern.fin_cfg() #>> '{eingang,visum_gl_ab_rappen}')::bigint, 500000);
begin
  if new.quelle = 'upload' then
    new.visum_gl_noetig := false;
    if new.status = 'neu' then new.status := 'visum_pl'; end if;
    if new.offen_rappen is null then new.offen_rappen := new.betrag_rappen; end if;
    return new;
  end if;
  if new.bestellung_id is not null and new.projekt_id is null then
    select b.projekt_id into new.projekt_id from public.bestellungen b where b.id = new.bestellung_id;
  end if;
  if new.projekt_id is not null and (tg_op = 'INSERT' or new.projekt_id is distinct from old.projekt_id) then
    select p.verantwortlich_id into new.visum_pl_person_id from public.projekte p where p.id = new.projekt_id;
  end if;
  new.visum_gl_noetig := new.betrag_rappen >= v_ab or new.bestellung_id is null;
  if new.status = 'neu' and new.visum_pl_person_id is not null then new.status := 'visum_pl'; end if;
  if new.offen_rappen is null then new.offen_rappen := new.betrag_rappen; end if;
  return new;
end
$$;

/** Glocke beim Wechsel des Stands; hochgeladene an die Prüfer (ohne die Person, die hochgeladen hat). */
create or replace function intern.eingang_melden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_text text := new.lieferant || coalesce(' ' || new.nummer, '') || ' · CHF '
                 || to_char(new.betrag_rappen / 100.0, 'FM999G999G990D00')
                 || coalesce(' · ' || (select p.nummer from public.projekte p where p.id = new.projekt_id), '');
  v_ziel text := '/invoices?reiter=eingang&eingang=' || new.id;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.visum_pl_person_id is not distinct from old.visum_pl_person_id then
    return null;
  end if;
  if new.status = 'visum_pl' and new.quelle = 'upload' then
    perform intern.glocke(array(select x from unnest(intern.eingang_pruefer()) x where x is distinct from new.hochgeladen_von),
                          'info', 'Rechnung freigeben', 'Facture à valider', v_text, v_text, v_ziel);
  elsif new.status = 'visum_pl' then
    perform intern.glocke(array[new.visum_pl_person_id], 'info', 'Rechnung visieren', 'Facture à viser',
                          v_text, v_text, v_ziel);
  elsif new.status = 'visum_gl' then
    perform intern.glocke(array(select x from unnest(intern.visum_gl_personen()) x where x is distinct from new.visum_pl_von),
                          'info', 'Zweitvisum Geschäftsleitung', 'Second visa direction', v_text, v_text, v_ziel);
  elsif new.status = 'bereit' then
    perform intern.glocke(intern.buchhaltung_personen(), 'ok', 'Zur Zahlung bereit', 'Prête au paiement',
                          v_text, v_text, v_ziel);
  elsif new.status = 'abgelehnt' and new.quelle = 'upload' then
    perform intern.glocke(array[new.hochgeladen_von], 'warnung', 'Rechnung zurückgewiesen', 'Facture refusée',
                          v_text || coalesce(' · ' || new.abgelehnt_grund, ''),
                          v_text || coalesce(' · ' || new.abgelehnt_grund, ''), v_ziel);
  end if;
  return null;
end
$$;

-- Wer hochgeladen hat, sieht seine Rechnungen; die Prüfer sehen alle hochgeladenen.
create policy hochgeladen_lesen on public.eingangsrechnungen for select to authenticated using (
  hochgeladen_von = (select intern.meine_person_id())
  or (quelle = 'upload' and (select intern.meine_person_id()) = any (intern.eingang_pruefer()))
);

/**
 * Hochgeladene Rechnung speichern (alle Angemeldeten). Ohne p_id neu (quelle «upload»); mit p_id ändern, solange
 * sie nicht bezahlt ist: durch die Person, die hochgeladen hat, die Prüfer oder Recht «finanzen». Eine Änderung
 * nach der Freigabe oder Ablehnung schickt die Rechnung erneut zur Freigabe.
 */
create or replace function public.eingang_hochladen(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  e public.eingangsrechnungen;
  v_id uuid := p_id;
begin
  if ich is null then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if nullif(trim(p ->> 'lieferant'), '') is null or coalesce((p ->> 'betrag_rappen')::bigint, 0) <= 0 then
    raise exception using errcode = 'P0001', message = 'finanzen.eingang_angaben';
  end if;
  if v_id is null then
    insert into public.eingangsrechnungen (quelle, hochgeladen_von, lieferant, nummer, datum, faellig_am, betrag_rappen,
                                           mwst_rappen, skonto_prozent, skonto_bis, iban, referenz, grund, periode_von,
                                           periode_bis, dokument_id, text)
    values ('upload', ich, trim(p ->> 'lieferant'), nullif(trim(p ->> 'nummer'), ''),
            coalesce(nullif(p ->> 'datum', '')::date, (now() at time zone 'Europe/Zurich')::date),
            nullif(p ->> 'faellig_am', '')::date, (p ->> 'betrag_rappen')::bigint,
            nullif(p ->> 'mwst_rappen', '')::bigint, nullif(p ->> 'skonto_prozent', '')::numeric,
            nullif(p ->> 'skonto_bis', '')::date, nullif(upper(replace(p ->> 'iban', ' ', '')), ''),
            nullif(trim(p ->> 'referenz'), ''), nullif(trim(p ->> 'grund'), ''),
            nullif(p ->> 'periode_von', '')::date, nullif(p ->> 'periode_bis', '')::date,
            nullif(p ->> 'dokument_id', '')::uuid, nullif(trim(p ->> 'text'), ''))
    returning id into v_id;
    return v_id;
  end if;
  select * into e from public.eingangsrechnungen where id = v_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if not (e.hochgeladen_von = ich or ich = any (intern.eingang_pruefer()) or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  if e.status in ('bezahlt', 'storniert') then raise exception using errcode = 'P0001', message = 'finanzen.eingang_fest'; end if;
  update public.eingangsrechnungen set
    lieferant = trim(p ->> 'lieferant'), nummer = nullif(trim(p ->> 'nummer'), ''),
    datum = coalesce(nullif(p ->> 'datum', '')::date, datum), faellig_am = nullif(p ->> 'faellig_am', '')::date,
    betrag_rappen = (p ->> 'betrag_rappen')::bigint, mwst_rappen = nullif(p ->> 'mwst_rappen', '')::bigint,
    offen_rappen = (p ->> 'betrag_rappen')::bigint,
    skonto_prozent = nullif(p ->> 'skonto_prozent', '')::numeric, skonto_bis = nullif(p ->> 'skonto_bis', '')::date,
    iban = nullif(upper(replace(p ->> 'iban', ' ', '')), ''), referenz = nullif(trim(p ->> 'referenz'), ''),
    grund = nullif(trim(p ->> 'grund'), ''),
    periode_von = nullif(p ->> 'periode_von', '')::date, periode_bis = nullif(p ->> 'periode_bis', '')::date,
    text = nullif(trim(p ->> 'text'), ''),
    -- Wer etwas ändert, nachdem es freigegeben oder abgelehnt war: wieder zur Freigabe.
    status = case when e.quelle = 'upload' and e.status in ('bereit', 'abgelehnt') then 'visum_pl' else status end,
    visum_pl_von = case when e.quelle = 'upload' and e.status in ('bereit', 'abgelehnt') then null else visum_pl_von end,
    visum_pl_am = case when e.quelle = 'upload' and e.status in ('bereit', 'abgelehnt') then null else visum_pl_am end,
    abgelehnt_von = case when e.status = 'abgelehnt' then null else abgelehnt_von end,
    abgelehnt_grund = case when e.status = 'abgelehnt' then null else abgelehnt_grund end
  where id = v_id;
  return v_id;
end
$$;

/**
 * Visum oder Freigabe (ersetzt die Fassung aus 20261114002600). Hochgeladene: eine Person aus eingang_pruefer()
 * gibt frei, nie die Person, die hochgeladen hat; danach «zur Zahlung bereit». Sonst unverändert: Erstvisum
 * Projektleitung (GL als Stellvertretung), Zweitvisum GL mit Vier-Augen.
 */
create or replace function public.eingang_visieren(p_id uuid, p_ok boolean, p_bemerkung text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.eingangsrechnungen;
  ich uuid := intern.meine_person_id();
  v_gl boolean := ich = any (intern.visum_gl_personen());
begin
  select * into e from public.eingangsrechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if not p_ok and nullif(trim(p_bemerkung), '') is null then
    raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt';
  end if;
  if e.quelle = 'upload' then
    if e.status <> 'visum_pl' then raise exception using errcode = 'P0001', message = 'finanzen.visum_nicht_offen'; end if;
    if ich is null or not (ich = any (intern.eingang_pruefer())) then
      raise exception using errcode = 'P0001', message = 'finanzen.nicht_dein_visum';
    end if;
    if p_ok and ich = e.hochgeladen_von then raise exception using errcode = 'P0001', message = 'finanzen.vier_augen'; end if;
    if p_ok then
      update public.eingangsrechnungen set visum_pl_von = ich, visum_pl_am = now(),
             visum_pl_bemerkung = nullif(trim(p_bemerkung), ''), status = 'bereit'
       where id = p_id;
    end if;
  elsif e.status = 'visum_pl' then
    if ich is null or (ich is distinct from e.visum_pl_person_id and not v_gl) then
      raise exception using errcode = 'P0001', message = 'finanzen.nicht_dein_visum';
    end if;
    if p_ok then
      update public.eingangsrechnungen set visum_pl_von = ich, visum_pl_am = now(),
             visum_pl_bemerkung = nullif(trim(p_bemerkung), ''),
             status = case when e.visum_gl_noetig then 'visum_gl' else 'bereit' end
       where id = p_id;
    end if;
  elsif e.status = 'visum_gl' then
    if not v_gl then raise exception using errcode = 'P0001', message = 'finanzen.nicht_dein_visum'; end if;
    if p_ok and ich = e.visum_pl_von then raise exception using errcode = 'P0001', message = 'finanzen.vier_augen'; end if;
    if p_ok then
      update public.eingangsrechnungen set visum_gl_von = ich, visum_gl_am = now(),
             visum_gl_bemerkung = nullif(trim(p_bemerkung), ''), status = 'bereit'
       where id = p_id;
    end if;
  else
    raise exception using errcode = 'P0001', message = 'finanzen.visum_nicht_offen';
  end if;
  if not p_ok then
    update public.eingangsrechnungen set status = 'abgelehnt', abgelehnt_von = ich, abgelehnt_grund = trim(p_bemerkung)
     where id = p_id;
  end if;
  update public.kreditor_zahlungen k set geprueft = true
    from public.eingangsrechnungen x
   where x.id = p_id and x.status = 'bereit' and k.id = x.kreditor_zahlung_id;
  return (select status from public.eingangsrechnungen where id = p_id);
end
$$;

/**
 * Abgleich mit AbaNinja (ersetzt 20261114002600): kommt eine Lieferantenrechnung, die schon hochgeladen wurde
 * (gleiche Rechnungsnummer und gleicher Betrag), wird sie verknüpft statt doppelt angelegt.
 */
create or replace function intern.eingang_aus_kreditor() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_best uuid;
  v_id uuid;
begin
  if new.quelle is distinct from 'abaninja' or new.abaninja_uuid is null or coalesce(new.betrag_rappen, 0) <= 0 then
    return null;
  end if;
  select id into v_id from public.eingangsrechnungen where kreditor_zahlung_id = new.id;
  if v_id is null and nullif(trim(new.rechnung_nr), '') is not null then
    select e.id into v_id from public.eingangsrechnungen e
     where e.quelle = 'upload' and e.kreditor_zahlung_id is null and e.geloescht_am is null
       and e.betrag_rappen = new.betrag_rappen
       and lower(regexp_replace(e.nummer, '\s', '', 'g')) = lower(regexp_replace(new.rechnung_nr, '\s', '', 'g'))
     order by e.erstellt_am desc limit 1;
    if v_id is not null then
      update public.eingangsrechnungen set kreditor_zahlung_id = new.id, abaninja_uuid = new.abaninja_uuid
       where id = v_id;
    end if;
  end if;
  if v_id is null then
    if new.status <> 'offen' then return null; end if;
    select b.id into v_best from public.bestellungen b
     where b.geloescht_am is null
       and (coalesce(new.text, '') || ' ' || coalesce(new.rechnung_nr, '')) ~* ('\m' || b.nummer || '\M')
     limit 1;
    insert into public.eingangsrechnungen (quelle, kreditor_zahlung_id, abaninja_uuid, lieferant, lieferant_id, nummer, datum,
                                           faellig_am, betrag_rappen, offen_rappen, projekt_id, bestellung_id, text)
    values ('abaninja', new.id, new.abaninja_uuid, new.firma, new.lieferant_id, new.rechnung_nr, new.rechnung_am,
            new.faellig_am, new.betrag_rappen, coalesce(new.offen_rappen, new.betrag_rappen), new.projekt_id, v_best, new.text);
  else
    update public.eingangsrechnungen set
      betrag_rappen = new.betrag_rappen, offen_rappen = coalesce(new.offen_rappen, offen_rappen),
      faellig_am = coalesce(new.faellig_am, faellig_am), projekt_id = coalesce(projekt_id, new.projekt_id),
      bezahlt_am = coalesce(new.bezahlt_am, bezahlt_am),
      status = case when new.status = 'storniert' then 'storniert'
                    when new.status = 'bezahlt' and status not in ('abgelehnt', 'storniert') then 'bezahlt'
                    else status end
    where id = v_id;
    -- Freigabe im CRM gilt auch in den Finanzen.
    update public.kreditor_zahlungen k set geprueft = true
      from public.eingangsrechnungen x where x.id = v_id and x.status = 'bereit' and k.id = new.id and not k.geprueft;
  end if;
  return null;
end
$$;

/** Liste (ersetzt 20261114002600, neue Spalten hinten angehängt). */
create or replace view public.eingangsrechnungen_liste with (security_invoker = true) as
select e.id, e.quelle, e.lieferant, e.nummer, e.datum, e.faellig_am, e.betrag_rappen, e.offen_rappen, e.skonto_prozent,
       e.skonto_bis, e.projekt_id, p.nummer as projekt_nummer, p.titel as projekt_titel, intern.kontaktname(k) as kunde,
       e.bestellung_id, b.nummer as bestellung_nummer, e.dokument_id, e.text, e.status,
       e.visum_pl_person_id, pl.name as visum_pl_person, e.visum_pl_von, vpl.name as visum_pl_von_name, e.visum_pl_am,
       e.visum_pl_bemerkung, e.visum_gl_noetig, e.visum_gl_von, vgl.name as visum_gl_von_name, e.visum_gl_am,
       e.visum_gl_bemerkung, ab.name as abgelehnt_von_name, e.abgelehnt_grund, e.bezahlt_am, e.erstellt_am,
       e.status in ('neu', 'visum_pl', 'visum_gl', 'bereit') and e.faellig_am < (now() at time zone 'Europe/Zurich')::date as ueberfaellig,
       coalesce(case
         when e.quelle = 'upload' then e.status = 'visum_pl'
                                       and (select intern.meine_person_id()) = any (intern.eingang_pruefer())
                                       and e.hochgeladen_von is distinct from (select intern.meine_person_id())
         when e.status = 'visum_pl' then e.visum_pl_person_id = (select intern.meine_person_id())
                              or (select intern.meine_person_id()) = any (intern.visum_gl_personen())
         when e.status = 'visum_gl' then (select intern.meine_person_id()) = any (intern.visum_gl_personen())
                              and e.visum_pl_von is distinct from (select intern.meine_person_id())
         else false end, false) as ich_visiere,
       e.grund, e.mwst_rappen, e.iban, e.referenz, e.periode_von, e.periode_bis, e.hochgeladen_von,
       hv.name as hochgeladen_von_name,
       intern.eingang_dateiname(e.datum, e.lieferant, e.nummer, e.grund) as dateiname,
       intern.eingang_ablage_jahr(e.datum, e.periode_von) as ablage_jahr,
       intern.eingang_abgrenzung(e.datum, e.periode_von, e.periode_bis, e.betrag_rappen) as abgrenzung,
       e.ablage_url, e.ablage_fehler,
       e.ablage_url is not null and e.ablage_name = intern.eingang_dateiname(e.datum, e.lieferant, e.nummer, e.grund)
         and e.ablage_jahr_ist = intern.eingang_ablage_jahr(e.datum, e.periode_von) as abgelegt,
       e.abaninja_ausgang_id is not null as an_abaninja
  from public.eingangsrechnungen e
  left join public.projekte p on p.id = e.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.bestellungen b on b.id = e.bestellung_id
  left join public.personen pl on pl.id = e.visum_pl_person_id
  left join public.personen vpl on vpl.id = e.visum_pl_von
  left join public.personen vgl on vgl.id = e.visum_gl_von
  left join public.personen ab on ab.id = e.abgelehnt_von
  left join public.personen hv on hv.id = e.hochgeladen_von
 where e.geloescht_am is null;

/** Zeitplan: hochgeladene Rechnungen, deren PDF noch nicht (oder unter altem Namen/Jahr) in Compta liegt. */
create or replace function public.eingang_ablage_offen(p_limit integer) returns table (
  id uuid, speicher_pfad text, dateiname text, jahr integer, item_id text)
language sql stable security definer set search_path = '' as $$
  select e.id, d.speicher_pfad, intern.eingang_dateiname(e.datum, e.lieferant, e.nummer, e.grund),
         intern.eingang_ablage_jahr(e.datum, e.periode_von), e.ablage_item_id
    from public.eingangsrechnungen e
    join public.dokumente d on d.id = e.dokument_id and d.speicher_pfad is not null
   where e.geloescht_am is null and e.quelle = 'upload' and e.status <> 'storniert'
     and (e.ablage_name is distinct from intern.eingang_dateiname(e.datum, e.lieferant, e.nummer, e.grund)
          or e.ablage_jahr_ist is distinct from intern.eingang_ablage_jahr(e.datum, e.periode_von))
     -- nach einem Fehler höchstens stündlich neu versuchen
     and (e.ablage_fehler is null or e.ablage_versucht_am < now() - interval '1 hour')
   order by e.erstellt_am
   limit greatest(1, least(p_limit, 50))
$$;

/** Zeitplan: Ergebnis der Ablage festhalten. */
create or replace function public.eingang_ablage_ergebnis(p_id uuid, p_ok boolean, p_item text, p_url text,
                                                          p_name text, p_jahr integer, p_fehler text) returns void
language sql security definer set search_path = '' as $$
  update public.eingangsrechnungen set
    ablage_item_id = case when p_ok then p_item else ablage_item_id end,
    ablage_url = case when p_ok then p_url else ablage_url end,
    ablage_name = case when p_ok then p_name else ablage_name end,
    ablage_jahr_ist = case when p_ok then p_jahr else ablage_jahr_ist end,
    ablage_fehler = case when p_ok then null else coalesce(p_fehler, 'fehler') end,
    ablage_versucht_am = now()
  where id = p_id
$$;

update public.einstellungen
   set wert = jsonb_set(wert, '{eingang}', coalesce(wert -> 'eingang', '{}'::jsonb) || jsonb_build_object(
         'pruefer_ids', coalesce((select jsonb_agg(p.id) from public.personen p
                                   where p.kuerzel in ('erich', 'chris') and p.geloescht_am is null), '[]'::jsonb),
         'ablage', jsonb_build_object('bibliothek', 'Administration', 'ordner', 'Compta/factures {jahr}')))
 where schluessel = 'finanzen' and not coalesce(wert -> 'eingang' ? 'pruefer_ids', false);

revoke execute on function intern.eingang_pruefer() from public, anon;
grant execute on function intern.eingang_pruefer() to authenticated;
revoke execute on function intern.eingang_namensteil(text) from public, anon;
revoke execute on function intern.eingang_dateiname(date, text, text, text) from public, anon;
revoke execute on function intern.eingang_ablage_jahr(date, date) from public, anon;
revoke execute on function intern.eingang_abgrenzung(date, date, date, bigint) from public, anon;
grant execute on function intern.eingang_namensteil(text) to authenticated;
grant execute on function intern.eingang_dateiname(date, text, text, text) to authenticated;
grant execute on function intern.eingang_ablage_jahr(date, date) to authenticated;
grant execute on function intern.eingang_abgrenzung(date, date, date, bigint) to authenticated;
revoke execute on function public.eingang_hochladen(uuid, jsonb) from public, anon;
grant execute on function public.eingang_hochladen(uuid, jsonb) to authenticated;
revoke execute on function public.eingang_ablage_offen(integer) from public, anon, authenticated;
revoke execute on function public.eingang_ablage_ergebnis(uuid, boolean, text, text, text, integer, text)
  from public, anon, authenticated;

-- AbaNinja (Pop-up 27.11.): Die Schnittstelle nimmt keine Lieferantenrechnungen an. Nach der Freigabe geht das PDF
-- darum als Mail an die Beleg-Adresse von AbaNinja (einstellungen.finanzen.eingang.abaninja_mail). Die Freigabe ist
-- die menschliche Freigabe dieser Mail; versendet wird über den Ausgangskorb. Der Abgleich verknüpft die Rechnung
-- danach über Nummer und Betrag (intern.eingang_aus_kreditor).

/** Nach der Freigabe einer hochgeladenen Rechnung: PDF an AbaNinja (einmal pro Rechnung). */
create or replace function intern.eingang_an_abaninja() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_an text := nullif(trim(intern.fin_cfg() #>> '{eingang,abaninja_mail}'), '');
  v_name text := intern.eingang_dateiname(new.datum, new.lieferant, new.nummer, new.grund);
  v_id uuid;
begin
  if new.quelle <> 'upload' or new.status <> 'bereit' or old.status = 'bereit' or new.dokument_id is null
     or new.abaninja_ausgang_id is not null or v_an is null then
    return null;
  end if;
  insert into public.ausgangskorb (kanal, art, an, betreff, text, anhaenge, absender_person_id, sprache, bezug_tabelle,
                                   bezug_id, schluessel, status, freigegeben_von, freigegeben_am)
  values ('mail', 'abaninja_beleg', v_an, left(v_name, 200),
          new.lieferant || coalesce(' ' || new.nummer, '') || ' · CHF ' || to_char(new.betrag_rappen / 100.0, 'FM999G999G990D00'),
          jsonb_build_array(jsonb_build_object('dokument_id', new.dokument_id, 'name', v_name)),
          coalesce(new.visum_pl_von, new.hochgeladen_von), 'de', 'eingangsrechnungen', new.id,
          'eingang_abaninja:' || new.id, 'freigegeben', new.visum_pl_von, now())
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    update public.eingangsrechnungen set abaninja_ausgang_id = v_id where id = new.id;
  end if;
  return null;
end
$$;
create trigger an_abaninja after update of status on public.eingangsrechnungen
  for each row execute function intern.eingang_an_abaninja();
revoke execute on function intern.eingang_an_abaninja() from public, anon, authenticated;

grant execute on function public.eingang_ablage_offen(integer) to service_role;
grant execute on function public.eingang_ablage_ergebnis(uuid, boolean, text, text, text, integer, text) to service_role;
