-- Einkauf & Material vollständig (Entscheid 0039), Teil 4: Wareneingang für Sammelbestellungen, Rechnungsabgleich
-- mit den Lieferantenrechnungen aus AbaNinja, Mails zur Bestellung und Meldungen (Glocke) aus dem Zeitplan.

/**
 * Wareneingang (p: positionen [{id, menge}], datum, lieferschein). Wie bisher, aber das Projekt kommt je Position
 * aus der Materialliste (Sammelbestellung) und der Lieferschein wird bei der Bestellung vermerkt.
 */
create or replace function public.wareneingang_buchen(p_id uuid, p jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bestellungen;
  x jsonb;
  pos public.bestellpositionen;
  z public.lagerbestand;
  v_menge numeric;
  v_projekt uuid;
  v_datum date := coalesce(nullif(p ->> 'datum', '')::date, current_date);
  v_ls text := nullif(trim(p ->> 'lieferschein'), '');
  v_ich uuid := intern.meine_person_id();
  v_n int := 0;
  v_status text;
  v_projekte uuid[] := '{}';
begin
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if b.status not in ('bestellt', 'teilgeliefert') then raise exception using errcode = 'P0001', message = 'einkauf.nicht_bestellt'; end if;
  for x in select * from jsonb_array_elements(coalesce(p -> 'positionen', '[]')) loop
    v_menge := coalesce(nullif(x ->> 'menge', '')::numeric, 0);
    if v_menge = 0 then continue; end if;
    if v_menge < 0 then raise exception using errcode = 'P0001', message = 'einkauf.menge_ungueltig'; end if;
    update public.bestellpositionen set geliefert_menge = geliefert_menge + v_menge
     where id = (x ->> 'id')::uuid and bestellung_id = p_id and geloescht_am is null
    returning * into pos;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.position_fehlt'; end if;
    v_n := v_n + 1;
    v_projekt := coalesce((select projekt_id from public.projekt_material where id = pos.projekt_material_id), b.projekt_id);
    if v_projekt is not null and not v_projekt = any (v_projekte) then v_projekte := v_projekte || v_projekt; end if;
    if b.lagerort_id is null or pos.artikel_id is null then continue; end if;
    z := intern.lager_zeile(b.lagerort_id, pos.artikel_id);
    update public.lagerbestand set menge = menge + v_menge,
      reserviert = reserviert + case when pos.projekt_material_id is not null then v_menge else 0 end
     where id = z.id;
    insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, bestellung_id, zeitpunkt, person_id, notiz)
    values (b.lagerort_id, pos.artikel_id, 'eingang', v_menge, v_projekt, p_id, v_datum, v_ich,
            case when v_ls is not null then 'Lieferschein ' || v_ls end);
    if pos.projekt_material_id is not null then
      update public.projekt_material set reserviert = reserviert + v_menge where id = pos.projekt_material_id;
      insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, bestellung_id, zeitpunkt, person_id)
      values (b.lagerort_id, pos.artikel_id, 'reservierung', v_menge, v_projekt, p_id, v_datum, v_ich);
    end if;
  end loop;
  if v_n = 0 then raise exception using errcode = 'P0001', message = 'einkauf.nichts_geliefert'; end if;

  v_status := case when exists (select 1 from public.bestellpositionen where bestellung_id = p_id and geloescht_am is null
                                   and geliefert_menge < menge) then 'teilgeliefert' else 'geliefert' end;
  update public.bestellungen
     set status = v_status, geliefert_am = case when v_status = 'geliefert' then v_datum end,
         lieferscheine = case when v_ls is null or v_ls = any (lieferscheine) then lieferscheine else lieferscheine || v_ls end
   where id = p_id;
  foreach v_projekt in array v_projekte loop perform intern.material_stand_setzen(v_projekt); end loop;
  return v_status;
end
$$;

/** Erwarteter Rechnungsbetrag exkl. MWST: gelieferte (sonst bestellte) Menge mal Preis laut AB, sonst Bestellpreis. */
create or replace function intern.bestellung_erwartet_rappen(p_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(round(case when b.status in ('teilgeliefert', 'geliefert') then p.geliefert_menge else coalesce(p.ab_menge, p.menge) end
                            * coalesce(p.ab_ek_rappen, p.ek_rappen, 0))), 0)::bigint
    from public.bestellpositionen p join public.bestellungen b on b.id = p.bestellung_id
   where p.bestellung_id = p_id and p.geloescht_am is null
$$;

/**
 * Passende Lieferantenrechnungen aus AbaNinja (Kreditoren) für eine Bestellung: gleicher Lieferant, noch keiner
 * Bestellung zugeordnet, die letzten 180 Tage, nächster Betrag zuerst. Für Einkauf (preise) und Buchhaltung.
 */
