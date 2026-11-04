-- Rechnungen aus AbaNinja übernehmen (Chris 4.11.2026, «irgendwas stimmt hier nicht»: Rechnungen › Offen war leer,
-- der Abgleich meldete 0 Rechnungen). Bisher kannte der Abgleich nur Rechnungen, die im CRM entstanden und mit
-- «An AbaNinja» übergeben worden waren (Referenz = CRM-Nummer). Die Buchhaltung stellt aber in AbaNinja; diese
-- Rechnungen kamen nie ins CRM, und die Vorlage V233 hatte keine eigenen Rechnungen, die der Import hätte bringen
-- können. Neu übernimmt der Abgleich jede gestellte Rechnung aus AbaNinja, deren Kunden er findet
-- (kontakte.abaninja_id oder gleiche Kundennummer), als Rechnung mit quelle = 'abaninja'.
--
-- Regeln:
--  * Entwürfe und stornierte Rechnungen aus AbaNinja werden nicht übernommen; wird eine übernommene später in
--    AbaNinja storniert, wird sie auch hier storniert.
--  * Bezahltes kommt als Zahlung mit quelle 'abaninja' (der Trigger setzt bezahlt/teilbezahlt wie immer).
--  * Übernommene Rechnungen lösen keine Automation aus (Zahlungserinnerung, «bezahlt»): gemahnt wird, was in AbaNinja
--    entstand, weiter von der Buchhaltung dort. Darum werden ihre Signale gleich als Basis vermerkt.
--  * Der Kunde wird mit AbaNinja verknüpft, wenn er über die Kundennummer gefunden wurde.
--  * Projekt aus Referenz oder Titel (Projektnummer mit 6 Ziffern), wie bei den Lieferantenrechnungen.

alter table public.rechnungen
  add column if not exists quelle text not null default 'crm';
alter table public.rechnungen drop constraint if exists rechnungen_quelle_check;
alter table public.rechnungen add constraint rechnungen_quelle_check check (quelle in ('crm', 'abaninja'));
comment on column public.rechnungen.quelle is
  'crm = im CRM entstanden; abaninja = direkt in AbaNinja gestellt und vom Abgleich übernommen (nur lesen).';

/** Kontakt zu einer Rechnung aus AbaNinja: verknüpfter Kunde (UUID des Empfängers), sonst gleiche Kundennummer. */
create or replace function intern.abaninja_kontakt(x jsonb) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select k.id from public.kontakte k
      where k.geloescht_am is null and k.abaninja_id is not null
        and k.abaninja_id in (select jsonb_array_elements_text(coalesce(x -> 'empfaenger', '[]')))
      order by k.erstellt_am limit 1),
    (select k.id from public.kontakte k
      where k.geloescht_am is null and coalesce(x ->> 'kundennummer', '') ~ '^\d{1,12}$'
        and k.kundennummer = (x ->> 'kundennummer')::bigint
      order by k.erstellt_am limit 1))
$$;
revoke execute on function intern.abaninja_kontakt(jsonb) from public, anon;
grant execute on function intern.abaninja_kontakt(jsonb) to authenticated, service_role;

/**
 * Übernommene Rechnung still halten: Signale «überfällig» und «bezahlt» gleich als Basis vermerken, damit keine
 * Automation (Zahlungserinnerung, Dank) für Rechnungen aus AbaNinja anläuft. Nur für quelle = 'abaninja'.
 */
create or replace function intern.abaninja_rechnung_still(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.rechnungen where id = p_id and quelle = 'abaninja') then return; end if;
  perform intern.automation_signal('rechnung.ueberfaellig', 'rechnungen', p_id, p_id || ':0', '{}', true);
  perform intern.automation_signal('rechnung.bezahlt', 'rechnungen', p_id, p_id::text, '{}', true);
end
$$;
revoke execute on function intern.abaninja_rechnung_still(uuid) from public, anon;
grant execute on function intern.abaninja_rechnung_still(uuid) to authenticated, service_role;

