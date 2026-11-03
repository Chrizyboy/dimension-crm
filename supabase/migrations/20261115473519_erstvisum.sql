-- Erstvisum für Rechnungen (Chris 2.11.2026): Die Projektleitung (und wer «visum» hat) prüft die Rechnungen der
-- eigenen Projekte (verantwortlich_id) und gibt das Erstvisum, ohne Liquidität, Marge oder andere Finanzen zu sehen.
-- Danach gibt die Buchhaltung frei. Das Visum sperrt nichts; die Buchhaltung sieht, ob es da ist.
-- Dazu: Marge in den Kennzahlen nur noch mit dem Recht «marge» (GL, Verkauf, Buchhaltung). Die Nachkalkulation
-- läuft dafür als security definer (Verkauf sieht sonst keine Einkaufspreise); sie prüft das Recht selbst.

alter table public.rechnungen
  add column visum_am timestamptz,
  add column visum_von uuid references public.personen (id),
  add column visum_bemerkung text;
comment on column public.rechnungen.visum_am is 'Erstvisum der Projektleitung (rechnung_visieren). Leer = noch nicht visiert.';
comment on column public.rechnungen.visum_bemerkung is 'Korrektur-Hinweis der Projektleitung an die Buchhaltung.';

/** Darf die angemeldete Person diese Rechnung visieren? «finanzen» alle, «visum» die Rechnungen eigener Projekte. */
create or replace function intern.darf_visieren(p_rechnung public.rechnungen)
returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('finanzen')
      or (intern.hat_recht('visum') and exists (
            select 1 from public.projekte pr
             where pr.id = p_rechnung.projekt_id and pr.geloescht_am is null
               and pr.verantwortlich_id = intern.meine_person_id()))
$$;

/**
 * Rechnungsentwürfe zum Visum der eigenen Projekte (verantwortlich, Recht «visum»). Liefert nur, was es zum Prüfen
 * braucht: Kunde, Projekt, Positionen und Beträge, keine Zahlungen, Liquidität oder Marge.
 */