create or replace function public.bestellung_rechnungen(p_id uuid)
returns table (id uuid, rechnung_nr text, rechnung_am date, betrag_rappen bigint, status text, text text, erwartet_rappen bigint)
language sql stable security definer set search_path = '' as $$
  select k.id, k.rechnung_nr, k.rechnung_am, k.betrag_rappen, k.status, k.text, intern.bestellung_erwartet_rappen(b.id)
    from public.bestellungen b
    join public.lieferanten l on l.id = b.lieferant_id
    join public.kreditor_zahlungen k on k.geloescht_am is null
         and (k.lieferant_id = b.lieferant_id or (k.lieferant_id is null and lower(k.firma) like '%' || lower(split_part(l.name, ' ', 1)) || '%'))
         and coalesce(k.rechnung_am, k.erstellt_am::date) >= coalesce(b.bestellt_am, b.erstellt_am::date) - 180
   where b.id = p_id and (intern.hat_recht('preise') or intern.hat_recht('finanzen'))
     and not exists (select 1 from public.bestellungen x where x.rechnung_kreditor_id = k.id and x.id <> b.id and x.geloescht_am is null)
   order by abs(coalesce(k.betrag_rappen, 0) - intern.bestellung_erwartet_rappen(b.id) * (1 + coalesce(public.mwst_satz(), 8.1) / 100)), k.rechnung_am desc nulls last
   limit 10
$$;

/**
 * Lieferantenrechnung zur Bestellung (p: kreditor_id oder nummer + betrag_rappen, notiz, geprueft).
 * «geprueft» setzt die Rechnung auch in den Finanzen auf geprüft. Weicht der Betrag (exkl. MWST) mehr als 1 % oder
 * CHF 50 vom Erwarteten ab, braucht es eine Notiz.
 */
