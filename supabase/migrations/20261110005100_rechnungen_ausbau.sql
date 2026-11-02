-- Rechnungen vollständig (Chris 2.11.2026, Thread «Rechnungen vollständig machen»):
-- Angaben für den Alltag (abweichende Rechnungsadresse, Referenz des Kunden, Versandweg), Mahnsperre,
-- Zahlungszusage, Ausbuchen (Rundung, Skonto, Kulanz, Verlust), Verlauf je Rechnung, Mahnlauf jeden Montag
-- (nur Chris gibt frei), «Verrechnen auslösen» durch den zuständigen Projektleiter, sobald der Meilenstein
-- erreicht ist, Zahlungsstand für Projektleitung und Verkauf (nur lesen) und die Übersicht der Buchhaltung.

-- 1. Neue Angaben auf der Rechnung -----------------------------------------------------------------------------
alter table public.rechnungen
  add column if not exists rechnung_an jsonb,
  add column if not exists kunden_referenz text,
  add column if not exists versandweg text not null default 'mail',
  add column if not exists mahnsperre_bis date,
  add column if not exists mahnsperre_grund text,
  add column if not exists zusage_bis date,
  add column if not exists erinnert_am date,
  add column if not exists ausgebucht_rappen bigint not null default 0,
  add column if not exists ausgebucht_art text,
  add column if not exists ausgebucht_grund text;
alter table public.rechnungen add constraint rechnungen_versandweg_check check (versandweg in ('mail', 'post'));
alter table public.rechnungen add constraint rechnungen_ausgebucht_art_check
  check (ausgebucht_art is null or ausgebucht_art in ('rundung', 'skonto', 'kulanz', 'verlust'));
comment on column public.rechnungen.rechnung_an is
  'Abweichende Rechnungsadresse {name, zusatz, strasse, plz, ort, email} (Verwaltung, Buchhaltung des Kunden).';
comment on column public.rechnungen.ausgebucht_rappen is
  'Nicht mehr erwarteter Rest (Rundung, Skonto, Kulanz, Verlust); gebucht wird in AbaNinja.';

alter table public.zahlungsplan
  add column if not exists verrechnen_ausgeloest_am timestamptz,
  add column if not exists verrechnen_ausgeloest_von uuid references public.personen (id);
comment on column public.zahlungsplan.verrechnen_ausgeloest_am is
  'Projektleiter hat «Verrechnen auslösen» geklickt (Meilenstein erreicht), danach entsteht der Entwurf.';

-- Verlauf je Rechnung: Notizen, Anrufe, Zusagen und was das System festhält.
create table public.rechnung_ereignisse (
  id          uuid primary key default gen_random_uuid(),
  rechnung_id uuid not null references public.rechnungen (id),
  art         text not null check (art in ('notiz', 'anruf', 'mail', 'zusage', 'mahnsperre', 'ausgebucht', 'system')),
  text        text not null,
  person_id   uuid references public.personen (id) default intern.meine_person_id()
);
select intern.richte_fachtabelle_ein('rechnung_ereignisse', 'finanzen');
create index rechnung_ereignisse_rechnung_idx on public.rechnung_ereignisse (rechnung_id) where geloescht_am is null;

-- 2. Stand der Rechnung: bezahlt zählt mit Ausgebuchtem ---------------------------------------------------------
/** Bezahlt, Stand und Bezahlt-Datum aus Zahlungen und Ausgebuchtem; dazu die Tranche im Zahlungsplan. */
create or replace function intern.rechnung_stand_setzen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_bezahlt bigint;
  v_datum date;
  r public.rechnungen;
  v_erledigt boolean;
begin
  select coalesce(sum(betrag_rappen), 0), max(datum) into v_bezahlt, v_datum
    from public.rechnung_zahlungen where rechnung_id = p_id and geloescht_am is null;
  select * into r from public.rechnungen where id = p_id;
  if r.status in ('entwurf', 'storniert') then
    raise exception using errcode = 'P0001', message = 'finanzen.nicht_gestellt';
  end if;
  v_erledigt := v_bezahlt + r.ausgebucht_rappen >= r.total_rappen;
  update public.rechnungen
     set bezahlt_rappen = v_bezahlt,
         status = case when v_erledigt then 'bezahlt' when v_bezahlt > 0 then 'teilbezahlt' else 'gestellt' end,
         bezahlt_am = case when v_erledigt then coalesce(v_datum, (now() at time zone 'Europe/Zurich')::date) end
   where id = p_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan
       set bezahlt_am = case when v_erledigt then coalesce(v_datum, (now() at time zone 'Europe/Zurich')::date) end
     where id = r.zahlungsplan_id;
  end if;
end
$$;

/** Nach jeder Zahlung den Stand neu rechnen (ersetzt die Fassung aus Phase 10, jetzt mit Ausgebuchtem). */
create or replace function intern.zahlung_verbuchen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform intern.rechnung_stand_setzen(coalesce(new.rechnung_id, old.rechnung_id));
  return null;
end
$$;

-- 3. Hilfen: wer gibt frei, wer ist Buchhaltung, Glocke ----------------------------------------------------------
/** Personen, die Mahnungen freigeben (einstellungen.finanzen.mahnlauf.freigabe_person_ids, sonst Chris, sonst Administration). */
create or replace function intern.mahnung_freigeber() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(p.id) from public.personen p
      where p.aktiv and p.geloescht_am is null
        and p.id::text in (select jsonb_array_elements_text(intern.fin_cfg() #> '{mahnlauf,freigabe_person_ids}'))),
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null and p.kuerzel = 'chris'),
    (select array_agg(p.id) from public.personen p left join public.rollen r on r.schluessel = p.rolle
      where p.aktiv and p.geloescht_am is null and ('admin' = any (p.rechte) or 'admin' = any (coalesce(r.rechte, '{}')))),
    '{}')
