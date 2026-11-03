-- Einkauf & Material vollständig, Schritt 2 (Entscheid 0041): Lagerplatz je Artikel, Rüstliste und Ausgabe an die
-- Baustelle, Rückgabe von der Baustelle, Inventur in einem Durchgang und Reklamationen beim Lieferanten.

alter table public.lagerbestand add column if not exists lagerplatz text;
comment on column public.lagerbestand.lagerplatz is 'Regal/Fach im Lager (z. B. «A3-2»), sortiert Rüstliste und Inventur.';

alter table public.lagerbewegungen drop constraint if exists lagerbewegungen_art_check;
alter table public.lagerbewegungen add constraint lagerbewegungen_art_check
  check (art in ('eingang', 'reservierung', 'freigabe', 'entnahme', 'korrektur', 'rueckgabe'));

-- Lager-Übersicht wie bisher, dazu der Lagerplatz (am Ende, damit die Sicht ersetzt werden kann).
create or replace view public.lager_uebersicht with (security_invoker = true) as
select lb.id, lb.lagerort_id, lo.name as lagerort, lb.artikel_id, a.name as artikel, a.artikelnummer, a.kategorie,
       a.einheit, lb.menge, lb.reserviert, lb.menge - lb.reserviert as frei, lb.mindestmenge,
       coalesce((select sum(greatest(p.menge - p.geliefert_menge, 0))
                   from public.bestellpositionen p join public.bestellungen b on b.id = p.bestellung_id
                  where p.artikel_id = lb.artikel_id and b.lagerort_id = lb.lagerort_id and p.projekt_material_id is null
                    and p.geloescht_am is null and b.geloescht_am is null
                    and b.status in ('entwurf', 'freigegeben', 'bestellt', 'teilgeliefert')), 0) as unterwegs,
       (lb.mindestmenge is not null and lb.menge - lb.reserviert < lb.mindestmenge) as unter_mindest,
       lb.geaendert_am,
       lb.lagerplatz
  from public.lagerbestand lb
  join public.lagerorte lo on lo.id = lb.lagerort_id
  join public.artikel a on a.id = lb.artikel_id
 where lb.geloescht_am is null;

/**
 * Lager buchen (p: art, lagerort_id, artikel_id, menge, projekt_material_id, notiz). Arten wie bisher (eingang,
 * korrektur, inventur, reservierung, freigabe, entnahme) und neu «rueckgabe»: Rest von der Baustelle zurück ins
 * Lager; mit Materialzeile wird deren Entnahme entsprechend kleiner.
 */