create or replace function public.rechnungen_zum_visum()
returns table (id uuid, nummer text, art text, titel text, datum date, kunde text, projekt_id uuid, projekt_nummer text,
               projekt_titel text, positionen jsonb, netto_rappen bigint, mwst_rappen bigint, total_rappen bigint,
               visum_am timestamptz, visum_name text, visum_bemerkung text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.nummer, r.art, r.titel, r.datum, intern.kontaktname(k), pr.id, pr.nummer, pr.titel, r.positionen,
         r.netto_rappen, r.mwst_rappen, r.total_rappen, r.visum_am, vp.name, r.visum_bemerkung
    from public.rechnungen r
    join public.projekte pr on pr.id = r.projekt_id and pr.geloescht_am is null
    left join public.kontakte k on k.id = r.kontakt_id
    left join public.personen vp on vp.id = r.visum_von
   where r.geloescht_am is null and r.status = 'entwurf' and intern.hat_recht('visum')
     and pr.verantwortlich_id = intern.meine_person_id()
   order by r.visum_am nulls first, r.datum desc nulls last
$$;
revoke execute on function public.rechnungen_zum_visum() from public, anon;
grant execute on function public.rechnungen_zum_visum() to authenticated;

/**
 * Erstvisum geben (ohne Bemerkung) oder eine Korrektur melden (mit Bemerkung, Visum bleibt offen). Nur Entwürfe.
 * Die Buchhaltung bekommt eine Glocke.
 */
create or replace function public.rechnung_visieren(p_id uuid, p_bemerkung text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.rechnungen;
  v_bem text := nullif(trim(p_bemerkung), '');
  v_ich uuid := intern.meine_person_id();
  b uuid;
begin
  select * into r from public.rechnungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'rechnung.nicht_gefunden'; end if;
  if not intern.darf_visieren(r) then raise exception using errcode = '42501', message = 'rechnung.visum_kein_recht'; end if;
  if r.status <> 'entwurf' then raise exception using errcode = 'P0001', message = 'rechnung.visum_nur_entwurf'; end if;

  update public.rechnungen
     set visum_am = case when v_bem is null then now() end,
         visum_von = v_ich,
         visum_bemerkung = v_bem
   where id = p_id;

  for b in select p.id from public.personen p
            where p.aktiv and p.geloescht_am is null and p.id <> v_ich
              and 'finanzen' = any (intern.wirksame_rechte(p.id)) and not 'gl' = any (intern.wirksame_rechte(p.id)) loop
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (b, case when v_bem is null then 'info' else 'warnung' end,
            case when v_bem is null then 'Erstvisum erteilt' else 'Korrektur zur Rechnung' end,
            case when v_bem is null then 'Premier visa donné' else 'Correction pour la facture' end,
            coalesce(r.nummer, r.titel, '') || coalesce(': ' || v_bem, ''),
            coalesce(r.nummer, r.titel, '') || coalesce(': ' || v_bem, ''),
            '/invoices?rechnung=' || r.id);
  end loop;
end
$$;
revoke execute on function public.rechnung_visieren(uuid, text) from public, anon;
grant execute on function public.rechnung_visieren(uuid, text) to authenticated;

-- Marge nur mit «marge».
CREATE OR REPLACE FUNCTION public.kennzahlen_betrieb(p_von date, p_bis date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
  montag date := heute - (extract(isodow from heute)::int - 1);
  cfg jsonb := (select wert from public.einstellungen where schluessel = 'kennzahlen');
  r jsonb;
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'kennzahlen.kein_recht';
  end if;

  r := jsonb_build_object('auftragsbestand', coalesce((
    select jsonb_agg(x order by x ->> 'unterzeichnet_am' nulls last) from (
      select jsonb_build_object('id', p.id, 'nummer', p.nummer, 'name', coalesce(intern.kontaktname(k), p.titel),
                                'standort', s.kuerzel, 'status', p.status, 'person_id', p.verantwortlich_id,
                                'unterzeichnet_am', p.unterzeichnet_am, 'baubeginn', p.baubeginn,
                                'vertrag_rappen', coalesce(p.vertragswert_rappen, 0),
                                'verrechnet_rappen', coalesce(z.verrechnet, 0),
                                'bezahlt_rappen', coalesce(z.bezahlt, 0),
                                'rest_rappen', greatest(coalesce(p.vertragswert_rappen, 0) - coalesce(z.verrechnet, 0), 0)) as x
        from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
        left join public.standorte s on s.id = p.standort_id
        left join lateral (select sum(betrag_rappen) filter (where rechnung_am is not null or bezahlt_am is not null) as verrechnet,
                                  sum(betrag_rappen) filter (where bezahlt_am is not null) as bezahlt
                             from public.zahlungsplan where projekt_id = p.id and geloescht_am is null) z on true
       where p.geloescht_am is null and p.status in ('auftrag', 'im_bau')) t), '[]'));

  r := r || jsonb_build_object('auslastung', (
    with wochen as (
      select w::date as von, (w + interval '4 days')::date as bis from generate_series(montag, montag + 7 * 7, interval '7 days') w),
    leute as (
      select p.id, p.name, p.kuerzel from public.personen p
       where p.aktiv and p.geloescht_am is null
         and (p.rolle in (select jsonb_array_elements_text(coalesce(cfg -> 'auslastung_rollen', '["montage"]')))
              or exists (select 1 from public.einsaetze e where e.geloescht_am is null and p.id = any (e.personen)
                          and e.von <= montag + 53 and coalesce(e.bis, e.von) >= montag))),
    zellen as (
      select w.von as woche, l.id as person,
             coalesce((select sum(intern.werktage(greatest(e.von, w.von), least(coalesce(e.bis, e.von), w.bis)))
                         from public.einsaetze e
                        where e.geloescht_am is null and l.id = any (e.personen)
                          and e.von <= w.bis and coalesce(e.bis, e.von) >= w.von), 0) as gebucht,
             coalesce((select sum(intern.werktage(greatest(a.von, w.von), least(a.bis, w.bis))
                                  * case when a.halbtag then 0.5 else 1 end)
                         from public.abwesenheiten_alle a
                        where a.person_id = l.id and a.von <= w.bis and a.bis >= w.von), 0) as abwesend
        from wochen w cross join leute l)
    select jsonb_build_object(
      'personen', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'kuerzel', l.kuerzel) order by l.name)
                              from leute l), '[]'),
      'wochen', coalesce((select jsonb_agg(jsonb_build_object(
                  'von', w.von, 'bis', w.bis, 'kw', extract(week from w.von)::int,
                  'zellen', coalesce((select jsonb_agg(jsonb_build_object('person', z.person, 'gebucht', z.gebucht,
                                                                          'abwesend', z.abwesend,
                                                                          'verfuegbar', greatest(5 - z.abwesend, 0)))
                                        from zellen z where z.woche = w.von), '[]'),
                  'ohne_personen', coalesce((select sum(intern.werktage(greatest(e.von, w.von), least(coalesce(e.bis, e.von), w.bis)))
                                               from public.einsaetze e
                                              where e.geloescht_am is null and cardinality(coalesce(e.personen, '{}')) = 0
                                                and e.von <= w.bis and coalesce(e.bis, e.von) >= w.von), 0))
                  order by w.von) from wochen w), '[]'))));

  if intern.hat_recht('marge') then
    r := r || jsonb_build_object('marge', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nummer', p.nummer, 'name', coalesce(intern.kontaktname(k), p.titel),
                                          'standort', s.kuerzel, 'status', p.status, 'unterzeichnet_am', p.unterzeichnet_am,
                                          'nachkalkulation', public.nachkalkulation(p.id))
                       order by p.unterzeichnet_am desc)
        from public.projekte p left join public.kontakte k on k.id = p.kontakt_id
        left join public.standorte s on s.id = p.standort_id
       where p.geloescht_am is null and p.unterzeichnet_am between p_von and p_bis), '[]'));
  end if;
  return r;
