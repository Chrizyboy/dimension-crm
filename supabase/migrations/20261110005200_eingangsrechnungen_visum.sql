-- Eingangsrechnungen mit Visum (Chris 2.11.2026, Fragen 1A und 2A): Lieferantenrechnungen aus AbaNinja oder
-- von Hand, Erstvisum durch den Projektleiter des Projekts, Zweitvisum der Geschäftsleitung ab CHF 5'000 oder
-- wenn es keine Bestellung gibt (andere Person als beim Erstvisum). Danach «zur Zahlung bereit»; bezahlt wird
-- in AbaNinja, der Abgleich setzt «bezahlt». Vergleich mit Bestellung und Wareneingang für das Visum.

create table public.eingangsrechnungen (
  id                 uuid primary key default gen_random_uuid(),
  quelle             text not null default 'hand' check (quelle in ('hand', 'abaninja')),
  kreditor_zahlung_id uuid unique references public.kreditor_zahlungen (id),
  abaninja_uuid      text unique,
  lieferant          text not null,
  lieferant_id       uuid references public.lieferanten (id),
  nummer             text,
  datum              date,
  faellig_am         date,
  betrag_rappen      bigint not null check (betrag_rappen > 0),
  offen_rappen       bigint,
  skonto_prozent     numeric(4, 2),
  skonto_bis         date,
  projekt_id         uuid references public.projekte (id),
  bestellung_id      uuid references public.bestellungen (id),
  dokument_id        uuid references public.dokumente (id),
  text               text,
  status             text not null default 'neu'
                     check (status in ('neu', 'visum_pl', 'visum_gl', 'bereit', 'bezahlt', 'abgelehnt', 'storniert')),
  visum_pl_person_id uuid references public.personen (id),
  visum_pl_von       uuid references public.personen (id),
  visum_pl_am        timestamptz,
  visum_pl_bemerkung text,
  visum_gl_noetig    boolean not null default false,
  visum_gl_von       uuid references public.personen (id),
  visum_gl_am        timestamptz,
  visum_gl_bemerkung text,
  abgelehnt_von      uuid references public.personen (id),
  abgelehnt_grund    text,
  bezahlt_am         date
);
select intern.richte_fachtabelle_ein('eingangsrechnungen', 'finanzen');
create index eingangsrechnungen_status_idx on public.eingangsrechnungen (status) where geloescht_am is null;
create index eingangsrechnungen_visum_idx on public.eingangsrechnungen (visum_pl_person_id) where geloescht_am is null;
comment on table public.eingangsrechnungen is
  'Lieferantenrechnungen mit Visum (Projektleitung, ab Schwelle oder ohne Bestellung zusätzlich Geschäftsleitung).';

/** Geschäftsleitung für das Zweitvisum (einstellungen.finanzen.eingang.gl_person_ids, sonst Chris, Andreas, Erich). */
create or replace function intern.visum_gl_personen() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null
        and p.id::text in (select jsonb_array_elements_text(intern.fin_cfg() #> '{eingang,gl_person_ids}'))),
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null
        and p.kuerzel in ('chris', 'andreas', 'erich')),
    '{}')
$$;

-- Projektleitung und Geschäftsleitung sehen die Rechnungen, die sie visieren (neben dem Recht finanzen).
create policy visum_lesen on public.eingangsrechnungen for select to authenticated using (
  visum_pl_person_id = (select intern.meine_person_id())
  or ((select intern.meine_person_id()) = any (intern.visum_gl_personen()) and status in ('visum_gl', 'bereit', 'bezahlt'))
);

