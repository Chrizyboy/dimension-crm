-- Offerten vollständig, Schritt 3 (Entscheid 0046): Stückliste aus den Detailkosten der Eturnity-Offerte.
-- Die App liest sie beim PDF-Import (lib/stueckliste.ts); hier wird sie gespeichert und für die Materialliste
-- des Projekts genutzt. Preise sind Verkaufspreise exkl. MWST (stehen so auch beim Kunden), keine Einkaufspreise.

alter table public.offerten add column if not exists stueckliste jsonb;
comment on column public.offerten.stueckliste is
  'Positionen aus Eturnity: [{gruppe, typ, bezeichnung, menge, einheit, ep_rappen, preis_rappen, art, optional}]';

/** Werte aus PDF, Eturnity oder von Hand setzen; neu auch die Stückliste (ersetzt die alte ganz). */
create or replace function public.offerte_werte_setzen(p_offerte uuid, p jsonb, p_quelle text, p_nur_leere boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  ersetze boolean := not p_nur_leere;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if p ? 'stueckliste' and jsonb_typeof(p -> 'stueckliste') <> 'array' then
    raise exception using errcode = 'P0001', message = 'offerten.stueckliste_ungueltig';
  end if;
  update public.offerten set
    betrag_rappen = case when (ersetze or betrag_rappen is null) and p ? 'betrag_rappen'
                         then nullif(p ->> 'betrag_rappen', '')::bigint else betrag_rappen end,
    leistung_kwp = case when (ersetze or leistung_kwp is null) and p ? 'leistung_kwp'
                        then nullif(p ->> 'leistung_kwp', '')::numeric else leistung_kwp end,
    anzahl_module = case when (ersetze or anzahl_module is null) and p ? 'anzahl_module'
                         then nullif(p ->> 'anzahl_module', '')::int else anzahl_module end,
    wechselrichter = case when (ersetze or wechselrichter is null) and p ? 'wechselrichter'
                          then nullif(trim(p ->> 'wechselrichter'), '') else wechselrichter end,
    batterie = case when (ersetze or batterie is null) and p ? 'batterie'
                    then nullif(trim(p ->> 'batterie'), '') else batterie end,
    angebot_am = case when (ersetze or angebot_am is null) and p ? 'angebot_am'
                      then nullif(p ->> 'angebot_am', '')::date else angebot_am end,
    eturnity_id = case when (ersetze or eturnity_id is null) and p ? 'eturnity_id'
                       then nullif(p ->> 'eturnity_id', '') else eturnity_id end,
    wirtschaftlichkeit = case when (ersetze or wirtschaftlichkeit is null) and p ? 'wirtschaftlichkeit'
                              then p -> 'wirtschaftlichkeit' else wirtschaftlichkeit end,
    stueckliste = case when (ersetze or stueckliste is null) and p ? 'stueckliste'
                       then nullif(p -> 'stueckliste', '[]'::jsonb) else stueckliste end,
    betrag_manuell = case when p ? 'betrag_rappen' and p_quelle = 'manuell' then true
                          when p ? 'betrag_rappen' then false else betrag_manuell end
  where id = o.id;
  -- Im Verlauf nur die Zahl der Positionen, nicht die ganze Liste.
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null,
    format('Offerte %s: Werte übernommen (%s)', o.nummer, p_quelle),
    jsonb_build_object('offerte_id', o.id, 'werte', p - 'stueckliste')
      || case when p ? 'stueckliste' then jsonb_build_object('positionen', jsonb_array_length(p -> 'stueckliste'))
              else '{}'::jsonb end);
