-- Ausschreibungen vollständig, Teil 2: Abläufe der Submission (Entscheid 0039). Go/No-Go-Vorschlag, Eckdaten,
-- Checkliste, Prüfung durch eine zweite Person, Öffnungsprotokoll, Zuschlag mit Projekt, Nachweise melden,
-- Mitbewerber und Auswertung. Alles in der Datenbank, die App ruft nur diese Funktionen.

/** Personen, die Nachweise erneuern: Kürzel aus «nachweise_zustaendig», sonst alle mit Recht «finanzen». */
create or replace function intern.as_nachweis_personen() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select case when cardinality(intern.as_personen('nachweise_zustaendig')) > 0 then intern.as_personen('nachweise_zustaendig')
    else coalesce((select array_agg(p.id) from public.personen p
                     left join public.rollen r on r.schluessel = p.rolle and r.aktiv and r.geloescht_am is null
                    where p.aktiv and p.geloescht_am is null
                      and 'finanzen' = any (p.rechte || coalesce(r.rechte, '{}'))), '{}') end
$$;

/** Fehlende oder bis zum Datum abgelaufene Nachweise einer Firma (Arten aus der Einstellung). */
create or replace function intern.as_nachweise_fehlen(p_firma uuid, p_bis date) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(n ->> 'art'), '{}')
    from jsonb_array_elements(coalesce(intern.as_cfg() -> 'nachweise', '[]')) n
   where not exists (select 1 from public.firmen_nachweise f
                      where f.firma_id = p_firma and f.art = n ->> 'art' and f.geloescht_am is null
                        and f.gueltig_bis >= coalesce(p_bis, current_date))
$$;

/** Firma eines Dossiers (über den Standort, sonst Muri). */
create or replace function intern.as_firma(a public.ausschreibungen) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.firma_id from public.standorte s where s.id = a.standort_id),
                  (select s.firma_id from public.standorte s where s.kuerzel = 'muri'),
                  (select id from public.firmen order by erstellt_am limit 1))
$$;

/**
 * Go/No-Go-Vorschlag (0–100): passt das Thema, Grösse, Distanz, Eignung (Referenzen), bisherige Gewinnquote im
 * Kanton, Nachweise bis zur Eingabe. Nur ein Vorschlag mit Begründung je Teil; entscheiden tut ein Mensch.
 */