/** Vor dem Speichern: wer visiert, braucht es die GL, in welchem Stand beginnt die Rechnung. */
create or replace function intern.eingang_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ab bigint := coalesce((intern.fin_cfg() #>> '{eingang,visum_gl_ab_rappen}')::bigint, 500000);
begin
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
create trigger vorbereiten before insert or update on public.eingangsrechnungen
  for each row execute function intern.eingang_vorbereiten();

/** Glocke beim Wechsel des Stands: Projektleiter (Erstvisum), Geschäftsleitung (Zweitvisum), Buchhaltung (bereit). */
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
  if new.status = 'visum_pl' then
    perform intern.glocke(array[new.visum_pl_person_id], 'info', 'Rechnung visieren', 'Facture à viser',
                          v_text, v_text, v_ziel);
  elsif new.status = 'visum_gl' then
    perform intern.glocke(array(select x from unnest(intern.visum_gl_personen()) x where x is distinct from new.visum_pl_von),
                          'info', 'Zweitvisum Geschäftsleitung', 'Second visa direction', v_text, v_text, v_ziel);
  elsif new.status = 'bereit' then
    perform intern.glocke(intern.buchhaltung_personen(), 'ok', 'Zur Zahlung bereit', 'Prête au paiement',
                          v_text, v_text, v_ziel);
  end if;
  return null;
end
$$;
create trigger melden after insert or update on public.eingangsrechnungen
  for each row execute function intern.eingang_melden();

/**
 * Lieferantenrechnungen aus dem Abgleich mit AbaNinja (kreditor_zahlungen, Quelle abaninja) kommen als
 * Eingangsrechnung zum Visum; später übernimmt der Abgleich Betrag, offenen Betrag und «bezahlt».
 * Bestellung aus der Referenz (B-Nummer), sonst Projekt aus der Kreditor-Zahlung.
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
  if v_id is null then
    if new.status <> 'offen' then return null; end if;   -- schon Bezahltes nicht nachträglich zum Visum
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
  end if;
  return null;
end
$$;
create trigger eingang after insert or update on public.kreditor_zahlungen
  for each row execute function intern.eingang_aus_kreditor();

/**
 * Visum geben (p_ok) oder ablehnen mit Grund. Erstvisum: Projektleiter des Projekts oder Geschäftsleitung als
 * Stellvertretung. Zweitvisum: Geschäftsleitung, nicht dieselbe Person wie beim Erstvisum.
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
  if e.status = 'visum_pl' then
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
  -- In den Finanzen gilt die Zahlung als geprüft, sobald sie zur Zahlung bereit ist.
  update public.kreditor_zahlungen k set geprueft = true
    from public.eingangsrechnungen x
   where x.id = p_id and x.status = 'bereit' and k.id = x.kreditor_zahlung_id;
  return (select status from public.eingangsrechnungen where id = p_id);
end
$$;

/**
 * Erfassen oder ändern (Recht finanzen). p: lieferant, lieferant_id, nummer, datum, faellig_am, betrag_rappen,
 * skonto_prozent, skonto_bis, projekt_id, bestellung_id, dokument_id, text. Abgelehnte kommen damit wieder
 * zum Visum (status neu).
 */
create or replace function public.eingang_speichern(p_id uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := p_id;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if v_id is null then
    insert into public.eingangsrechnungen (lieferant, lieferant_id, nummer, datum, faellig_am, betrag_rappen, skonto_prozent,
                                           skonto_bis, projekt_id, bestellung_id, dokument_id, text)
    values (trim(p ->> 'lieferant'), nullif(p ->> 'lieferant_id', '')::uuid, nullif(trim(p ->> 'nummer'), ''),
            nullif(p ->> 'datum', '')::date, nullif(p ->> 'faellig_am', '')::date, (p ->> 'betrag_rappen')::bigint,
            nullif(p ->> 'skonto_prozent', '')::numeric, nullif(p ->> 'skonto_bis', '')::date,
            nullif(p ->> 'projekt_id', '')::uuid, nullif(p ->> 'bestellung_id', '')::uuid,
            nullif(p ->> 'dokument_id', '')::uuid, nullif(trim(p ->> 'text'), ''))
    returning id into v_id;
    return v_id;
  end if;
  update public.eingangsrechnungen set
    lieferant = coalesce(nullif(trim(p ->> 'lieferant'), ''), lieferant),
    lieferant_id = case when p ? 'lieferant_id' then nullif(p ->> 'lieferant_id', '')::uuid else lieferant_id end,
    nummer = case when p ? 'nummer' then nullif(trim(p ->> 'nummer'), '') else nummer end,
    datum = case when p ? 'datum' then nullif(p ->> 'datum', '')::date else datum end,
    faellig_am = case when p ? 'faellig_am' then nullif(p ->> 'faellig_am', '')::date else faellig_am end,
    betrag_rappen = coalesce((p ->> 'betrag_rappen')::bigint, betrag_rappen),
    skonto_prozent = case when p ? 'skonto_prozent' then nullif(p ->> 'skonto_prozent', '')::numeric else skonto_prozent end,
    skonto_bis = case when p ? 'skonto_bis' then nullif(p ->> 'skonto_bis', '')::date else skonto_bis end,
    projekt_id = case when p ? 'projekt_id' then nullif(p ->> 'projekt_id', '')::uuid else projekt_id end,
    bestellung_id = case when p ? 'bestellung_id' then nullif(p ->> 'bestellung_id', '')::uuid else bestellung_id end,
    dokument_id = case when p ? 'dokument_id' then nullif(p ->> 'dokument_id', '')::uuid else dokument_id end,
    text = case when p ? 'text' then nullif(trim(p ->> 'text'), '') else text end,
    status = case when status = 'abgelehnt' then 'neu' else status end,
    visum_pl_von = case when status = 'abgelehnt' then null else visum_pl_von end,
    visum_pl_am = case when status = 'abgelehnt' then null else visum_pl_am end
  where id = v_id and geloescht_am is null and status not in ('bezahlt', 'storniert');
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.eingang_fest'; end if;
  return v_id;
end
$$;

/** Von Hand als bezahlt markieren (ohne AbaNinja-Abgleich). */
create or replace function public.eingang_bezahlt(p_id uuid, p_datum date) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.eingangsrechnungen set status = 'bezahlt', offen_rappen = 0,
         bezahlt_am = coalesce(p_datum, (now() at time zone 'Europe/Zurich')::date)
   where id = p_id and geloescht_am is null and status = 'bereit';
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.nicht_bereit'; end if;
end
$$;

/** Liste mit Namen (Rechte wie die Tabelle). */
create or replace view public.eingangsrechnungen_liste with (security_invoker = true) as
select e.id, e.quelle, e.lieferant, e.nummer, e.datum, e.faellig_am, e.betrag_rappen, e.offen_rappen, e.skonto_prozent,
       e.skonto_bis, e.projekt_id, p.nummer as projekt_nummer, p.titel as projekt_titel, intern.kontaktname(k) as kunde,
       e.bestellung_id, b.nummer as bestellung_nummer, e.dokument_id, e.text, e.status,
       e.visum_pl_person_id, pl.name as visum_pl_person, e.visum_pl_von, vpl.name as visum_pl_von_name, e.visum_pl_am,
       e.visum_pl_bemerkung, e.visum_gl_noetig, e.visum_gl_von, vgl.name as visum_gl_von_name, e.visum_gl_am,
       e.visum_gl_bemerkung, ab.name as abgelehnt_von_name, e.abgelehnt_grund, e.bezahlt_am, e.erstellt_am,
       e.status in ('neu', 'visum_pl', 'visum_gl', 'bereit') and e.faellig_am < (now() at time zone 'Europe/Zurich')::date as ueberfaellig
  from public.eingangsrechnungen e
  left join public.projekte p on p.id = e.projekt_id
  left join public.kontakte k on k.id = p.kontakt_id
  left join public.bestellungen b on b.id = e.bestellung_id
  left join public.personen pl on pl.id = e.visum_pl_person_id
  left join public.personen vpl on vpl.id = e.visum_pl_von
  left join public.personen vgl on vgl.id = e.visum_gl_von
  left join public.personen ab on ab.id = e.abgelehnt_von
 where e.geloescht_am is null;

/**
 * Vergleich mit der Bestellung für das Visum: Positionen bestellt/geliefert, Summe der Bestellung (Preise nur mit
 * Recht preise), Wareneingang. Für alle, die die Rechnung sehen dürfen.
 */
create or replace function public.eingang_vergleich(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e public.eingangsrechnungen;
  ich uuid := intern.meine_person_id();
  v_preise boolean := intern.hat_recht('preise') or intern.hat_recht('finanzen');
begin
  select * into e from public.eingangsrechnungen where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if not (intern.hat_recht('finanzen') or e.visum_pl_person_id = ich or ich = any (intern.visum_gl_personen())) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  if e.bestellung_id is null then return jsonb_build_object('bestellung', null); end if;
  return (
    select jsonb_build_object('bestellung', jsonb_build_object(
      'nummer', b.nummer, 'status', b.status, 'bestellt_am', b.bestellt_am,
      'total_rappen', case when v_preise then b.total_rappen end,
      'differenz_rappen', case when v_preise and b.total_rappen is not null
                               then e.betrag_rappen - round(b.total_rappen * (1 + public.mwst_satz() / 100)) end,
      'positionen', coalesce((select jsonb_agg(jsonb_build_object('bezeichnung', bp.bezeichnung, 'menge', bp.menge,
                                                                  'einheit', bp.einheit, 'geliefert', bp.geliefert_menge,
                                                                  'ek_rappen', case when v_preise then bp.ek_rappen end)
                                               order by bp.bezeichnung)
                                from public.bestellpositionen bp where bp.bestellung_id = b.id and bp.geloescht_am is null), '[]')))
      from public.bestellungen b where b.id = e.bestellung_id);
end
$$;

update public.einstellungen
   set wert = wert || jsonb_build_object('eingang', jsonb_build_object(
         'visum_gl_ab_rappen', 500000,
         'gl_person_ids', coalesce((select jsonb_agg(p.id) from public.personen p
                                     where p.kuerzel in ('chris', 'andreas', 'erich') and p.geloescht_am is null), '[]'::jsonb)))
 where schluessel = 'finanzen' and not (wert ? 'eingang');

revoke execute on function intern.visum_gl_personen() from public, anon;
grant execute on function intern.visum_gl_personen() to authenticated;
revoke execute on function intern.eingang_vorbereiten() from public, anon, authenticated;
revoke execute on function intern.eingang_melden() from public, anon, authenticated;
revoke execute on function intern.eingang_aus_kreditor() from public, anon, authenticated;
revoke execute on function public.eingang_visieren(uuid, boolean, text) from public, anon;
revoke execute on function public.eingang_speichern(uuid, jsonb) from public, anon;
revoke execute on function public.eingang_bezahlt(uuid, date) from public, anon;
revoke execute on function public.eingang_vergleich(uuid) from public, anon;
grant execute on function public.eingang_visieren(uuid, boolean, text) to authenticated;
grant execute on function public.eingang_speichern(uuid, jsonb) to authenticated;
grant execute on function public.eingang_bezahlt(uuid, date) to authenticated;
grant execute on function public.eingang_vergleich(uuid) to authenticated;