create or replace function public.lager_buchen(p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_art text := p ->> 'art';
  v_menge numeric := coalesce(nullif(p ->> 'menge', '')::numeric, 0);
  v_artikel uuid := nullif(p ->> 'artikel_id', '')::uuid;
  v_lager uuid := coalesce(nullif(p ->> 'lagerort_id', '')::uuid, (select id from public.lagerorte where aktiv and geloescht_am is null order by erstellt_am limit 1));
  m public.projekt_material;
  z public.lagerbestand;
  v_aus_res numeric := 0;
  v_zurueck numeric := 0;
  v_buchung numeric;
begin
  if v_art not in ('eingang', 'korrektur', 'inventur', 'reservierung', 'freigabe', 'entnahme', 'rueckgabe') then
    raise exception using errcode = 'P0001', message = 'einkauf.art_ungueltig';
  end if;
  if p ? 'projekt_material_id' and nullif(p ->> 'projekt_material_id', '') is not null then
    select * into m from public.projekt_material where id = (p ->> 'projekt_material_id')::uuid and geloescht_am is null for update;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt'; end if;
    v_artikel := coalesce(v_artikel, m.artikel_id);
    if m.artikel_id is distinct from v_artikel then raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt'; end if;
  elsif v_art in ('reservierung', 'freigabe') then
    raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt';
  end if;
  if v_artikel is null or v_lager is null then raise exception using errcode = 'P0001', message = 'einkauf.artikel_fehlt'; end if;
  if (v_art = 'korrektur' and v_menge = 0) or (v_art = 'inventur' and v_menge < 0)
     or (v_art not in ('korrektur', 'inventur') and v_menge <= 0) then
    raise exception using errcode = 'P0001', message = 'einkauf.menge_ungueltig';
  end if;

  z := intern.lager_zeile(v_lager, v_artikel);
  v_buchung := case v_art when 'inventur' then v_menge - z.menge when 'entnahme' then -v_menge else v_menge end;
  if v_art = 'reservierung' and v_menge > z.menge - z.reserviert then
    raise exception using errcode = 'P0001', message = 'einkauf.lager_zu_wenig';
  end if;
  if v_art = 'freigabe' and v_menge > least(m.reserviert, z.reserviert) then
    raise exception using errcode = 'P0001', message = 'einkauf.mehr_als_reserviert';
  end if;
  if v_art = 'entnahme' then
    v_aus_res := least(v_menge, coalesce(m.reserviert, 0), z.reserviert);
    if v_menge - v_aus_res > z.menge - z.reserviert then raise exception using errcode = 'P0001', message = 'einkauf.lager_zu_wenig'; end if;
  end if;
  if v_art = 'rueckgabe' and m.id is not null then
    -- Mehr zurück als entnommen geht nicht (sonst stimmt die Materialliste nicht mehr).
    if v_menge > m.entnommen then raise exception using errcode = 'P0001', message = 'einkauf.mehr_als_entnommen'; end if;
    v_zurueck := v_menge;
  end if;
  if v_art in ('korrektur', 'inventur') and z.menge + v_buchung < z.reserviert then
    raise exception using errcode = 'P0001', message = 'einkauf.unter_reserviert';
  end if;

  update public.lagerbestand set
    menge = menge + case when v_art in ('eingang', 'korrektur', 'inventur', 'entnahme', 'rueckgabe') then v_buchung else 0 end,
    reserviert = reserviert + case v_art when 'reservierung' then v_menge when 'freigabe' then -v_menge
                                         when 'entnahme' then -v_aus_res else 0 end
   where id = z.id;
  if m.id is not null then
    update public.projekt_material set
      reserviert = reserviert + case v_art when 'reservierung' then v_menge when 'freigabe' then -v_menge
                                           when 'entnahme' then -v_aus_res else 0 end,
      entnommen = entnommen + case when v_art = 'entnahme' then v_menge else 0 end - v_zurueck
     where id = m.id;
  end if;
  if v_buchung <> 0 or v_art in ('reservierung', 'freigabe') then
    insert into public.lagerbewegungen (lagerort_id, artikel_id, art, menge, projekt_id, person_id, notiz)
    values (v_lager, v_artikel, case when v_art = 'inventur' then 'korrektur' else v_art end, v_buchung, m.projekt_id,
            intern.meine_person_id(),
            nullif(trim(concat_ws(' · ', case when v_art = 'inventur' then 'Inventur' end, nullif(trim(p ->> 'notiz'), ''))), ''));
  end if;
  perform intern.material_stand_setzen(m.projekt_id);
end
$$;

/** Lagerplatz eines Artikels setzen (leer = keiner). Legt die Lagerzeile bei Bedarf an. */
create or replace function public.lagerplatz_setzen(p_lagerort uuid, p_artikel uuid, p_platz text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  z public.lagerbestand;
begin
  z := intern.lager_zeile(p_lagerort, p_artikel);
  update public.lagerbestand set lagerplatz = nullif(trim(p_platz), '') where id = z.id;
end
$$;

/**
 * Rüstliste eines Projekts: jede Materialzeile mit Artikel, die noch auf die Baustelle muss, mit Lagerplatz,
 * reservierter und freier Menge im Lager. Sortiert nach Lagerplatz, damit man einmal durchs Lager geht.
 */
create or replace function public.ruestliste(p_projekt uuid)
returns table (material_id uuid, artikel_id uuid, bezeichnung text, artikelnummer text, einheit text, lagerort_id uuid,
               lagerplatz text, offen numeric, reserviert numeric, frei numeric)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.artikel_id, m.bezeichnung, a.artikelnummer, coalesce(m.einheit, a.einheit), lb.lagerort_id,
         lb.lagerplatz, greatest(m.menge - m.entnommen, 0), m.reserviert, coalesce(lb.menge - lb.reserviert, 0)
    from public.projekt_material m
    join public.artikel a on a.id = m.artikel_id
    left join lateral (select l.* from public.lagerbestand l
                        where l.artikel_id = m.artikel_id and l.geloescht_am is null
                        order by (l.reserviert > 0) desc, l.menge desc limit 1) lb on true
   where m.projekt_id = p_projekt and m.geloescht_am is null and m.menge > m.entnommen
     and (m.reserviert > 0 or coalesce(lb.menge - lb.reserviert, 0) > 0)
   order by lb.lagerplatz nulls last, m.reihenfolge, m.bezeichnung
$$;

/**
 * Gerüstet: Positionen der Rüstliste an die Baustelle ausgeben (p: [{id: Materialzeile, menge}]). Zuerst aus der
 * Reservierung des Projekts, dann aus Freiem. Gibt die Zahl der Buchungen zurück.
 */
create or replace function public.projekt_ruesten(p_projekt uuid, p jsonb) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  x jsonb;
  m public.projekt_material;
  n int := 0;
begin
  for x in select * from jsonb_array_elements(coalesce(p, '[]')) loop
    continue when coalesce(nullif(x ->> 'menge', '')::numeric, 0) <= 0;
    select * into m from public.projekt_material
     where id = (x ->> 'id')::uuid and projekt_id = p_projekt and geloescht_am is null;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.material_fehlt'; end if;
    perform public.lager_buchen(jsonb_build_object('art', 'entnahme', 'projekt_material_id', m.id,
      'lagerort_id', x ->> 'lagerort_id', 'menge', (x ->> 'menge')::numeric, 'notiz', 'Rüstliste'));
    n := n + 1;
  end loop;
  return n;
end
$$;

/**
 * Inventur in einem Durchgang (p: [{artikel_id, menge}] gezählt). Nur Abweichungen werden als Korrektur gebucht.
 * Gibt die Zahl der korrigierten Artikel zurück.
 */
create or replace function public.inventur_buchen(p_lagerort uuid, p jsonb, p_notiz text default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  x jsonb;
  v_alt numeric;
  n int := 0;
begin
  for x in select * from jsonb_array_elements(coalesce(p, '[]')) loop
    continue when nullif(x ->> 'menge', '') is null;
    select menge into v_alt from public.lagerbestand
     where lagerort_id = p_lagerort and artikel_id = (x ->> 'artikel_id')::uuid and geloescht_am is null;
    continue when coalesce(v_alt, 0) = (x ->> 'menge')::numeric;
    perform public.lager_buchen(jsonb_build_object('art', 'inventur', 'lagerort_id', p_lagerort,
      'artikel_id', x ->> 'artikel_id', 'menge', (x ->> 'menge')::numeric, 'notiz', coalesce(nullif(trim(p_notiz), ''), 'Inventur')));
    n := n + 1;
  end loop;
  return n;
end
$$;

-- Reklamationen beim Lieferanten: defekt, falsch, fehlt, zu viel. Lösung Gutschrift, Ersatz oder Rücksendung.
create table public.einkauf_reklamationen (
  id uuid primary key default gen_random_uuid(),
  bestellung_id uuid not null references public.bestellungen (id),
  position_id uuid references public.bestellpositionen (id),
  menge numeric(12, 3),
  grund text not null check (grund in ('defekt', 'falsch', 'fehlt', 'zu_viel', 'anderes')),
  beschreibung text,
  status text not null default 'offen' check (status in ('offen', 'gemeldet', 'erledigt')),
  loesung text check (loesung in ('gutschrift', 'ersatz', 'ruecksendung', 'keine')),
  gemeldet_am date,
  erledigt_am date,
  antwort text
);
select intern.richte_fachtabelle_ein('einkauf_reklamationen', 'preise');
create index einkauf_reklamationen_bestellung_idx on public.einkauf_reklamationen (bestellung_id) where geloescht_am is null;

/**
 * Reklamation anlegen oder ändern (p: id?, bestellung_id, position_id, menge, grund, beschreibung, status, loesung,
 * antwort). «gemeldet» und «erledigt» setzen ihr Datum; erledigt braucht eine Lösung. Gibt die id zurück.
 */
create or replace function public.reklamation_speichern(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_status text := coalesce(nullif(p ->> 'status', ''), 'offen');
begin
  if not intern.hat_recht('preise') then raise exception using errcode = 'P0001', message = 'einkauf.kein_recht'; end if;
  if v_status = 'erledigt' and nullif(p ->> 'loesung', '') is null then
    raise exception using errcode = 'P0001', message = 'einkauf.loesung_fehlt';
  end if;
  if v_id is null then
    insert into public.einkauf_reklamationen (bestellung_id, position_id, menge, grund, beschreibung, status, loesung,
                                               gemeldet_am, erledigt_am, antwort)
    values ((p ->> 'bestellung_id')::uuid, nullif(p ->> 'position_id', '')::uuid, nullif(p ->> 'menge', '')::numeric,
            p ->> 'grund', nullif(trim(p ->> 'beschreibung'), ''), v_status, nullif(p ->> 'loesung', ''),
            case when v_status <> 'offen' then current_date end, case when v_status = 'erledigt' then current_date end,
            nullif(trim(p ->> 'antwort'), ''))
    returning id into v_id;
  else
    update public.einkauf_reklamationen set
      status = v_status,
      loesung = coalesce(nullif(p ->> 'loesung', ''), loesung),
      antwort = coalesce(nullif(trim(p ->> 'antwort'), ''), antwort),
      beschreibung = coalesce(nullif(trim(p ->> 'beschreibung'), ''), beschreibung),
      gemeldet_am = case when v_status <> 'offen' then coalesce(gemeldet_am, current_date) end,
      erledigt_am = case when v_status = 'erledigt' then coalesce(erledigt_am, current_date) end
     where id = v_id and geloescht_am is null;
    if not found then raise exception using errcode = 'P0001', message = 'einkauf.nicht_gefunden'; end if;
  end if;
  return v_id;
end
$$;

revoke execute on function public.lagerplatz_setzen(uuid, uuid, text) from public, anon;
revoke execute on function public.ruestliste(uuid) from public, anon;
revoke execute on function public.projekt_ruesten(uuid, jsonb) from public, anon;
revoke execute on function public.inventur_buchen(uuid, jsonb, text) from public, anon;
revoke execute on function public.reklamation_speichern(jsonb) from public, anon;
grant execute on function public.lagerplatz_setzen(uuid, uuid, text) to authenticated;
grant execute on function public.ruestliste(uuid) to authenticated;
grant execute on function public.projekt_ruesten(uuid, jsonb) to authenticated;
grant execute on function public.inventur_buchen(uuid, jsonb, text) to authenticated;
grant execute on function public.reklamation_speichern(jsonb) to authenticated;