create or replace function public.ausschreibung_gng(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a public.ausschreibungen;
  c jsonb := intern.as_cfg() -> 'gng';
  teile jsonb := '[]';
  p int;
  summe int := 0;
  n int;
  g int;
  e int;
  fehlen text[];
  ref_kwp numeric;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  select * into a from public.ausschreibungen where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;

  p := least(20, greatest(0, a.punkte * 2));
  teile := teile || jsonb_build_object('teil', 'thema', 'punkte', p, 'max', 20, 'wert', a.begruendung);
  summe := summe + p;

  p := case when a.leistung_kwp is null then 8 when a.leistung_kwp >= 100 then 15 when a.leistung_kwp >= 30 then 10 else 3 end;
  teile := teile || jsonb_build_object('teil', 'groesse', 'punkte', p, 'max', 15, 'wert', a.leistung_kwp);
  summe := summe + p;

  p := case when a.fahrzeit_min is null then 8 when a.fahrzeit_min <= 20 then 15 when a.fahrzeit_min <= 40 then 10
            when a.fahrzeit_min <= 60 then 5 else 0 end;
  teile := teile || jsonb_build_object('teil', 'distanz', 'punkte', p, 'max', 15, 'wert', a.fahrzeit_min);
  summe := summe + p;

  ref_kwp := coalesce(a.eignung_ref_kwp, a.leistung_kwp * 0.5, 0);
  select count(*) into n from public.submission_referenzen
   where freigegeben and geloescht_am is null and coalesce(leistung_kwp, 0) >= ref_kwp
     and coalesce(jahr, 0) >= extract(year from current_date)::int - 5;
  p := case when n >= coalesce((c ->> 'referenzen')::int, 3) then 20 when n > 0 then 10 else 0 end;
  teile := teile || jsonb_build_object('teil', 'eignung', 'punkte', p, 'max', 20, 'wert', n, 'kwp', ref_kwp);
  summe := summe + p;

  select count(*) filter (where status = 'zuschlag'), count(*) into g, e from public.ausschreibungen
   where geloescht_am is null and status in ('zuschlag', 'absage') and id <> a.id
     and kanton is not distinct from a.kanton
     and coalesce(entscheid_datum, eingereicht_am, erstellt_am::date)
         >= current_date - make_interval(months => coalesce((c ->> 'monate_quote')::int, 24));
  p := case when e = 0 then 8 else round(15 * least(1, (g::numeric / e) / 0.4))::int end;
  teile := teile || jsonb_build_object('teil', 'quote', 'punkte', p, 'max', 15, 'gewonnen', g, 'entschieden', e);
  summe := summe + p;

  fehlen := intern.as_nachweise_fehlen(intern.as_firma(a), coalesce(a.frist_eingabe::date, a.frist));
  p := greatest(0, 15 - 5 * cardinality(fehlen));
  teile := teile || jsonb_build_object('teil', 'nachweise', 'punkte', p, 'max', 15, 'fehlen', to_jsonb(fehlen));
  summe := summe + p;

  return jsonb_build_object('punkte', summe, 'teile', teile,
    'empfehlung', case when summe >= coalesce((c ->> 'go')::int, 65) then 'go'
                       when summe >= coalesce((c ->> 'pruefen')::int, 45) then 'pruefen' else 'nogo' end);
end
$$;

/** Eckdaten einer Submission speichern (nur genannte Felder). Fristen gehen neu in den Kalender. */
create or replace function public.submission_speichern(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausschreibungen;
  summe numeric;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  if p ? 'kriterien' then
    if jsonb_typeof(p -> 'kriterien') <> 'array' then raise exception using errcode = 'P0001', message = 'ausschreibung.kriterien'; end if;
    select coalesce(sum((k ->> 'gewicht')::numeric), 0) into summe from jsonb_array_elements(p -> 'kriterien') k;
    if jsonb_array_length(p -> 'kriterien') > 0 and summe <> 100 then
      raise exception using errcode = 'P0001', message = 'ausschreibung.kriterien_summe';
    end if;
  end if;
  update public.ausschreibungen set
    verantwortlich_id = case when p ? 'verantwortlich_id' then nullif(p ->> 'verantwortlich_id', '')::uuid else verantwortlich_id end,
    verfahren = case when p ? 'verfahren' then nullif(p ->> 'verfahren', '') else verfahren end,
    auftragsart = case when p ? 'auftragsart' then nullif(p ->> 'auftragsart', '') else auftragsart end,
    leistung_kwp = case when p ? 'leistung_kwp' then nullif(p ->> 'leistung_kwp', '')::numeric else leistung_kwp end,
    schaetzung_rappen = case when p ? 'schaetzung_rappen' then nullif(p ->> 'schaetzung_rappen', '')::bigint else schaetzung_rappen end,
    ausfuehrung_von = case when p ? 'ausfuehrung_von' then nullif(p ->> 'ausfuehrung_von', '')::date else ausfuehrung_von end,
    ausfuehrung_bis = case when p ? 'ausfuehrung_bis' then nullif(p ->> 'ausfuehrung_bis', '')::date else ausfuehrung_bis end,
    kriterien = case when p ? 'kriterien' then p -> 'kriterien' else kriterien end,
    varianten = case when p ? 'varianten' then (p ->> 'varianten')::boolean else varianten end,
    arge = case when p ? 'arge' then (p ->> 'arge')::boolean else arge end,
    eignung_ref_kwp = case when p ? 'eignung_ref_kwp' then nullif(p ->> 'eignung_ref_kwp', '')::numeric else eignung_ref_kwp end,
    frist_fragen = case when p ? 'frist_fragen' then nullif(p ->> 'frist_fragen', '')::date else frist_fragen end,
    frist_begehung = case when p ? 'frist_begehung' then nullif(p ->> 'frist_begehung', '')::timestamptz else frist_begehung end,
    frist_eingabe = case when p ? 'frist_eingabe' then nullif(p ->> 'frist_eingabe', '')::timestamptz else frist_eingabe end,
    frist = case when p ? 'frist_eingabe' then coalesce(nullif(p ->> 'frist_eingabe', '')::timestamptz::date, frist) else frist end,
    frist_oeffnung = case when p ? 'frist_oeffnung' then nullif(p ->> 'frist_oeffnung', '')::timestamptz else frist_oeffnung end,
    zuschlag_erwartet = case when p ? 'zuschlag_erwartet' then nullif(p ->> 'zuschlag_erwartet', '')::date else zuschlag_erwartet end,
    bindefrist_monate = case when p ? 'bindefrist_monate' then nullif(p ->> 'bindefrist_monate', '')::int else bindefrist_monate end,
    eingabe_adresse = case when p ? 'eingabe_adresse' then nullif(trim(p ->> 'eingabe_adresse'), '') else eingabe_adresse end,
    vergabestelle = case when p ? 'vergabestelle' then nullif(trim(p ->> 'vergabestelle'), '') else vergabestelle end,
    angebot_rappen = case when p ? 'angebot_rappen' then nullif(p ->> 'angebot_rappen', '')::bigint else angebot_rappen end,
    debriefing_am = case when p ? 'debriefing_am' then nullif(p ->> 'debriefing_am', '')::date else debriefing_am end
  where id = p_id and geloescht_am is null
  returning * into a;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;
  if (p ? 'frist_fragen' or p ? 'frist_begehung' or p ? 'frist_eingabe') and a.status in ('teilnahme', 'kalkulation') then
    perform intern.as_fristen(a);
  end if;
  perform intern.as_vermerk(p_id, 'Eckdaten geändert: ' || (select string_agg(k, ', ') from jsonb_object_keys(p) k));
end
$$;

/** Punkt der Eingabe-Checkliste abhaken oder zurücknehmen. Automatische Punkte setzt das CRM selbst. */
create or replace function public.submission_checkliste(p_id uuid, p_schluessel text, p_erledigt boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
  punkt jsonb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  select x into punkt from jsonb_array_elements(coalesce(intern.as_cfg() -> 'checkliste', '[]')) x where x ->> 'schluessel' = p_schluessel;
  if punkt is null or punkt ? 'auto' then raise exception using errcode = 'P0001', message = 'ausschreibung.punkt_auto'; end if;
  update public.ausschreibungen
     set checkliste = case when p_erledigt
           then checkliste || jsonb_build_object(p_schluessel, jsonb_build_object('am', now(), 'von', intern.meine_person_id()))
           else checkliste - p_schluessel end
   where id = p_id and geloescht_am is null returning checkliste into v;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;
  return v;
end
$$;

/**
 * Prüfung durch eine zweite Person (Vier-Augen) vor der Eingabe: wer prüft, darf nicht verantwortlich sein.
 * Wer prüfen darf: Einstellung «pruefen» (Chris), Vertretung «pruefen_vertretung», sonst Administration.
 */
create or replace function public.submission_pruefen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausschreibungen;
begin
  if not intern.as_darf('pruefen') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  select * into a from public.ausschreibungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;
  if a.status not in ('teilnahme', 'kalkulation') then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_teilnehmen'; end if;
  if a.verantwortlich_id = intern.meine_person_id() then
    raise exception using errcode = 'P0001', message = 'ausschreibung.pruefung_selbst';
  end if;
  update public.ausschreibungen set pruefung_von = intern.meine_person_id(), pruefung_am = now() where id = p_id;
  perform intern.as_vermerk(p_id, 'Eingabe geprüft (Vier-Augen)');
end
$$;

/**
 * Öffnungsprotokoll speichern: ersetzt alle Zeilen (alte in den Papierkorb), rechnet Rang nach Preis, setzt Rang
 * und Anzahl Anbieter im Dossier. p_zeilen: [{anbieter, ort, betrag_rappen, wir, bemerkung}].
 */
create or replace function public.submission_protokoll(p_id uuid, p_zeilen jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  if not exists (select 1 from public.ausschreibungen where id = p_id and geloescht_am is null and spur = 'angebot') then
    raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt';
  end if;
  if (select count(*) from jsonb_array_elements(p_zeilen) z where coalesce((z ->> 'wir')::boolean, false)) > 1 then
    raise exception using errcode = 'P0001', message = 'ausschreibung.protokoll_wir';
  end if;
  update public.ausschreibung_angebote set geloescht_am = now() where ausschreibung_id = p_id and geloescht_am is null;
  insert into public.ausschreibung_angebote (ausschreibung_id, anbieter, ort, betrag_rappen, rang, wir, bemerkung)
  select p_id, trim(z ->> 'anbieter'), nullif(trim(z ->> 'ort'), ''), (z ->> 'betrag_rappen')::bigint,
         rank() over (order by (z ->> 'betrag_rappen')::bigint), coalesce((z ->> 'wir')::boolean, false),
         nullif(trim(z ->> 'bemerkung'), '')
    from jsonb_array_elements(p_zeilen) z
   where nullif(trim(z ->> 'anbieter'), '') is not null and (z ->> 'betrag_rappen')::bigint > 0;
  get diagnostics n = row_count;
  update public.ausschreibungen a set anbieter_anzahl = n,
         rang = (select rang from public.ausschreibung_angebote x where x.ausschreibung_id = p_id and x.wir and x.geloescht_am is null),
         angebot_rappen = coalesce((select betrag_rappen from public.ausschreibung_angebote x
                                     where x.ausschreibung_id = p_id and x.wir and x.geloescht_am is null), a.angebot_rappen)
   where a.id = p_id;
  perform intern.as_vermerk(p_id, 'Öffnungsprotokoll: ' || n || ' Angebote');
  return n;
end
$$;

/** Status nach «Wieder öffnen» kennt jetzt auch eingereichte Submissionen. */
create or replace function intern.as_grundstatus(a public.ausschreibungen) returns text
language sql stable set search_path = '' as $$
  select case a.spur
    when 'angebot' then case when a.eingereicht_am is not null then 'eingereicht'
                             when a.offerte_id is not null then 'kalkulation' else 'pruefen' end
    when 'beobachten' then 'beobachten'
    else coalesce((select case s.status when 'entwurf' then 'entwurf' when 'bewilligt' then 'bewilligt' else 'versendet' end
                     from public.anschreiben s where s.ausschreibung_id = a.id and s.status <> 'abgelehnt' and s.geloescht_am is null
                    order by s.erstellt_am desc limit 1), 'kontakt_fehlt') end
$$;

/**
 * Entscheid zu einem Dossier (erweitert, Entscheid 0039). Neu: «teilnehmen» speichert den Go/No-Go-Vorschlag,
 * «nicht_teilnehmen» braucht einen No-Go-Grund (p_angaben.nogo), «eingereicht» braucht den Betrag und ab
 * «pruefen_ab_rappen» die Prüfung durch eine zweite Person, «zuschlag»/«absage» brauchen das Öffnungsprotokoll
 * (oder p_angaben.ohne_protokoll mit Grund). Zuschlag legt das Projekt an, Absage setzt die Beschwerdefrist.
 */
create or replace function public.ausschreibung_entscheiden(p_id uuid, p_entscheid text, p_angaben jsonb default '{}')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.as_cfg();
  a public.ausschreibungen;
  v_grund text := nullif(trim(coalesce(p_angaben ->> 'grund', '')), '');
  d date := nullif(p_angaben ->> 'datum', '')::date;
  v_betrag bigint := nullif(p_angaben ->> 'betrag_rappen', '')::bigint;
  v_kontakt uuid;
  v_offerte uuid;
  v_projekt uuid;
  v_status text;
  v_nogo text := nullif(p_angaben ->> 'nogo', '');
  v_ohne text := nullif(trim(coalesce(p_angaben ->> 'ohne_protokoll', '')), '');
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  if p_entscheid in ('teilnehmen', 'nicht_teilnehmen', 'eingereicht', 'verwerfen') and not intern.as_darf('bewilligen') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  select * into a from public.ausschreibungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;

  case p_entscheid
    when 'teilnehmen' then
      if a.spur <> 'angebot' then raise exception using errcode = 'P0001', message = 'ausschreibung.falsche_spur'; end if;
      v_kontakt := a.vergabestelle_kontakt_id;
      if v_kontakt is null then
        v_kontakt := intern.as_kontakt_finden(null, a.vergabestelle);
        if v_kontakt is null then
          insert into public.kontakte (art, kontaktart, firma, sprache, notiz)
          values ('firma', 'firma', coalesce(a.vergabestelle, 'Vergabestelle ' || a.nummer), a.sprache,
                  'Vergabestelle aus ' || a.nummer || '. Fragen nur über das simap-Forum.')
          returning id into v_kontakt;
        end if;
      end if;
      v_offerte := coalesce(a.offerte_id, public.offerte_anlegen(jsonb_build_object(
        'kontakt_id', v_kontakt, 'standort_id', a.standort_id, 'titel', 'Submission: ' || left(a.titel, 200))));
      update public.offerten set art = 'submission',
             leistung_kwp = coalesce(leistung_kwp, a.leistung_kwp)
       where id = v_offerte;
      update public.ausschreibungen set status = 'teilnahme', entscheid_von = intern.meine_person_id(), entscheid_am = now(),
             vergabestelle_kontakt_id = v_kontakt, offerte_id = v_offerte,
             gng_entscheid = 'go', gng_grund = v_grund, gng_von = intern.meine_person_id(), gng_am = now(),
             gng_vorschlag = public.ausschreibung_gng(p_id),
             verantwortlich_id = coalesce(verantwortlich_id, intern.meine_person_id())
       where id = p_id returning * into a;
      perform intern.as_fristen(a);
      v_status := 'teilnahme';
    when 'nicht_teilnehmen', 'verwerfen' then
      if p_entscheid = 'nicht_teilnehmen' then
        if v_nogo is null or not (coalesce(c -> 'nogo_gruende', '[]') ? v_nogo) then
          raise exception using errcode = 'P0001', message = 'ausschreibung.nogo_fehlt';
        end if;
        update public.ausschreibungen set gng_entscheid = 'nogo', gng_grund = v_nogo, gng_von = intern.meine_person_id(),
               gng_am = now(), gng_vorschlag = public.ausschreibung_gng(p_id)
         where id = p_id;
        v_grund := coalesce(v_grund, v_nogo);
      end if;
      update public.ausschreibungen set status = case when p_entscheid = 'verwerfen' then 'verworfen' else 'nicht_teilnehmen' end,
             grund = intern.pflicht(v_grund, 'ausschreibung.grund_fehlt'), entscheid_von = intern.meine_person_id(), entscheid_am = now()
       where id = p_id returning status into v_status;
      update public.anschreiben set status = 'abgelehnt', abgelehnt_grund = v_grund
       where ausschreibung_id = p_id and status in ('entwurf', 'bewilligt');
      if a.offerte_id is not null then
        update public.offerten set status = 'verloren', entscheid = 'verloren', entscheid_am = current_date,
               verlustgrund = 'Nicht eingereicht: ' || v_grund
         where id = a.offerte_id and status not in ('angenommen', 'verloren');
      end if;
    when 'spaeter' then
      if d is null or d <= current_date then raise exception using errcode = 'P0001', message = 'ausschreibung.datum_fehlt'; end if;
      update public.ausschreibungen set status = 'spaeter', wiedervorlage_am = d, grund = v_grund where id = p_id;
      v_status := 'spaeter';
    when 'kalkulation' then
      if a.status not in ('teilnahme', 'kalkulation') then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_teilnehmen'; end if;
      update public.ausschreibungen set status = 'kalkulation' where id = p_id;
      v_status := 'kalkulation';
    when 'eingereicht' then
      if a.offerte_id is null then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_teilnehmen'; end if;
      v_betrag := coalesce(v_betrag, a.angebot_rappen);
      if v_betrag is null or v_betrag <= 0 then raise exception using errcode = 'P0001', message = 'ausschreibung.betrag_fehlt'; end if;
      if v_betrag >= coalesce((c ->> 'pruefen_ab_rappen')::bigint, 10000000) and a.pruefung_am is null then
        raise exception using errcode = 'P0001', message = 'ausschreibung.pruefung_fehlt';
      end if;
      update public.ausschreibungen set status = 'eingereicht', eingereicht_am = coalesce(d, current_date), angebot_rappen = v_betrag,
             eingereicht_form = intern.pflicht(nullif(p_angaben ->> 'form', ''), 'ausschreibung.form_fehlt'),
             checkliste = checkliste || jsonb_build_object('versand', jsonb_build_object('am', now(), 'von', intern.meine_person_id()))
       where id = p_id;
      update public.offerten set status = 'offeriert', angebot_am = coalesce(d, current_date),
             betrag_rappen = coalesce(betrag_rappen, v_betrag)
       where id = a.offerte_id;
      v_status := 'eingereicht';
    when 'zuschlag', 'absage' then
      if a.status <> 'eingereicht' then raise exception using errcode = 'P0001', message = 'ausschreibung.erst_eingeben'; end if;
      if v_ohne is null and not exists (select 1 from public.ausschreibung_angebote
                                          where ausschreibung_id = p_id and wir and geloescht_am is null) then
        raise exception using errcode = 'P0001', message = 'ausschreibung.protokoll_fehlt';
      end if;
      update public.ausschreibungen set status = p_entscheid, entscheid_datum = coalesce(d, current_date), ohne_protokoll = v_ohne,
             zuschlag_rappen = case when p_entscheid = 'zuschlag' then coalesce(v_betrag, angebot_rappen)
                                    else coalesce(v_betrag, (select min(betrag_rappen) from public.ausschreibung_angebote x
                                                               where x.ausschreibung_id = p_id and x.geloescht_am is null and not x.wir)) end,
             gewinner = case when p_entscheid = 'zuschlag' then null
                             else coalesce(nullif(trim(p_angaben ->> 'gewinner'), ''),
                                           (select anbieter from public.ausschreibung_angebote x
                                             where x.ausschreibung_id = p_id and x.geloescht_am is null and not x.wir
                                             order by rang limit 1)) end,
             beschwerde_bis = case when p_entscheid = 'absage'
                                   then coalesce(d, current_date) + coalesce((c ->> 'beschwerde_tage')::int, 20) end
       where id = p_id returning * into a;
      if p_entscheid = 'zuschlag' then
        update public.offerten set betrag_rappen = coalesce(a.zuschlag_rappen, betrag_rappen) where id = a.offerte_id;
        -- Projekt wie bei jedem Auftrag (Vergabestelle ist schon Kunde der Offerte); kein Werkvertrag, es gilt der Vertrag der Vergabestelle.
        v_projekt := public.auftrag_erstellen(a.offerte_id, jsonb_build_object(
          'vertragswert_rappen', round(coalesce(a.zuschlag_rappen, a.angebot_rappen) * (1 + public.mwst_satz() / 100))::bigint,
          'unterzeichnet_am', a.entscheid_datum, 'werkvertrag', false));
        update public.projekte set verantwortlich_id = coalesce(verantwortlich_id, a.verantwortlich_id) where id = v_projekt;
        update public.ausschreibungen set projekt_id = v_projekt where id = p_id;
        update public.kontaktsperren set aufgehoben_am = now() where ausschreibung_id = p_id and aufgehoben_am is null;
      else
        update public.offerten set status = 'verloren', entscheid = 'verloren', entscheid_am = a.entscheid_datum,
               verlustgrund = coalesce(v_grund, 'Zuschlag an ' || coalesce(a.gewinner, 'andere Firma'))
         where id = a.offerte_id;
        update public.kontaktsperren set aufgehoben_am = now() where ausschreibung_id = p_id and aufgehoben_am is null;
      end if;
      v_status := p_entscheid;
    when 'beobachten' then
      update public.ausschreibungen set spur = 'beobachten', status = 'beobachten', beobachten_seit = current_date,
             ausloeser = coalesce(nullif(p_angaben ->> 'ausloeser', ''), 'datum'), ausloeser_am = d
       where id = p_id;
      if coalesce(nullif(p_angaben ->> 'ausloeser', ''), 'datum') = 'datum' and d is null then
        raise exception using errcode = 'P0001', message = 'ausschreibung.datum_fehlt';
      end if;
      v_status := 'beobachten';
    when 'akquise' then
      update public.ausschreibungen set spur = 'akquise', status = 'kontakt_fehlt', ausloeser = null where id = p_id;
      perform intern.akquise_vorbereiten(p_id);
      select status into v_status from public.ausschreibungen where id = p_id;
    when 'angebot' then
      update public.ausschreibungen set spur = 'angebot', status = 'pruefen', ausloeser = null where id = p_id;
      v_status := 'pruefen';
    when 'wieder_oeffnen' then
      v_status := intern.as_grundstatus(a);
      update public.ausschreibungen set status = v_status, grund = null, wiedervorlage_am = null,
             gng_entscheid = case when v_status = 'pruefen' then null else gng_entscheid end
       where id = p_id;
    else
      raise exception using errcode = 'P0001', message = 'ausschreibung.unbekannt';
  end case;
  perform intern.as_vermerk(p_id, concat_ws(' · ', 'Entscheid: ' || p_entscheid, v_grund, d::text, p_angaben ->> 'form',
    case when v_betrag is not null then 'CHF ' || to_char(v_betrag / 100.0, 'FM999G999G990D00') end),
    jsonb_build_object('entscheid', p_entscheid, 'projekt_id', v_projekt));
  return v_status;
end
$$;

/**
 * Nachweise, die in «nachweise_vorlauf_tage» ablaufen oder fehlen: einmal je Art eine Aufgabe für die Zuständigen
 * (Buchhaltung). Läuft täglich mit dem Monitor (Zeitplan). Gibt die Anzahl neuer Aufgaben zurück.
 */
create or replace function public.nachweise_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.as_cfg();
  f record;
  n record;
  p uuid;
  bis date;
  v uuid;
  neu int := 0;
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  for f in select id, name from public.firmen where geloescht_am is null loop
    for n in select x ->> 'art' art, x ->> 'de' de from jsonb_array_elements(coalesce(c -> 'nachweise', '[]')) x loop
      select max(gueltig_bis) into bis from public.firmen_nachweise
       where firma_id = f.id and art = n.art and geloescht_am is null;
      continue when bis is not null and bis > current_date + coalesce((c ->> 'nachweise_vorlauf_tage')::int, 30);
      foreach p in array intern.as_nachweis_personen() loop
        select id into v from public.aufgaben where person_id = p and bezug_id = f.id
           and titel = 'Nachweis erneuern: ' || n.de || ' (' || f.name || ')' and erledigt_am is null and geloescht_am is null;
        if v is null then
          perform intern.aufgabe_einmal(p, 'Nachweis erneuern: ' || n.de || ' (' || f.name || ')',
            coalesce(least(bis, current_date + 7), current_date), 'firmen', f.id,
            case when bis is null then 'Fehlt noch. Für Ausschreibungen nötig.' else 'Gültig bis ' || to_char(bis, 'DD.MM.YYYY') end);
          neu := neu + 1;
        end if;
        v := null;
      end loop;
    end loop;
  end loop;
  return neu;
end
$$;

/** Nachweis ablegen: Gültigkeit aus der Einstellung (Monate je Art), wenn nicht angegeben. Erledigt die Aufgabe. */
create or replace function public.firmen_nachweis_speichern(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
  art text := intern.pflicht(nullif(p ->> 'art', ''), 'ausschreibung.art_fehlt');
  aus date := coalesce(nullif(p ->> 'ausgestellt_am', '')::date, current_date);
  monate int;
  f public.firmen;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausschreibung.kein_recht'; end if;
  select * into f from public.firmen where id = (p ->> 'firma_id')::uuid and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'ausschreibung.unbekannt'; end if;
  select (x ->> 'monate')::int into monate from jsonb_array_elements(coalesce(intern.as_cfg() -> 'nachweise', '[]')) x
   where x ->> 'art' = art;
  if monate is null then raise exception using errcode = 'P0001', message = 'ausschreibung.art_fehlt'; end if;
  insert into public.firmen_nachweise (firma_id, art, ausgestellt_am, gueltig_bis, datei_pfad, notiz)
  values (f.id, art, aus, coalesce(nullif(p ->> 'gueltig_bis', '')::date, (aus + make_interval(months => monate))::date),
          nullif(p ->> 'datei_pfad', ''), nullif(trim(p ->> 'notiz'), ''))
  returning id into v;
  update public.aufgaben set erledigt_am = now()
   where bezug_id = f.id and bezug_tabelle = 'firmen' and erledigt_am is null and geloescht_am is null
     and titel like 'Nachweis erneuern: ' || coalesce((select x ->> 'de' from jsonb_array_elements(intern.as_cfg() -> 'nachweise') x
                                                        where x ->> 'art' = art), art) || ' (%';
  return v;
end
$$;

/** Projekte mit IBN, die noch keine Referenz sind (Vorschläge für die Referenzliste). */
create or replace function public.referenzen_vorschlaege() returns table (
  projekt_id uuid, titel text, ort text, leistung_kwp numeric, jahr int, auftraggeber text, sprache text)
language sql stable security invoker set search_path = '' as $$
  select p.id, coalesce(p.titel, p.nummer), o.ort, max(an.leistung_kwp), extract(year from max(an.ibn_am))::int,
         coalesce(k.firma, concat_ws(' ', k.vorname, k.nachname)), coalesce(p.vertrag_sprache, k.sprache, 'de')
    from public.projekte p
    join public.anlagen an on an.projekt_id = p.id and an.geloescht_am is null and an.ibn_am is not null
    left join public.objekte o on o.id = coalesce(p.objekt_id, an.objekt_id)
    join public.kontakte k on k.id = p.kontakt_id
   where p.geloescht_am is null
     and not exists (select 1 from public.submission_referenzen r where r.projekt_id = p.id and r.geloescht_am is null)
   group by p.id, p.titel, p.nummer, o.ort, k.firma, k.vorname, k.nachname, p.vertrag_sprache, k.sprache
   order by max(an.ibn_am) desc
   limit 200
$$;

/** Mitbewerber aus allen Öffnungsprotokollen: wie oft gegen uns, wie oft gewonnen, Preis im Vergleich zu uns. */
create or replace function public.ausschreibung_mitbewerber() returns table (
  anbieter text, orte text, submissionen bigint, erster bigint, abstand_prozent numeric, rappen_pro_kwp bigint,
  kantone text, zuletzt date)
language sql stable security invoker set search_path = '' as $$
  select min(x.anbieter), string_agg(distinct x.ort, ', '), count(distinct x.ausschreibung_id),
         count(*) filter (where x.rang = 1),
         round(avg((x.betrag_rappen - w.betrag_rappen) * 100.0 / nullif(w.betrag_rappen, 0)), 1),
         round(avg(x.betrag_rappen / nullif(a.leistung_kwp, 0)))::bigint,
         string_agg(distinct a.kanton, ', '), max(coalesce(a.entscheid_datum, a.eingereicht_am))
    from public.ausschreibung_angebote x
    join public.ausschreibungen a on a.id = x.ausschreibung_id and a.geloescht_am is null
    left join public.ausschreibung_angebote w on w.ausschreibung_id = x.ausschreibung_id and w.wir and w.geloescht_am is null
   where x.geloescht_am is null and not x.wir
   group by lower(trim(x.anbieter))
   order by 3 desc, 4 desc
$$;

/** Auswertung der Submissionen in einem Zeitraum: geprüft, Go/No-Go, eingereicht, gewonnen je Kanton, No-Go-Gründe. */
create or replace function public.ausschreibungen_auswertung(p_von date, p_bis date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with s as (
    select * from public.ausschreibungen
     where geloescht_am is null and haupt_id is null and spur = 'angebot' and erstellt_am::date between p_von and p_bis)
  select jsonb_build_object(
    'gemeldet', (select count(*) from public.ausschreibungen where geloescht_am is null and haupt_id is null
                   and erstellt_am::date between p_von and p_bis),
    'submissionen', (select count(*) from s),
    'go', (select count(*) from s where gng_entscheid = 'go'),
    'nogo', (select count(*) from s where gng_entscheid = 'nogo'),
    'eingereicht', (select count(*) from s where eingereicht_am is not null),
    'gewonnen', (select count(*) from s where status = 'zuschlag'),
    'gewonnen_rappen', (select coalesce(sum(zuschlag_rappen), 0) from s where status = 'zuschlag'),
    'offen_rappen', (select coalesce(sum(angebot_rappen), 0) from s where status = 'eingereicht'),
    'abstand_prozent', (select round(avg((angebot_rappen - zuschlag_rappen) * 100.0 / nullif(zuschlag_rappen, 0)), 1)
                          from s where status = 'absage' and zuschlag_rappen is not null and angebot_rappen is not null),
    'kantone', coalesce((select jsonb_agg(jsonb_build_object('kanton', k, 'eingereicht', e, 'gewonnen', g) order by e desc)
                           from (select coalesce(kanton, '–') k, count(*) filter (where eingereicht_am is not null) e,
                                        count(*) filter (where status = 'zuschlag') g
                                   from s group by 1) x where e > 0), '[]'),
    'nogo_gruende', coalesce((select jsonb_agg(jsonb_build_object('grund', gng_grund, 'anzahl', n) order by n desc)
                                from (select gng_grund, count(*) n from s where gng_entscheid = 'nogo' group by 1) x), '[]'),
    'anschreiben', (select count(*) from public.anschreiben where geloescht_am is null and status = 'versendet'
                      and versendet_am::date between p_von and p_bis),
    'leads', (select count(*) from public.ausschreibungen where geloescht_am is null and status = 'lead'
                and erstellt_am::date between p_von and p_bis))
$$;

-- Tagesbericht: neu zählen Go/No-Go (wartet auf Andy) und Prüfungen (wartet auf Chris) mit.
create or replace function public.ausschreibungen_tagesbericht() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'neu_heute', (select count(*) from public.ausschreibungen where erstellt_am >= current_date and geloescht_am is null
                    and haupt_id is null and status <> 'verworfen'),
    'pruefen', (select count(*) from public.ausschreibungen where status = 'pruefen' and geloescht_am is null and haupt_id is null),
    'gng', (select count(*) from public.ausschreibungen where status = 'pruefen' and spur = 'angebot' and geloescht_am is null
              and haupt_id is null),
    'pruefung', (select count(*) from public.ausschreibungen a where a.status in ('teilnahme', 'kalkulation') and a.geloescht_am is null
                   and a.pruefung_am is null and coalesce(a.angebot_rappen, a.schaetzung_rappen, 0)
                       >= coalesce((intern.as_cfg() ->> 'pruefen_ab_rappen')::bigint, 10000000)),
    'bewilligen', (select count(*) from public.anschreiben where status = 'entwurf' and geloescht_am is null),
    'senden', (select count(*) from public.anschreiben where status = 'bewilligt' and geloescht_am is null),
    'antworten', (select count(*) from public.ausschreibungen where status = 'antwort' and geloescht_am is null),
    'kontakt_fehlt', (select count(*) from public.ausschreibungen where status = 'kontakt_fehlt' and geloescht_am is null
                        and haupt_id is null),
    'fristen', (select count(*) from public.ausschreibungen where geloescht_am is null
                  and status in ('pruefen', 'teilnahme', 'kalkulation') and frist between current_date and current_date + 14),
    'eingereicht_rappen', (select coalesce(sum(angebot_rappen), 0) from public.ausschreibungen
                             where status = 'eingereicht' and geloescht_am is null),
    'quellen_still', (select count(*) from (select quelle from public.quellen_laeufe where geloescht_am is null group by quelle
                        having coalesce(max(beginn) filter (where ok), '-infinity') < now() - interval '2 days') x),
    'nachweise_ablauf', (select count(*) from jsonb_array_elements(coalesce(intern.as_cfg() -> 'nachweise', '[]')) n
                           cross join public.firmen f
                          where f.geloescht_am is null
                            and coalesce((select max(gueltig_bis) from public.firmen_nachweise x
                                           where x.firma_id = f.id and x.art = n ->> 'art' and x.geloescht_am is null), '-infinity')
                                < current_date + coalesce((intern.as_cfg() ->> 'nachweise_vorlauf_tage')::int, 30)),
    'darf_bewilligen', intern.as_darf('bewilligen'),
    'darf_senden', intern.as_darf('senden'),
    'darf_pruefen', intern.as_darf('pruefen'))
$$;

revoke execute on function public.ausschreibung_gng(uuid), public.submission_speichern(uuid, jsonb),
  public.submission_checkliste(uuid, text, boolean), public.submission_pruefen(uuid), public.submission_protokoll(uuid, jsonb),
  public.nachweise_melden(), public.firmen_nachweis_speichern(jsonb), public.referenzen_vorschlaege(),
  public.ausschreibung_mitbewerber(), public.ausschreibungen_auswertung(date, date) from public, anon;
grant execute on function public.ausschreibung_gng(uuid), public.submission_speichern(uuid, jsonb),
  public.submission_checkliste(uuid, text, boolean), public.submission_pruefen(uuid), public.submission_protokoll(uuid, jsonb),
  public.firmen_nachweis_speichern(jsonb), public.referenzen_vorschlaege(),
  public.ausschreibung_mitbewerber(), public.ausschreibungen_auswertung(date, date) to authenticated;
grant execute on function public.nachweise_melden() to authenticated, service_role;

-- Die KI liest eingefügte Publikationen (Amtsblatt, Gemeinde-Website) mit dem schnellen Modell (Regel 9: Stufe als Daten).
update public.einstellungen set wert = jsonb_set(wert, '{funktionen,publikation}', '"schnell"')
 where schluessel = 'ki' and not (wert -> 'funktionen' ? 'publikation');