create or replace function public.abaninja_abgleich_anwenden(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  x jsonb;
  r public.rechnungen;
  v_diff bigint;
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  n_re int := 0; n_za int := 0; n_be int := 0; n_zu int := 0; n_neu int := 0; n_ohne int := 0;
  v_projekt uuid;
  v_id uuid;
  v_kontakt uuid;
  v_status text;
  v_total bigint;
  v_offen bigint;
  v_nummer text;
  v_sprache text;
begin
  -- Der Zeitplan gleicht jede Nacht ab (Dienst-Rolle); aus der App nur mit Recht «finanzen».
  if not (intern.hat_recht('finanzen') or coalesce(auth.role(), '') = 'service_role') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'rechnungen', '[]')) loop
    v_status := lower(coalesce(x ->> 'status', ''));
    select * into r from public.rechnungen
     where geloescht_am is null
       and (abaninja_uuid = x ->> 'uuid'
            or (abaninja_uuid is null and nullif(x ->> 'reference', '') is not null and nummer = x ->> 'reference'))
     limit 1;

    if not found then
      -- Direkt in AbaNinja gestellt: übernehmen, wenn gestellt und der Kunde bekannt ist.
      continue when v_status in ('', 'draft', 'entwurf', 'cancelled', 'canceled', 'storniert', 'deleted')
                 or coalesce((x ->> 'total_rappen')::bigint, 0) <= 0;
      v_kontakt := intern.abaninja_kontakt(x);
      if v_kontakt is null then n_ohne := n_ohne + 1; continue; end if;
      v_total := (x ->> 'total_rappen')::bigint;
      v_offen := least(greatest(coalesce((x ->> 'offen_rappen')::bigint, v_total), 0), v_total);
      select pr.id into v_projekt from public.projekte pr
       where pr.geloescht_am is null and pr.nummer <> ''
         and (coalesce(x ->> 'reference', '') || ' ' || coalesce(x ->> 'titel', '')) ~ ('\m' || pr.nummer || '\M')
       limit 1;
      select coalesce(sprache, 'de') into v_sprache from public.kontakte where id = v_kontakt;
      -- Nummer von AbaNinja; ist sie im CRM schon vergeben, bleibt sie nur in abaninja_nummer.
      v_nummer := nullif(x ->> 'nummer', '');
      if v_nummer is null or exists (select 1 from public.rechnungen where nummer = v_nummer) then
        v_nummer := 'AN-' || coalesce(v_nummer, left(x ->> 'uuid', 8));
      end if;
      insert into public.rechnungen (nummer, art, status, kontakt_id, projekt_id, firma_id, sprache, titel, datum,
                                     faellig_am, inkl_mwst, positionen, quelle, abaninja_uuid, abaninja_nummer,
                                     abaninja_status, abaninja_offen_rappen, abaninja_abgeglichen_am)
      values (v_nummer, 'frei', 'gestellt', v_kontakt, v_projekt, intern.firma_fuer(v_projekt, v_sprache),
              v_sprache, coalesce(nullif(x ->> 'titel', ''), 'Rechnung ' || coalesce(nullif(x ->> 'nummer', ''), 'AbaNinja')),
              nullif(x ->> 'datum', '')::date, nullif(x ->> 'faellig_am', '')::date, true,
              jsonb_build_array(jsonb_build_object('text', coalesce(nullif(x ->> 'titel', ''), 'Rechnung aus AbaNinja'),
                                                   'menge', 1, 'einheit', 'pauschal', 'preis_rappen', v_total)),
              'abaninja', x ->> 'uuid', nullif(x ->> 'nummer', ''), x ->> 'status', v_offen, now())
      returning id into v_id;
      -- Nichts automatisch auslösen (Erinnerung, «bezahlt»): Basis-Signale gleich vermerken.
      perform intern.abaninja_rechnung_still(v_id);
      if v_total - v_offen > 0 then
        insert into public.rechnung_zahlungen (rechnung_id, datum, betrag_rappen, quelle, notiz)
        values (v_id, coalesce(nullif(x ->> 'datum', '')::date, v_heute), v_total - v_offen, 'abaninja',
                'Übernommen aus AbaNinja');
      end if;
      -- Über die Kundennummer gefunden: gleich verknüpfen, damit die Akte die Rechnungen aus AbaNinja zeigt.
      update public.kontakte set abaninja_id = (x -> 'empfaenger' ->> 0), abaninja_abgeglichen_am = now()
       where id = v_kontakt and abaninja_id is null and nullif(x -> 'empfaenger' ->> 0, '') is not null;
      n_neu := n_neu + 1;
      continue;
    end if;

    n_re := n_re + 1;
    update public.rechnungen set abaninja_uuid = x ->> 'uuid', abaninja_nummer = coalesce(nullif(x ->> 'nummer', ''), abaninja_nummer),
           abaninja_status = x ->> 'status', abaninja_offen_rappen = (x ->> 'offen_rappen')::bigint, abaninja_abgeglichen_am = now()
     where id = r.id;
    -- In AbaNinja storniert: eine von dort übernommene Rechnung auch hier stornieren.
    if r.quelle = 'abaninja' and v_status in ('cancelled', 'canceled', 'storniert') and r.status <> 'storniert' then
      update public.rechnungen set status = 'storniert', storniert_grund = 'In AbaNinja storniert' where id = r.id;
      continue;
    end if;
    if r.status in ('gestellt', 'teilbezahlt') and x ? 'offen_rappen' then
      v_diff := (r.total_rappen - (x ->> 'offen_rappen')::bigint) - r.bezahlt_rappen;
      if v_diff > 0 then
        insert into public.rechnung_zahlungen (rechnung_id, datum, betrag_rappen, quelle, notiz)
        values (r.id, v_heute, v_diff, 'abaninja', 'Abgleich AbaNinja');
        n_za := n_za + 1;
      end if;
    end if;
  end loop;

  for x in select * from jsonb_array_elements(coalesce(p -> 'belege', '[]')) loop
    -- Projekt aus Referenz oder Titel: Projektnummer (6 Ziffern) oder Bestellnummer (B0026).
    select coalesce(
      (select pr.id from public.projekte pr where pr.geloescht_am is null and pr.nummer <> ''
          and (coalesce(x ->> 'reference', '') || ' ' || coalesce(x ->> 'titel', '')) ~ ('\m' || pr.nummer || '\M') limit 1),
      (select b.projekt_id from public.bestellungen b where b.geloescht_am is null and b.projekt_id is not null
          and (coalesce(x ->> 'reference', '') || ' ' || coalesce(x ->> 'titel', '')) ~* ('\m' || b.nummer || '\M') limit 1))
      into v_projekt;
    select id into v_id from public.kreditor_zahlungen where abaninja_uuid = x ->> 'uuid';
    if v_id is null then
      insert into public.kreditor_zahlungen (abaninja_uuid, firma, text, kategorie, rechnung_nr, rechnung_am, betrag_rappen,
                                             faellig_am, prioritaet, status, quelle, projekt_id, offen_rappen, bezahlt_am,
                                             lieferant_id)
      values (x ->> 'uuid', x ->> 'lieferant', coalesce(nullif(x ->> 'titel', ''), x ->> 'reference'),
              case when v_projekt is not null then 'Lieferant' end, coalesce(x ->> 'nummer', x ->> 'reference'),
              nullif(x ->> 'datum', '')::date, (x ->> 'total_rappen')::bigint, nullif(x ->> 'faellig_am', '')::date,
              'normal', case when (x ->> 'storniert')::boolean then 'storniert'
                             when (x ->> 'offen_rappen')::bigint = 0 then 'bezahlt' else 'offen' end,
              'abaninja', v_projekt, (x ->> 'offen_rappen')::bigint,
              case when (x ->> 'offen_rappen')::bigint = 0 then v_heute end,
              (select l.id from public.lieferanten l where l.geloescht_am is null and lower(l.name) = lower(x ->> 'lieferant') limit 1));
      n_be := n_be + 1;
      if v_projekt is not null then n_zu := n_zu + 1; end if;
    else
      update public.kreditor_zahlungen set
        betrag_rappen = (x ->> 'total_rappen')::bigint, offen_rappen = (x ->> 'offen_rappen')::bigint,
        faellig_am = coalesce(nullif(x ->> 'faellig_am', '')::date, faellig_am),
        status = case when (x ->> 'storniert')::boolean then 'storniert'
                      when (x ->> 'offen_rappen')::bigint = 0 then 'bezahlt' else status end,
        bezahlt_am = case when (x ->> 'offen_rappen')::bigint = 0 then coalesce(bezahlt_am, v_heute) end,
        projekt_id = coalesce(projekt_id, v_projekt)
      where id = v_id;
    end if;
  end loop;
  return jsonb_build_object('rechnungen', n_re, 'zahlungen', n_za, 'belege_neu', n_be, 'belege_zugeordnet', n_zu,
                            'rechnungen_neu', n_neu, 'ohne_kunde', n_ohne,
                            'gelesen', jsonb_array_length(coalesce(p -> 'rechnungen', '[]')));
end
$function$;
