-- Termin verschieben (Abgleich mit V234, 19.11.2026): Bisher kehrte setze_stand bei Termin → Termin sofort zurück,
-- darum blieb ein im Wochenkalender verschobener Termin am alten Ort. Jetzt speichert Termin → Termin das neue
-- Datum, die Dauer und die Person und vermerkt «Termin verschoben». Sonst unverändert (20261025000300).
create or replace function public.setze_stand(p_geschaeft uuid, p_ziel text, p_angaben jsonb default '{}')
returns text
language plpgsql security invoker set search_path = '' as $$
declare
  g public.verkauf_geschaefte;
  vorher text;
  d date := nullif(p_angaben ->> 'datum', '')::date;
  grund text := nullif(trim(coalesce(p_angaben ->> 'grund', '')), '');
  notiz text := nullif(trim(coalesce(p_angaben ->> 'notiz', '')), '');
  lead_ziel boolean := p_ziel in ('lead_neu', 'lead_offen', 'lead_spaeter', 'termin', 'kein');
  text_de text;
begin
  select * into g from public.verkauf_geschaefte x where x.id = p_geschaeft;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  vorher := g.stand;
  -- Termin → Termin ist ein Verschieben (Wochenkalender, Rechtsklick «Termin verschieben»): neu speichern.
  if vorher = p_ziel and p_ziel <> 'termin' then return p_ziel; end if;
  if p_ziel in ('nach_termin') then raise exception using message = 'stand.automatisch'; end if;
  if g.projekt_id is not null or p_ziel in ('bau', 'verbaut', 'dossier') then
    raise exception using message = 'stand.projekt';
  end if;

  if lead_ziel then
    if g.verkaufschance_id is null or g.offerte_id is not null then raise exception using message = 'stand.hat_offerte'; end if;
    case p_ziel
      when 'lead_neu' then
        update public.verkaufschancen set stufe = 'neu', wiedervorlage_am = null where id = g.verkaufschance_id;
      when 'lead_offen' then
        update public.verkaufschancen set stufe = 'offen', wiedervorlage_am = null where id = g.verkaufschance_id;
      when 'lead_spaeter' then
        -- V170: «Warten» nur mit Datum.
        if d is null then raise exception using message = 'stand.datum_fehlt'; end if;
        if d <= current_date then raise exception using message = 'stand.datum_vergangen'; end if;
        update public.verkaufschancen set stufe = 'warten', wiedervorlage_am = d, wiedervorlage_grund = grund
         where id = g.verkaufschance_id;
      when 'termin' then
        -- V170: Termin immer mit Datum, Uhrzeit und «Termin bei», nie in der Vergangenheit.
        if nullif(p_angaben ->> 'termin_am', '') is null then raise exception using message = 'stand.termin_fehlt'; end if;
        if (p_angaben ->> 'termin_am')::timestamptz < now() - interval '10 minutes' then
          raise exception using message = 'stand.datum_vergangen';
        end if;
        if nullif(p_angaben ->> 'person_id', '') is null then raise exception using message = 'stand.person_fehlt'; end if;
        update public.verkaufschancen
           set stufe = 'termin_vereinbart', termin_am = (p_angaben ->> 'termin_am')::timestamptz,
               termin_dauer_min = coalesce(nullif(p_angaben ->> 'dauer_min', '')::int, termin_dauer_min, 60),
               tour_person_id = (p_angaben ->> 'person_id')::uuid, wiedervorlage_am = null
         where id = g.verkaufschance_id;
      when 'kein' then
        update public.verkaufschancen set stufe = 'kein_interesse', verlustgrund = intern.pflicht(grund, 'stand.grund_fehlt')
         where id = g.verkaufschance_id;
    end case;
  elsif p_ziel in ('offerte', 'pruefung') and g.offerte_id is null then
    if g.verkaufschance_id is null then raise exception using message = 'stand.unbekannt'; end if;
    -- V200: «Richtofferte (ohne Besuch)» oder nach dem Termin: der Lead geht an den Innendienst.
    if coalesce((p_angaben ->> 'richtofferte')::boolean, false) then perform intern.pflicht(notiz, 'stand.notiz_fehlt'); end if;
    update public.verkaufschancen
       set stufe = 'zur_offerte',
           offerte_status = case when p_ziel = 'pruefung' then 'pruefung' else coalesce(nullif(offerte_status, 'pruefung'), 'neu') end,
           zur_offerte_am = coalesce(zur_offerte_am, current_date),
           offerte_hinweis = case when coalesce((p_angaben ->> 'richtofferte')::boolean, false) then 'Richtofferte' else offerte_hinweis end
     where id = g.verkaufschance_id;
  elsif g.offerte_id is null then
    raise exception using message = 'stand.braucht_offerte';
  else
    case p_ziel
      when 'offerte' then
        update public.offerten set status = 'in_arbeit', entscheid = null where id = g.offerte_id;
        if g.verkaufschance_id is not null then
          update public.verkaufschancen set offerte_status = 'bearbeitung' where id = g.verkaufschance_id;
        end if;
      when 'pruefung' then
        if g.verkaufschance_id is null then raise exception using message = 'stand.unbekannt'; end if;
        update public.offerten set status = 'in_arbeit', entscheid = null where id = g.offerte_id;
        update public.verkaufschancen set offerte_status = 'pruefung' where id = g.verkaufschance_id;
      when 'offeriert' then
        -- V170: die Oberfläche fragt vorher, ob die Offerte wirklich gesendet wurde.
        update public.offerten set status = 'offeriert', entscheid = null, nachfassen_am = null,
               angebot_am = coalesce(d, angebot_am, current_date)
         where id = g.offerte_id;
      when 'nachfassen' then
        update public.offerten set status = 'offeriert', entscheid = null, nachfassen_am = current_date,
               angebot_am = coalesce(angebot_am, current_date)
         where id = g.offerte_id;
      when 'vertagt' then
        if d is null then raise exception using message = 'stand.datum_fehlt'; end if;
        if d <= current_date then raise exception using message = 'stand.datum_vergangen'; end if;
        update public.offerten set status = 'offeriert', entscheid = 'vertagt', nachfassen_am = d,
               vertagt_grund = intern.pflicht(grund, 'stand.grund_fehlt'), entscheid_am = current_date,
               angebot_am = coalesce(angebot_am, current_date)
         where id = g.offerte_id;
      when 'angenommen' then
        -- Der Auftrag (Werkvertrag, Zahlungsplan, Projekt) entsteht ab Phase 7/9 aus diesem Entscheid.
        update public.offerten set status = 'angenommen', entscheid = 'angenommen', entscheid_am = coalesce(d, current_date)
         where id = g.offerte_id;
      when 'verloren' then
        update public.offerten set status = 'verloren', entscheid = 'verloren', entscheid_am = current_date,
               verlustgrund = intern.pflicht(grund, 'stand.grund_fehlt')
         where id = g.offerte_id;
      else
        raise exception using message = 'stand.unbekannt';
    end case;
  end if;

  select a.text_de into text_de from public.auswahlwerte a where a.liste = 'kundenstand' and a.schluessel = p_ziel;
  perform intern.vermerke(g.kontakt_id, g.verkaufschance_id, null,
    concat_ws(' · ', case when vorher = p_ziel then 'Termin verschoben' else 'Stand: ' || coalesce(text_de, p_ziel) end,
              grund, notiz),
    jsonb_build_object('stand_vorher', vorher, 'stand', p_ziel));
  return p_ziel;
end
$$;
revoke execute on function public.setze_stand(uuid, text, jsonb) from public, anon;
grant execute on function public.setze_stand(uuid, text, jsonb) to authenticated;