end
$function$;

-- Nachkalkulation auch mit «marge» (Kennzahlen); liest Einkauf und Kalkulation unabhängig von RLS.
create or replace function public.nachkalkulation(p_projekt uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  pr public.projekte;
  v_satz numeric := public.mwst_satz();
  v_kal public.kalkulationen;
  v_lief bigint; v_best bigint; v_mat bigint; v_material bigint; v_quelle text;
  v_stunden numeric; v_arbeit bigint; v_spesen bigint;
  v_nachtraege bigint; v_erloes bigint; v_vertrag bigint;
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen') or intern.hat_recht('marge')) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  select * into pr from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  select * into v_kal from public.kalkulationen where offerte_id = pr.offerte_id and geloescht_am is null
   order by geaendert_am desc nulls last limit 1;

  select sum(round(betrag_rappen / (1 + v_satz / 100))) into v_lief from public.kreditor_zahlungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(total_rappen) into v_best from public.bestellungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(round(coalesce(nullif(x ->> 'ek', '')::numeric, 0) * 100
                   / case when (x ->> 'exkl')::boolean then 1 else 1 + v_satz / 100 end))
    into v_mat from public.material_zahlungen m, jsonb_array_elements(m.positionen) x
   where m.projekt_id = p_projekt and m.geloescht_am is null;
  v_material := coalesce(v_lief, v_best, v_mat, 0);
  v_quelle := case when v_lief is not null then 'lieferantenrechnungen' when v_best is not null then 'bestellungen'
                   when v_mat is not null then 'material_zahlungen' else 'keine' end;

  select coalesce(sum(extract(epoch from (stopp - start)) / 3600 - coalesce(pause_min, 0) / 60.0), 0) into v_stunden
    from public.zeiten where projekt_id = p_projekt and stopp is not null and geloescht_am is null;
  v_arbeit := round(v_stunden * coalesce((intern.fin_cfg() ->> 'intern_stundensatz_rappen')::bigint, 6500));

  -- Seit dem Rollen-Schritt läuft sie als definer: wer die Nachkalkulation sehen darf, sieht alle Spesen des Projekts.
  select coalesce(sum(betrag_rappen - coalesce(mwst_rappen, 0)), 0) into v_spesen from public.spesen
   where projekt_id = p_projekt and geloescht_am is null and status in ('geprueft', 'ausbezahlt');

  select coalesce(sum(betrag_rappen), 0) into v_nachtraege from public.nachtraege
   where projekt_id = p_projekt and geloescht_am is null and status in ('vom_kunden_bestaetigt', 'verrechnet');
  select coalesce(sum(netto_rappen), 0) into v_erloes from public.rechnungen
   where projekt_id = p_projekt and geloescht_am is null and status not in ('entwurf', 'storniert');
  v_vertrag := round(coalesce(pr.vertragswert_rappen, 0) / (1 + v_satz / 100));

  return jsonb_build_object(
    'projekt_id', pr.id, 'nummer', pr.nummer,
    'soll', jsonb_build_object('verkauf_rappen', coalesce(v_kal.verkauf_rappen, v_vertrag), 'einkauf_rappen', v_kal.einkauf_rappen,
                               'werktage', pr.werktage, 'stunden', pr.werktage * 8 * 2),
    'ist', jsonb_build_object('vertrag_rappen', v_vertrag, 'nachtraege_rappen', v_nachtraege,
                              'umsatz_rappen', v_vertrag + v_nachtraege, 'verrechnet_rappen', v_erloes,
                              'material_rappen', v_material, 'material_quelle', v_quelle,
                              'stunden', round(v_stunden, 2), 'arbeit_rappen', v_arbeit, 'spesen_rappen', v_spesen,
                              'marge_rappen', v_vertrag + v_nachtraege - v_material - v_arbeit - v_spesen));
end
$$;