create or replace function public.bestellung_rechnung(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bestellungen;
  k public.kreditor_zahlungen;
  v_betrag bigint;
  v_erwartet bigint := intern.bestellung_erwartet_rappen(p_id);
  v_mwst numeric := coalesce(public.mwst_satz(), 8.1) / 100;
  v_geprueft boolean := coalesce((p ->> 'geprueft')::boolean, false);
  v_notiz text := nullif(trim(p ->> 'notiz'), '');
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'einkauf.kein_recht';
  end if;
  select * into b from public.bestellungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  if nullif(p ->> 'kreditor_id', '') is not null then
    select * into k from public.kreditor_zahlungen where id = (p ->> 'kreditor_id')::uuid and geloescht_am is null;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.rechnung_fehlt'; end if;
  end if;
  v_betrag := coalesce(nullif(p ->> 'betrag_rappen', '')::bigint, k.betrag_rappen, b.rechnung_rappen);
  if v_geprueft and v_betrag is not null and v_notiz is null and coalesce(b.rechnung_notiz, '') = ''
     and abs(v_betrag / (1 + v_mwst) - v_erwartet) > greatest(5000, v_erwartet * 0.01) then
    raise exception using errcode = 'P0001', message = 'einkauf.rechnung_abweichung';
  end if;
  update public.bestellungen
     set rechnung_kreditor_id = coalesce(k.id, rechnung_kreditor_id),
         rechnung_nummer = coalesce(nullif(trim(p ->> 'nummer'), ''), k.rechnung_nr, rechnung_nummer),
         rechnung_rappen = v_betrag,
         rechnung_notiz = coalesce(v_notiz, rechnung_notiz),
         rechnung_geprueft_am = case when v_geprueft then now() else rechnung_geprueft_am end,
         rechnung_geprueft_von = case when v_geprueft then intern.meine_person_id() else rechnung_geprueft_von end
   where id = p_id;
  if k.id is not null then
    update public.kreditor_zahlungen
       set lieferant_id = coalesce(lieferant_id, b.lieferant_id), projekt_id = coalesce(projekt_id, b.projekt_id),
           geprueft = geprueft or v_geprueft
     where id = k.id;
  end if;
end
$$;

/** Mails im Posteingang zu einer Bestellung: Nummer im Betreff/Text oder Absender mit der Domain des Lieferanten. */
create or replace function public.bestellung_mails(p_id uuid)
returns table (id uuid, eingang_am timestamptz, von_name text, von_email text, betreff text, vorschau text, hat_anhang boolean)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.eingang_am, m.von_name, m.von_email, m.betreff, m.vorschau, m.hat_anhang
    from public.bestellungen b
    join public.lieferanten l on l.id = b.lieferant_id
    join public.posteingang m on m.geloescht_am is null and m.eingang_am >= coalesce(b.freigegeben_am, b.erstellt_am) - interval '1 day'
         and (b.nummer = any (m.nummern) or m.betreff ilike '%' || b.nummer || '%'
              or (l.email_bestellung is not null and split_part(lower(m.von_email), '@', 2) = split_part(lower(l.email_bestellung), '@', 2)))
   where b.id = p_id
   order by (b.nummer = any (m.nummern) or m.betreff ilike '%' || b.nummer || '%') desc, m.eingang_am desc
   limit 20
$$;

-- Meldungen nur einmal je Anlass.
create table if not exists intern.einkauf_gemeldet (
  schluessel text primary key,
  am timestamptz not null default now()
);

/**
 * Glocke für den Einkauf (Zeitplan, stündlich): AB fehlt nach n Arbeitstagen (an die bestellende Person),
 * Montage gefährdet (an bestellende und freigebende Personen), Bestellen-bis erreicht (an die Freigebenden).
 */
create or replace function public.einkauf_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.einkauf_cfg();
  r record;
  n int := 0;
  k int;
begin
  for r in select b.*, 'ab' as anlass from public.bestellungen_liste b
            where b.schritt = 'ab_offen'
              and case when b.bestellt_am is null then false
                       else intern.arbeitstage_plus(b.bestellt_am, (cfg ->> 'ab_erinnern_tage')::int) <= current_date end
           union all
           select b.*, 'gefahr' from public.bestellungen_liste b where b.gefaehrdet and b.status in ('bestellt', 'teilgeliefert') loop
    insert into intern.einkauf_gemeldet (schluessel)
    values (r.anlass || ':' || r.id || case when r.anlass = 'gefahr' then ':' || coalesce(r.erwartet_am::text, '') else '' end)
    on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select distinct x, case when r.anlass = 'gefahr' then 'kritisch' else 'warnung' end,
           case when r.anlass = 'gefahr' then 'Montage gefährdet: ' else 'Auftragsbestätigung fehlt: ' end || r.nummer,
           case when r.anlass = 'gefahr' then 'Montage menacée : ' else 'Confirmation manquante : ' end || r.nummer,
           r.lieferant || coalesce(' · ' || r.projekte, '') || case when r.anlass = 'gefahr'
             then ' · Lieferung ' || coalesce(to_char(r.erwartet_am, 'DD.MM.YYYY'), '?') || ', Montage ' || to_char(r.baubeginn, 'DD.MM.YYYY') else '' end,
           r.lieferant || coalesce(' · ' || r.projekte, '') || case when r.anlass = 'gefahr'
             then ' · livraison ' || coalesce(to_char(r.erwartet_am, 'DD.MM.YYYY'), '?') || ', montage ' || to_char(r.baubeginn, 'DD.MM.YYYY') else '' end,
           '/purchasing?bestellung=' || r.id
      from unnest(array_remove(array[r.bestellt_von] || case when r.anlass = 'gefahr' then intern.einkauf_freigeber() else '{}'::uuid[] end, null)) x;
  end loop;

  for r in select m.* from public.materialplan m
            where m.zeilen_fehlt > 0 and m.bestellen_bis is not null and m.bestellen_bis <= intern.arbeitstage_plus(current_date, 2) loop
    insert into intern.einkauf_gemeldet (schluessel) values ('bestellen:' || r.id || ':' || r.bestellen_bis) on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, case when r.bestellen_bis < current_date then 'kritisch' else 'warnung' end,
           'Material bestellen: ' || r.nummer, 'Commander le matériel : ' || r.nummer,
           coalesce(r.kunde, '') || ' · bestellen bis ' || to_char(r.bestellen_bis, 'DD.MM.YYYY') || ', Montage ' || to_char(r.baubeginn, 'DD.MM.YYYY'),
           coalesce(r.kunde, '') || ' · commander avant le ' || to_char(r.bestellen_bis, 'DD.MM.YYYY') || ', montage ' || to_char(r.baubeginn, 'DD.MM.YYYY'),
           '/purchasing?reiter=materialplan&projekt=' || r.id
      from unnest(intern.einkauf_freigeber()) x;
  end loop;
  return n;
end
$$;

revoke execute on function public.sammelbestellung(uuid) from public, anon;
revoke execute on function public.bestellung_vorlegen(uuid) from public, anon;
revoke execute on function public.bestellung_ab_erfassen(uuid, jsonb) from public, anon;
revoke execute on function public.bestellung_rechnungen(uuid) from public, anon;
revoke execute on function public.bestellung_rechnung(uuid, jsonb) from public, anon;
revoke execute on function public.bestellung_mails(uuid) from public, anon;
revoke execute on function public.einkauf_melden() from public, anon, authenticated;
revoke execute on function intern.bestellung_erwartet_rappen(uuid) from public, anon;
grant execute on function public.sammelbestellung(uuid) to authenticated;
grant execute on function public.bestellung_vorlegen(uuid) to authenticated;
grant execute on function public.bestellung_ab_erfassen(uuid, jsonb) to authenticated;
grant execute on function public.bestellung_rechnungen(uuid) to authenticated;
grant execute on function public.bestellung_rechnung(uuid, jsonb) to authenticated;
grant execute on function public.bestellung_mails(uuid) to authenticated;
grant execute on function intern.bestellung_erwartet_rappen(uuid) to authenticated;
grant execute on function public.einkauf_melden() to service_role;