end
$$;
revoke execute on function public.offerte_werte_setzen(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.offerte_werte_setzen(uuid, jsonb, text, boolean) to authenticated;

/**
 * Materialliste eines Projekts vorschlagen, wenn noch keine da ist: aus der Kalkulation der Offerte (ohne
 * Dienstleistungen), sonst aus der Stückliste von Eturnity (nur Material, ohne Optionen), sonst aus den
 * Offert-Angaben (Module, Wechselrichter, Batterie). Gibt die Zahl der Zeilen zurück.
 */
create or replace function public.projekt_material_vorschlagen(p_projekt uuid) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  pr public.projekte;
  o public.offerten;
  v_kalk jsonb;
  v_n int := 0;
begin
  select * into pr from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.nicht_gefunden'; end if;
  if exists (select 1 from public.projekt_material where projekt_id = p_projekt and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'einkauf.material_schon_da';
  end if;

  select k.positionen into v_kalk from public.kalkulationen k
   where k.offerte_id = pr.offerte_id and pr.offerte_id is not null and k.geloescht_am is null
   order by k.geaendert_am desc limit 1;
  insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge, einheit, quelle, reihenfolge)
  select p_projekt, a.id, coalesce(nullif(x ->> 'name', ''), a.name), (x ->> 'menge')::numeric,
         coalesce(nullif(x ->> 'einheit', ''), a.einheit, 'Stk'), 'kalkulation', i::int * 10
    from jsonb_array_elements(coalesce(v_kalk, '[]')) with ordinality as t (x, i)
    left join public.artikel a on a.id = nullif(x ->> 'artikelId', '')::uuid
   where coalesce(x ->> 'kategorie', '') <> 'dienstleistungen' and coalesce((x ->> 'menge')::numeric, 0) > 0
     and (a.id is not null or coalesce(x ->> 'name', '') <> '');
  get diagnostics v_n = row_count;
  if v_n > 0 then return v_n; end if;

  select * into o from public.offerten where id = pr.offerte_id;

  -- Stückliste aus Eturnity: Artikel nach Ähnlichkeit vorschlagen (bei bekanntem Typ nur in dessen Kategorie).
  insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge, einheit, quelle, reihenfolge, notiz)
  select p_projekt,
         (select a.id from public.artikel a
           where a.geloescht_am is null and a.archiviert_am is null
             and (s.kategorie is null or a.kategorie = s.kategorie)
             and public.similarity(lower(a.name), lower(s.bezeichnung)) > 0.3
           order by public.similarity(lower(a.name), lower(s.bezeichnung)) desc limit 1),
         s.bezeichnung, s.menge,
         case s.einheit when 'St.' then 'Stk' when 'Stk.' then 'Stk' when 'pcs' then 'Stk' when 'pce' then 'Stk'
                        when 'm2' then 'm²' else s.einheit end,
         'offerte', s.i::int * 10, 'Aus Eturnity'
    from (select x ->> 'bezeichnung' as bezeichnung, (x ->> 'menge')::numeric as menge, x ->> 'einheit' as einheit, i,
                 case x ->> 'typ' when 'modul' then 'module' when 'batterie' then 'batteriespeicher'
                                  when 'wechselrichter' then 'wechselrichter' when 'optimierer' then 'optimierer'
                                  when 'unterkonstruktion' then 'unterkonstruktion' end as kategorie
            from jsonb_array_elements(coalesce(o.stueckliste, '[]')) with ordinality as t (x, i)
           where x ->> 'art' = 'material' and not coalesce((x ->> 'optional')::boolean, false)
             and coalesce((x ->> 'menge')::numeric, 0) > 0 and coalesce(x ->> 'bezeichnung', '') <> '') s;
  get diagnostics v_n = row_count;
  if v_n > 0 then return v_n; end if;

  if coalesce(o.anzahl_module, 0) > 0 then
    insert into public.projekt_material (projekt_id, bezeichnung, menge, quelle, reihenfolge, notiz)
    values (p_projekt, 'PV-Module', o.anzahl_module, 'offerte', 10, 'Modultyp wählen');
    v_n := v_n + 1;
  end if;
  -- Wechselrichter und Batterie stehen in der Offerte als Text: den ähnlichsten Artikel vorschlagen, prüfen bleibt nötig.
  -- Steht bei der Batterie nur eine Zahl (Import aus V233), ist es die Kapazität in kWh.
  insert into public.projekt_material (projekt_id, artikel_id, bezeichnung, menge, quelle, reihenfolge)
  select p_projekt, (select a.id from public.artikel a
                      where a.kategorie = w.kategorie and a.geloescht_am is null and a.archiviert_am is null
                        and public.similarity(lower(a.name), lower(w.text)) > 0.3
                      order by public.similarity(lower(a.name), lower(w.text)) desc limit 1),
         case when w.text ~ '^[0-9.,]+$' then w.name || ' ' || w.text || ' kWh' else w.text end, 1, 'offerte', w.r
    from (values (nullif(trim(o.wechselrichter), ''), 'wechselrichter', 20, 'Wechselrichter'),
                 (nullif(trim(o.batterie), ''), 'batteriespeicher', 30, 'Batterie')) as w (text, kategorie, r, name)
   where w.text is not null;
  get diagnostics v_n = row_count;
  v_n := v_n + case when coalesce(o.anzahl_module, 0) > 0 then 1 else 0 end;
  if v_n = 0 then raise exception using errcode = 'P0001', message = 'einkauf.keine_quelle'; end if;
  return v_n;
end
$$;
revoke execute on function public.projekt_material_vorschlagen(uuid) from public, anon;
grant execute on function public.projekt_material_vorschlagen(uuid) to authenticated;