$$;

/** Personen der Buchhaltung: Recht «finanzen» ausdrücklich in Rolle oder Person (nicht nur über Administration). */
create or replace function intern.buchhaltung_personen() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p left join public.rollen r on r.schluessel = p.rolle
   where p.aktiv and p.geloescht_am is null and ('finanzen' = any (p.rechte) or 'finanzen' = any (coalesce(r.rechte, '{}')))
$$;

/** Glocke für mehrere Personen (gleicher Text DE/FR). */
create or replace function intern.glocke(p_personen uuid[], p_art text, p_titel_de text, p_titel_fr text,
                                         p_text_de text, p_text_fr text, p_ziel text) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select distinct x, p_art, p_titel_de, p_titel_fr, p_text_de, p_text_fr, p_ziel from unnest(p_personen) x where x is not null
$$;

/** Verlauf: Eintrag ins Ereignis-Protokoll der Rechnung. */
create or replace function intern.rechnung_ereignis(p_id uuid, p_art text, p_text text) returns void
language sql security definer set search_path = '' as $$
  insert into public.rechnung_ereignisse (rechnung_id, art, text, person_id) values (p_id, p_art, p_text, intern.meine_person_id())
$$;

-- 4. Abläufe auf der Rechnung -----------------------------------------------------------------------------------
/** Angaben, die auch nach dem Stellen änderbar sind: abweichende Adresse, Referenz des Kunden, Versandweg. */
create or replace function public.rechnung_angaben(p_id uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.rechnungen set
    rechnung_an = case when p ? 'rechnung_an' then
                    case when jsonb_typeof(p -> 'rechnung_an') = 'object' and nullif(trim(p #>> '{rechnung_an,name}'), '') is not null
                         then p -> 'rechnung_an' end
                  else rechnung_an end,
    kunden_referenz = case when p ? 'kunden_referenz' then nullif(trim(p ->> 'kunden_referenz'), '') else kunden_referenz end,
    versandweg = coalesce(nullif(p ->> 'versandweg', ''), versandweg)
  where id = p_id and geloescht_am is null and status <> 'storniert';
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
end
$$;

/** Mahnsperre bis Datum mit Grund (z. B. offene Reklamation); ohne Datum = aufheben. */
create or replace function public.rechnung_mahnsperre(p_id uuid, p_bis date, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_bis is not null and nullif(trim(p_grund), '') is null then
    raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt';
  end if;
  update public.rechnungen set mahnsperre_bis = p_bis, mahnsperre_grund = case when p_bis is not null then trim(p_grund) end
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  perform intern.rechnung_ereignis(p_id, 'mahnsperre',
    case when p_bis is null then 'Mahnsperre aufgehoben'
         else 'Mahnsperre bis ' || to_char(p_bis, 'DD.MM.YYYY') || ': ' || trim(p_grund) end);
end
$$;

/** Zahlungszusage des Kunden: bis dahin wird nicht gemahnt. */
create or replace function public.rechnung_zusage(p_id uuid, p_bis date, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_bis is null then raise exception using errcode = 'P0001', message = 'finanzen.datum_fehlt'; end if;
  update public.rechnungen set zusage_bis = p_bis where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  perform intern.rechnung_ereignis(p_id, 'zusage',
    'Zahlung zugesagt bis ' || to_char(p_bis, 'DD.MM.YYYY') || coalesce(': ' || nullif(trim(p_text), ''), ''));
end
$$;

/** Notiz oder Anruf im Verlauf. */
create or replace function public.rechnung_notiz(p_id uuid, p_art text, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_art not in ('notiz', 'anruf', 'mail') then raise exception using errcode = 'P0001', message = 'finanzen.art_ungueltig'; end if;
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.text_fehlt'; end if;
  perform intern.rechnung_ereignis(p_id, p_art, trim(p_text));
end
$$;

/**
 * Rest ausbuchen (Rundung, Skonto, Kulanz/Gutschrift, Verlust): höchstens der offene Betrag. Danach gilt die
 * Rechnung als erledigt, wenn nichts mehr offen ist. Gebucht wird in AbaNinja.
 */
create or replace function public.rechnung_ausbuchen(p_id uuid, p_betrag bigint, p_art text, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
  v_offen bigint;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status not in ('gestellt', 'teilbezahlt') then raise exception using errcode = 'P0001', message = 'finanzen.nicht_gestellt'; end if;
  if p_art not in ('rundung', 'skonto', 'kulanz', 'verlust') then
    raise exception using errcode = 'P0001', message = 'finanzen.art_ungueltig';
  end if;
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  v_offen := r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen;
  if p_betrag is null or p_betrag <= 0 or p_betrag > v_offen then
    raise exception using errcode = 'P0001', message = 'finanzen.betrag_ungueltig';
  end if;
  update public.rechnungen set ausgebucht_rappen = r.ausgebucht_rappen + p_betrag, ausgebucht_art = p_art,
         ausgebucht_grund = trim(p_grund)
   where id = p_id;
  perform intern.rechnung_stand_setzen(p_id);
  perform intern.rechnung_ereignis(p_id, 'ausgebucht',
    'Ausgebucht CHF ' || to_char(p_betrag / 100.0, 'FM999G999G990D00') || ' (' || p_art || '): ' || trim(p_grund));
end
$$;

-- 5. Mahnlauf ---------------------------------------------------------------------------------------------------
/**
 * Was der Mahnlauf heute vorschlägt, je überfälliger Rechnung: stufe 0 = freundliche Erinnerung, 1–3 = Mahnung,
 * aktion senden | ueberspringen | betreibung, grund für Übersprungenes. Regeln in einstellungen.finanzen.mahnlauf.
 */
create or replace function intern.mahnlauf_liste() returns table (
  rechnung_id uuid, stufe int, aktion text, grund text, tage int, offen_rappen bigint
)
language sql stable security definer set search_path = '' as $$
  with cfg as (
    select coalesce((intern.fin_cfg() #>> '{mahnlauf,erinnerung_tage}')::int, 5) as erinnerung,
           coalesce((intern.fin_cfg() #>> '{mahnlauf,stufe1_tage}')::int, 20) as stufe1,
           coalesce((intern.fin_cfg() #>> '{mahnlauf,abstand_tage}')::int, coalesce((intern.fin_cfg() ->> 'mahnfrist_tage')::int, 10)) as abstand,
           coalesce((intern.fin_cfg() #>> '{mahnlauf,min_rappen}')::bigint, 5000) as minimum,
           (now() at time zone 'Europe/Zurich')::date as heute
  ), basis as (
    select r.*, c.*, c.heute - r.faellig_am as tage_ueber, r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen as offen,
           case
             when r.mahnstufe = 0 and r.erinnert_am is null then case when c.heute - r.faellig_am >= c.erinnerung then 0 end
             when r.mahnstufe = 0 then case when c.heute - r.faellig_am >= c.stufe1 and c.heute >= r.erinnert_am + c.abstand then 1 end
             when r.mahnstufe < 3 then case when c.heute > coalesce(r.mahnfrist, r.gemahnt_am + c.abstand) then r.mahnstufe + 1 end
             else case when c.heute > coalesce(r.mahnfrist, r.gemahnt_am + c.abstand) then 4 end
           end as naechste
      from public.rechnungen r cross join cfg c
     where r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt') and r.faellig_am < c.heute
  )
  select b.id, least(b.naechste, 3),
         case when b.naechste = 4 then 'betreibung'
              when b.offen < b.minimum or b.mahnsperre_bis >= b.heute or b.zusage_bis >= b.heute
                or exists (select 1 from public.service_faelle f where f.geloescht_am is null and f.status <> 'erledigt'
                             and (f.kontakt_id = b.kontakt_id or (b.projekt_id is not null and f.projekt_id = b.projekt_id)))
                or exists (select 1 from public.ausgangskorb a where a.geloescht_am is null and a.bezug_tabelle = 'rechnungen'
                             and a.bezug_id = b.id and a.art in ('mahnung', 'zahlungserinnerung')
                             and a.status in ('wartet', 'freigegeben', 'fehler'))
              then 'ueberspringen' else 'senden' end,
         case when b.offen < b.minimum then 'klein'
              when b.mahnsperre_bis >= b.heute then 'sperre'
              when b.zusage_bis >= b.heute then 'zusage'
              when exists (select 1 from public.ausgangskorb a where a.geloescht_am is null and a.bezug_tabelle = 'rechnungen'
                             and a.bezug_id = b.id and a.art in ('mahnung', 'zahlungserinnerung')
                             and a.status in ('wartet', 'freigegeben', 'fehler')) then 'unterwegs'
              when exists (select 1 from public.service_faelle f where f.geloescht_am is null and f.status <> 'erledigt'
                             and (f.kontakt_id = b.kontakt_id or (b.projekt_id is not null and f.projekt_id = b.projekt_id)))
                then 'reklamation' end,
         b.tage_ueber, b.offen
    from basis b
   where b.naechste is not null and b.offen > 0
   order by b.naechste desc, b.offen desc
$$;

/** Mahnlauf für die App (Recht finanzen), mit allem, was die Liste braucht. */
create or replace function public.mahnlauf_vorschlag() returns table (
  rechnung_id uuid, nummer text, kunde text, kontakt_id uuid, email text, sprache text, versandweg text,
  projekt_nummer text, total_rappen bigint, offen_rappen bigint, faellig_am date, tage int, mahnstufe int,
  stufe int, aktion text, grund text, mahnsperre_grund text, zusage_bis date
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  return query
  select l.rechnung_id, r.nummer, intern.kontaktname(k), r.kontakt_id,
         coalesce(nullif(r.rechnung_an ->> 'email', ''), k.email), r.sprache, r.versandweg, p.nummer,
         r.total_rappen, l.offen_rappen, r.faellig_am, l.tage, r.mahnstufe, l.stufe, l.aktion, l.grund,
         r.mahnsperre_grund, r.zusage_bis
    from intern.mahnlauf_liste() l
    join public.rechnungen r on r.id = l.rechnung_id
    join public.kontakte k on k.id = r.kontakt_id
    left join public.projekte p on p.id = r.projekt_id;
end
$$;

/** Darf ich Mahnungen und Erinnerungen freigeben? (nur Chris, änderbar in den Finanz-Einstellungen) */
create or replace function public.mahnung_darf_freigeben() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.meine_person_id() = any (intern.mahnung_freigeber())
$$;

/**
 * Mahnungen und Zahlungserinnerungen gibt nur die Freigabe-Person frei (Chris 2.11.2026). Eine Automation,
 * die «automatisch» senden würde, legt sie stattdessen zur Freigabe in den Ausgangskorb.
 */
create or replace function intern.mahnung_freigabe_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.art in ('mahnung', 'zahlungserinnerung') and new.status = 'freigegeben'
     and (tg_op = 'INSERT' or old.status is distinct from 'freigegeben')
     and not coalesce(intern.meine_person_id() = any (intern.mahnung_freigeber()), false) then
    if current_setting('intern.automation', true) = 'an' then
      new.status := 'wartet';
      new.freigegeben_von := null;
      new.freigegeben_am := null;
    else
      raise exception using errcode = 'P0001', message = 'finanzen.mahnung_nur_freigeber';
    end if;
  end if;
  return new;
end
$$;
create trigger mahnung_freigabe before insert or update of status on public.ausgangskorb
  for each row execute function intern.mahnung_freigabe_pruefen();

/** Gesendete Zahlungserinnerung: Datum merken (die Stufe bleibt 0, erst die Mahnung zählt). */
create or replace function intern.erinnerung_gesendet() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'gesendet' and old.status is distinct from 'gesendet' and new.art = 'zahlungserinnerung'
     and new.bezug_tabelle = 'rechnungen' then
    update public.rechnungen set erinnert_am = (now() at time zone 'Europe/Zurich')::date
     where id = new.bezug_id and status in ('gestellt', 'teilbezahlt');
  end if;
  return new;
end
$$;
create trigger erinnerung_gesendet after update of status on public.ausgangskorb
  for each row execute function intern.erinnerung_gesendet();

/**
 * Mahnen von Hand bleibt für den Versand per Post: nur die Freigabe-Person. Stufe 0 = Erinnerung (Datum),
 * sonst nächste Stufe mit Mahnfrist. Per Mail zählt die Stufe erst beim Senden (Trigger mahnung_gesendet).
 */
create or replace function public.rechnung_mahnen(p_id uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  r public.rechnungen;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_frist date;
begin
  if not public.mahnung_darf_freigeben() then
    raise exception using errcode = 'P0001', message = 'finanzen.mahnung_nur_freigeber';
  end if;
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if r.status not in ('gestellt', 'teilbezahlt') or r.faellig_am >= v_heute then
    raise exception using errcode = 'P0001', message = 'finanzen.nicht_ueberfaellig';
  end if;
  if r.mahnstufe = 0 and r.erinnert_am is null then
    update public.rechnungen set erinnert_am = v_heute where id = p_id;
    perform intern.rechnung_ereignis(p_id, 'system', 'Zahlungserinnerung per Post');
    return 0;
  end if;
  if r.mahnstufe >= 3 then raise exception using errcode = 'P0001', message = 'finanzen.mahnstufe_max'; end if;
  v_frist := v_heute + coalesce((intern.fin_cfg() ->> 'mahnfrist_tage')::int, 10);
  update public.rechnungen set mahnstufe = r.mahnstufe + 1, gemahnt_am = v_heute, mahnfrist = v_frist where id = p_id;
  if r.zahlungsplan_id is not null then
    update public.zahlungsplan set mahnstufe = r.mahnstufe + 1, mahnfrist = v_frist where id = r.zahlungsplan_id;
  end if;
  perform intern.rechnung_ereignis(p_id, 'system', (r.mahnstufe + 1)::text || '. Mahnung per Post');
  return r.mahnstufe + 1;
end
$$;

/** Montag früh: Glocke an die Freigabe-Person, wenn der Mahnlauf etwas zu senden hat. */
create or replace function intern.mahnlauf_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  v_summe bigint;
begin
  select count(*), coalesce(sum(offen_rappen), 0) into n, v_summe from intern.mahnlauf_liste() where aktion = 'senden';
  if n = 0 then return 0; end if;
  perform intern.glocke(intern.mahnung_freigeber(), 'warnung',
    'Mahnlauf: ' || n || ' Rechnungen zur Freigabe', 'Relances : ' || n || ' factures à valider',
    'Offen zusammen CHF ' || to_char(v_summe / 100.0, 'FM999G999G990D00') || '. Erst nach deiner Freigabe geht etwas hinaus.',
    'Total ouvert CHF ' || to_char(v_summe / 100.0, 'FM999G999G990D00') || '. Rien ne part sans ta validation.',
    '/invoices?reiter=mahnlauf');
  return n;
end
$$;

-- 6. Meilenstein und «Verrechnen auslösen» ------------------------------------------------------------------------
/**
 * Ist der Meilenstein einer Tranche erreicht? Aus dem Text der Zahlungsbedingung: Inbetriebnahme, Montage oder
 * Material/Baubeginn, Unterzeichnung; sonst das Fälligkeitsdatum. Gibt {erreicht, grund} zurück.
 */
create or replace function intern.tranche_meilenstein(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  z public.zahlungsplan;
  p public.projekte;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_text text;
  v_montage boolean;
  v_ibn boolean;
begin
  select * into z from public.zahlungsplan where id = p_id;
  select * into p from public.projekte where id = z.projekt_id;
  v_text := lower(coalesce(z.bezeichnung, ''));
  v_montage := p.status = 'abgeschlossen' or p.bau_status in ('ibn', 'fertig');
  v_ibn := p.status = 'abgeschlossen' or p.bau_status = 'fertig'
           or exists (select 1 from public.anlagen a where a.projekt_id = p.id and a.ibn_am is not null and a.geloescht_am is null);
  if v_text ~ '(inbetriebnahme|mise en service|\mibn\M|saldo|solde)' then
    return jsonb_build_object('erreicht', v_ibn, 'grund', 'ibn');
  elsif v_text ~ '(nach (der )?montage|après (le )?montage|fin des travaux)' then
    return jsonb_build_object('erreicht', v_montage, 'grund', 'montage');
  elsif v_text ~ '(unterzeichnung|unterschrift|signature)' then
    return jsonb_build_object('erreicht', p.unterzeichnet_am is not null or p.status in ('auftrag', 'im_bau', 'abgeschlossen'),
                              'grund', 'vertrag');
  elsif v_text ~ '(beginn|début|material|matériel)' then
    return jsonb_build_object('erreicht', coalesce(z.faellig_am <= v_heute + 14, false)
                                          or exists (select 1 from public.einsaetze e where e.projekt_id = p.id
                                                       and e.geloescht_am is null and e.art <> 'geplant'
                                                       and e.von <= v_heute + 14),
                              'grund', 'baubeginn');
  end if;
  return jsonb_build_object('erreicht', coalesce(z.faellig_am <= v_heute, false), 'grund', 'datum');
end
$$;

/**
 * «Verrechnen auslösen» (Chris 2.11.2026): der zuständige Projektleiter (projekte.verantwortlich_id) klickt,
 * sobald der Meilenstein erreicht ist; erst dann entsteht der Entwurf für die Buchhaltung, die ihn prüft und
 * stellt. Die Buchhaltung selbst darf jederzeit. Gibt die ID des Entwurfs zurück.
 */
create or replace function public.tranche_verrechnen(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  z public.zahlungsplan;
  p public.projekte;
  ich uuid := intern.meine_person_id();
  v_finanzen boolean := intern.hat_recht('finanzen');
  v_ms jsonb;
  v_sub text := current_setting('request.jwt.claim.sub', true);
  v_claims text := current_setting('request.jwt.claims', true);
  v_auth uuid;
  v_id uuid;
  v_name text;
begin
  select * into z from public.zahlungsplan where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  select * into p from public.projekte where id = z.projekt_id and geloescht_am is null;
  if not v_finanzen and (ich is null or p.verantwortlich_id is distinct from ich) then
    raise exception using errcode = 'P0001', message = 'finanzen.nur_projektleiter';
  end if;
  v_ms := intern.tranche_meilenstein(p_id);
  if not v_finanzen and not (v_ms ->> 'erreicht')::boolean then
    raise exception using errcode = 'P0001', message = 'finanzen.meilenstein_offen';
  end if;
  select name into v_name from public.personen where id = ich;
  update public.zahlungsplan set verrechnen_ausgeloest_am = coalesce(verrechnen_ausgeloest_am, now()),
         verrechnen_ausgeloest_von = coalesce(verrechnen_ausgeloest_von, ich)
   where id = p_id;

  -- Den Entwurf legt die Datenbank im Namen der Buchhaltung an (rechnung_entwurf verlangt das Recht finanzen).
  if not v_finanzen then
    select p2.auth_user_id into v_auth from public.personen p2 where p2.id = any (intern.buchhaltung_personen())
       and p2.auth_user_id is not null order by p2.erstellt_am limit 1;
    if v_auth is null then
      select p2.auth_user_id into v_auth from public.personen p2 where p2.id = any (intern.mahnung_freigeber())
         and p2.auth_user_id is not null limit 1;
    end if;
    if v_auth is null then raise exception using errcode = 'P0001', message = 'finanzen.keine_buchhaltung'; end if;
    perform set_config('request.jwt.claim.sub', v_auth::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_auth, 'role', 'authenticated')::text, true);
  end if;
  begin
    v_id := public.rechnung_entwurf(jsonb_build_object('zahlungsplan_id', p_id));
  exception when others then
    perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
    perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    raise;
  end;
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);

  insert into public.rechnung_ereignisse (rechnung_id, art, text, person_id)
  values (v_id, 'system', 'Verrechnung ausgelöst von ' || coalesce(v_name, '?') || ' (' || z.bezeichnung || ')', ich);
  if not v_finanzen then
    perform intern.glocke(intern.buchhaltung_personen(), 'info',
      'Rechnung prüfen und stellen: ' || coalesce(p.nummer, ''), 'Facture à vérifier et émettre : ' || coalesce(p.nummer, ''),
      coalesce(v_name, '') || ' hat «' || z.bezeichnung || '» zur Verrechnung freigegeben.',
      coalesce(v_name, '') || ' a lancé la facturation de « ' || z.bezeichnung || ' ».',
      '/invoices?rechnung=' || v_id);
  end if;
  return v_id;
end
$$;

/** Tranchen ohne Rechnung, jetzt mit Meilenstein, Auslösung und Projektleiter (ersetzt die Sicht aus Phase 10). */
create or replace view public.offene_tranchen with (security_invoker = true) as
select z.id, z.projekt_id, p.nummer as projekt_nummer, p.titel as projekt_titel, p.kontakt_id, intern.kontaktname(k) as kunde,
       z.bezeichnung, z.betrag_rappen, z.faellig_am, p.bau_status,
       intern.tranche_meilenstein(z.id) as meilenstein, z.verrechnen_ausgeloest_am,
       (select pe.name from public.personen pe where pe.id = z.verrechnen_ausgeloest_von) as ausgeloest_von,
       p.verantwortlich_id as projektleiter_id, (select pe.name from public.personen pe where pe.id = p.verantwortlich_id) as projektleiter
  from public.zahlungsplan z
  join public.projekte p on p.id = z.projekt_id and p.geloescht_am is null
  left join public.kontakte k on k.id = p.kontakt_id
 where z.geloescht_am is null and z.bezahlt_am is null and z.rechnung_nr is null
   and not exists (select 1 from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                     and r.status <> 'storniert');

-- 7. Zahlungsstand für Projektleitung und Verkauf (nur lesen) ----------------------------------------------------
/**
 * Zahlungsstand meiner Projekte (Projektleitung: verantwortlich; Verkauf: Lead zugeteilt). Mit Recht finanzen
 * und p_alle = alle laufenden Projekte. Pro Projekt die Tranchen mit Meilenstein und Rechnung (ohne Positionen).
 */
create or replace function public.zahlungsstand_projekte(p_alle boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  v_alle boolean := p_alle and intern.hat_recht('finanzen');
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  if ich is null then raise exception using errcode = '42501', message = 'finanzen.kein_recht'; end if;
  return coalesce((
    select jsonb_agg(x order by x ->> 'nummer' desc)
      from (
        select jsonb_build_object(
          'projekt_id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'kunde', intern.kontaktname(k),
          'status', p.status, 'bau_status', p.bau_status,
          'projektleiter_id', p.verantwortlich_id, 'ich_projektleiter', p.verantwortlich_id = ich,
          'vertragswert_rappen', coalesce(p.vertragswert_rappen, 0),
          'tranchen', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', z.id, 'bezeichnung', z.bezeichnung, 'betrag_rappen', z.betrag_rappen, 'faellig_am', z.faellig_am,
              'bezahlt_am', z.bezahlt_am, 'meilenstein', intern.tranche_meilenstein(z.id),
              'ausgeloest_am', z.verrechnen_ausgeloest_am,
              'rechnung', (select jsonb_build_object('id', r.id, 'nummer', r.nummer, 'status', r.status,
                                                     'total_rappen', r.total_rappen, 'bezahlt_rappen', r.bezahlt_rappen,
                                                     'offen_rappen', r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen,
                                                     'faellig_am', r.faellig_am, 'mahnstufe', r.mahnstufe,
                                                     'ueberfaellig', r.status in ('gestellt', 'teilbezahlt') and r.faellig_am < v_heute)
                             from public.rechnungen r where r.zahlungsplan_id = z.id and r.geloescht_am is null
                              and r.status <> 'storniert' order by r.erstellt_am desc limit 1))
              order by z.faellig_am nulls last, z.erstellt_am)
              from public.zahlungsplan z where z.projekt_id = p.id and z.geloescht_am is null), '[]'),
          'andere', coalesce((
            select jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'titel', r.titel, 'status', r.status,
                                                'total_rappen', r.total_rappen,
                                                'offen_rappen', r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen,
                                                'faellig_am', r.faellig_am, 'mahnstufe', r.mahnstufe,
                                                'ueberfaellig', r.status in ('gestellt', 'teilbezahlt') and r.faellig_am < v_heute)
                             order by r.erstellt_am)
              from public.rechnungen r where r.projekt_id = p.id and r.zahlungsplan_id is null and r.geloescht_am is null
               and r.status not in ('entwurf', 'storniert')), '[]'),
          'bezahlt_rappen', coalesce((select sum(r.bezahlt_rappen) from public.rechnungen r
                                       where r.projekt_id = p.id and r.geloescht_am is null and r.status <> 'storniert'), 0),
          'offen_rappen', coalesce((select sum(r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen) from public.rechnungen r
                                     where r.projekt_id = p.id and r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt')), 0),
          'ueberfaellig_rappen', coalesce((select sum(r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen) from public.rechnungen r
                                     where r.projekt_id = p.id and r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt')
                                       and r.faellig_am < v_heute), 0)) as x
          from public.projekte p
          left join public.kontakte k on k.id = p.kontakt_id
          left join public.verkaufschancen vc on vc.id = p.verkaufschance_id
         where p.geloescht_am is null
           and (v_alle or p.verantwortlich_id = ich or vc.tour_person_id = ich)
           and (p.status <> 'abgeschlossen' or exists (
                 select 1 from public.rechnungen r where r.projekt_id = p.id and r.geloescht_am is null
                    and r.status in ('gestellt', 'teilbezahlt')))
           and exists (select 1 from public.zahlungsplan z where z.projekt_id = p.id and z.geloescht_am is null)
      ) s), '[]');
end
$$;

-- 8. Übersicht der Buchhaltung -------------------------------------------------------------------------------
/** Kennzahlen und «Heute zu tun» für die Übersicht (Recht finanzen). */
create or replace function public.rechnungen_uebersicht() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v jsonb;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  with offen as (
    select r.*, r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen as rest, v_heute - r.faellig_am as tage
      from public.rechnungen r where r.geloescht_am is null and r.status in ('gestellt', 'teilbezahlt')
  )
  select jsonb_build_object(
    'offen_rappen', coalesce((select sum(rest) from offen), 0),
    'offen_anzahl', (select count(*) from offen),
    'ueberfaellig_rappen', coalesce((select sum(rest) from offen where tage > 0), 0),
    'ueberfaellig_anzahl', (select count(*) from offen where tage > 0),
    'erwartet_30_rappen', coalesce((select sum(rest) from offen where faellig_am <= v_heute + 30), 0),
    'gestellt_monat_rappen', coalesce((select sum(total_rappen) from public.rechnungen where geloescht_am is null
                                        and status not in ('entwurf', 'storniert') and date_trunc('month', datum) = date_trunc('month', v_heute)), 0),
    'tage_bis_zahlung', (select round(avg(bezahlt_am - datum)) from public.rechnungen where geloescht_am is null
                          and status = 'bezahlt' and bezahlt_am >= v_heute - 365 and datum is not null),
    'alter', jsonb_build_object(
      'nicht_faellig', coalesce((select sum(rest) from offen where tage <= 0), 0),
      'bis_30', coalesce((select sum(rest) from offen where tage between 1 and 30), 0),
      'bis_60', coalesce((select sum(rest) from offen where tage between 31 and 60), 0),
      'bis_90', coalesce((select sum(rest) from offen where tage between 61 and 90), 0),
      'ueber_90', coalesce((select sum(rest) from offen where tage > 90), 0)),
    'firmen', coalesce((select jsonb_agg(jsonb_build_object('name', f.name, 'offen_rappen', s.summe, 'anzahl', s.anzahl) order by f.kuerzel)
                          from (select firma_id, sum(rest) as summe, count(*) as anzahl from offen group by firma_id) s
                          join public.firmen f on f.id = s.firma_id), '[]'),
    'groesste', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nummer', o.nummer, 'kunde', intern.kontaktname(k),
                                                             'rest_rappen', o.rest, 'tage', o.tage, 'mahnstufe', o.mahnstufe))
                          from (select * from offen where tage > 0 order by rest desc limit 5) o
                          join public.kontakte k on k.id = o.kontakt_id), '[]'),
    'entwuerfe', (select count(*) from public.rechnungen where geloescht_am is null and status = 'entwurf'),
    'entwuerfe_rappen', coalesce((select sum(total_rappen) from public.rechnungen where geloescht_am is null and status = 'entwurf'), 0),
    'ausgeloest', (select count(*) from public.rechnungen r join public.zahlungsplan z on z.id = r.zahlungsplan_id
                    where r.geloescht_am is null and r.status = 'entwurf' and z.verrechnen_ausgeloest_am is not null),
    'mahnlauf', (select count(*) from intern.mahnlauf_liste() where aktion = 'senden'),
    'mahnlauf_rappen', coalesce((select sum(offen_rappen) from intern.mahnlauf_liste() where aktion = 'senden'), 0),
    'nicht_versendet', (select count(*) from offen o where o.abaninja_uuid is null and o.datum <= v_heute - 2
                         and not exists (select 1 from public.ausgangskorb a where a.bezug_tabelle = 'rechnungen'
                                           and a.bezug_id = o.id and a.art = 'rechnung' and a.geloescht_am is null
                                           and a.status <> 'verworfen')),
    'zusage_abgelaufen', (select count(*) from offen where zusage_bis < v_heute and zusage_bis >= v_heute - 14),
    'kleiner_rest', (select count(*) from offen where status = 'teilbezahlt'
                      and rest <= coalesce((intern.fin_cfg() #>> '{mahnlauf,min_rappen}')::bigint, 5000)),
    'zu_verrechnen', (select count(*) from public.offene_tranchen t where (t.meilenstein ->> 'erreicht')::boolean),
    'zu_verrechnen_rappen', coalesce((select sum(t.betrag_rappen) from public.offene_tranchen t
                                       where (t.meilenstein ->> 'erreicht')::boolean), 0)
  ) into v;
  return v;
end
$$;

/** Verlauf einer Rechnung: Ereignisse, Zahlungen und Mails/Mahnungen aus dem Ausgangskorb, neueste zuerst. */
create or replace function public.rechnung_verlauf(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  return coalesce((
    select jsonb_agg(e order by e ->> 'wann' desc)
      from (
        select jsonb_build_object('art', x.art, 'text', x.text, 'wann', x.erstellt_am, 'wer', pe.name) as e
          from public.rechnung_ereignisse x left join public.personen pe on pe.id = x.person_id
         where x.rechnung_id = p_id and x.geloescht_am is null
        union all
        select jsonb_build_object('art', 'zahlung', 'betrag_rappen', z.betrag_rappen, 'datum', z.datum,
                                  'text', coalesce(z.notiz, case z.quelle when 'abaninja' then 'AbaNinja' else '' end),
                                  'wann', z.erstellt_am)
          from public.rechnung_zahlungen z where z.rechnung_id = p_id and z.geloescht_am is null
        union all
        select jsonb_build_object('art', 'versand', 'mail_art', a.art, 'status', a.status, 'text', a.betreff, 'an', a.an,
                                  'wann', coalesce(a.gesendet_am, a.erstellt_am), 'wer', pe.name)
          from public.ausgangskorb a left join public.personen pe on pe.id = a.absender_person_id
         where a.bezug_tabelle = 'rechnungen' and a.bezug_id = p_id and a.geloescht_am is null
        union all
        select jsonb_build_object('art', 'gestellt', 'text', r.nummer, 'wann', r.datum::timestamptz)
          from public.rechnungen r where r.id = p_id and r.datum is not null
      ) s), '[]');
end
$$;

-- 9. Liste mit den neuen Angaben (ersetzt die Sicht aus Phase 10, neue Spalten am Ende) ---------------------------
/** Wurde eine gestellte Rechnung versendet (AbaNinja oder Mail im Ausgangskorb)? */
create or replace function intern.rechnung_versendet(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rechnungen r where r.id = p_id and r.abaninja_uuid is not null)
      or exists (select 1 from public.ausgangskorb a where a.bezug_tabelle = 'rechnungen' and a.bezug_id = p_id
                   and a.art = 'rechnung' and a.status = 'gesendet' and a.geloescht_am is null)
$$;

create or replace view public.rechnungen_liste with (security_invoker = true) as
select r.id, r.nummer, r.art, r.status, r.titel, r.datum, r.faellig_am, r.sprache, r.inkl_mwst,
       r.netto_rappen, r.mwst_rappen, r.total_rappen, r.bezahlt_rappen,
       r.total_rappen - r.bezahlt_rappen - r.ausgebucht_rappen as offen_rappen,
       r.bezahlt_am, r.mahnstufe, r.gemahnt_am, r.mahnfrist, r.abaninja_uuid, r.abaninja_status, r.abaninja_abgeglichen_am,
       r.status in ('gestellt', 'teilbezahlt') and r.faellig_am < (now() at time zone 'Europe/Zurich')::date as ueberfaellig,
       r.kontakt_id, intern.kontaktname(k) as kunde, k.kundennummer,
       r.projekt_id, p.nummer as projekt_nummer, r.zahlungsplan_id, r.rapport_id, r.wartungsvertrag_id,
       r.firma_id, f.kuerzel as firma, r.erstellt_am,
       r.rechnung_an, r.kunden_referenz, r.versandweg, r.mahnsperre_bis, r.mahnsperre_grund, r.zusage_bis, r.erinnert_am,
       r.ausgebucht_rappen, r.ausgebucht_art, r.ausgebucht_grund,
       case when r.status in ('gestellt', 'teilbezahlt') then intern.rechnung_versendet(r.id) end as versendet,
       greatest((now() at time zone 'Europe/Zurich')::date - r.faellig_am, 0) as tage_ueberfaellig,
       p.titel as projekt_titel, p.verantwortlich_id as projektleiter_id,
       (select pe.name from public.personen pe where pe.id = p.verantwortlich_id) as projektleiter
  from public.rechnungen r
  join public.kontakte k on k.id = r.kontakt_id
  join public.firmen f on f.id = r.firma_id
  left join public.projekte p on p.id = r.projekt_id
 where r.geloescht_am is null;

-- 10. Einstellungen, Bereiche, Zeitplan, Rechte -----------------------------------------------------------------
update public.einstellungen
   set wert = wert || jsonb_build_object('mahnlauf', jsonb_build_object(
         'erinnerung_tage', 5, 'stufe1_tage', 20, 'abstand_tage', 10, 'min_rappen', 5000,
         'freigabe_person_ids', coalesce((select jsonb_agg(p.id) from public.personen p
                                           where p.kuerzel = 'chris' and p.geloescht_am is null), '[]'::jsonb)))
 where schluessel = 'finanzen' and not (wert ? 'mahnlauf');

-- Projektleitung und Verkauf sehen den Bereich (nur ihren Zahlungsstand und ihre Visa, Chris 2.11.2026).
update public.rollen set bereiche = array_append(bereiche, 'invoices')
 where schluessel in ('projektleitung', 'verkauf') and cardinality(bereiche) > 0 and not ('invoices' = any (bereiche));

select cron.schedule('rechnungen-mahnlauf', '0 6 * * 1', 'select intern.mahnlauf_melden()');

revoke execute on function intern.rechnung_stand_setzen(uuid) from public, anon;
grant execute on function intern.rechnung_stand_setzen(uuid) to authenticated;
revoke execute on function intern.mahnung_freigeber() from public, anon, authenticated;
revoke execute on function intern.buchhaltung_personen() from public, anon, authenticated;
revoke execute on function intern.glocke(uuid[], text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function intern.rechnung_ereignis(uuid, text, text) from public, anon;
grant execute on function intern.rechnung_ereignis(uuid, text, text) to authenticated;
revoke execute on function intern.mahnlauf_liste() from public, anon, authenticated;
revoke execute on function intern.mahnlauf_melden() from public, anon, authenticated;
revoke execute on function intern.tranche_meilenstein(uuid) from public, anon;
grant execute on function intern.tranche_meilenstein(uuid) to authenticated;
revoke execute on function intern.rechnung_versendet(uuid) from public, anon;
grant execute on function intern.rechnung_versendet(uuid) to authenticated;
revoke execute on function public.rechnung_angaben(uuid, jsonb) from public, anon;
revoke execute on function public.rechnung_mahnsperre(uuid, date, text) from public, anon;
revoke execute on function public.rechnung_zusage(uuid, date, text) from public, anon;
revoke execute on function public.rechnung_notiz(uuid, text, text) from public, anon;
revoke execute on function public.rechnung_ausbuchen(uuid, bigint, text, text) from public, anon;
revoke execute on function public.mahnlauf_vorschlag() from public, anon;
revoke execute on function public.mahnung_darf_freigeben() from public, anon;
revoke execute on function public.tranche_verrechnen(uuid) from public, anon;
revoke execute on function public.zahlungsstand_projekte(boolean) from public, anon;
revoke execute on function public.rechnungen_uebersicht() from public, anon;
revoke execute on function public.rechnung_verlauf(uuid) from public, anon;
grant execute on function public.rechnung_angaben(uuid, jsonb) to authenticated;
grant execute on function public.rechnung_mahnsperre(uuid, date, text) to authenticated;
grant execute on function public.rechnung_zusage(uuid, date, text) to authenticated;
grant execute on function public.rechnung_notiz(uuid, text, text) to authenticated;
grant execute on function public.rechnung_ausbuchen(uuid, bigint, text, text) to authenticated;
grant execute on function public.mahnlauf_vorschlag() to authenticated;
grant execute on function public.mahnung_darf_freigeben() to authenticated;
grant execute on function public.tranche_verrechnen(uuid) to authenticated;
grant execute on function public.zahlungsstand_projekte(boolean) to authenticated;
grant execute on function public.rechnungen_uebersicht() to authenticated;
grant execute on function public.rechnung_verlauf(uuid) to authenticated;
