-- Nachfassen per Mail (Abgleich mit V234, 19.11.2026): Ergebnis «mail» schiebt das nächste Nachfassen um
-- `einstellungen.offerten.mail_tage` Arbeitstage (Standard 5) und hält die Mail im Verlauf fest.
-- Bis zum Cloud-Update fällt die App auf «nicht_erreicht» mit Art «mail» zurück.
create or replace function public.offerte_nachfassen(p_offerte uuid, p_ergebnis text, p jsonb default '{}')
returns date language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  cfg jsonb := intern.offerten_cfg();
  notiz text := nullif(trim(coalesce(p ->> 'notiz', '')), '');
  d date := nullif(p ->> 'datum', '')::date;
  tag int;
  naechst date;
  art text := coalesce(nullif(p ->> 'art', ''), 'anruf');
  texte jsonb := '{"nicht_erreicht": "nicht erreicht", "vergleicht": "Kunde vergleicht", "interessiert": "Kunde will, Details offen",
    "neue_version": "neue Version gewünscht", "spaeter": "später", "ruht": "keine Antwort, ruht", "ja": "Ja, Auftrag", "nein": "Nein",
    "mail": "Nachfass-Mail gesendet"}';
begin
  if not texte ? p_ergebnis then raise exception using message = 'stand.unbekannt'; end if;
  if art not in ('anruf', 'mail', 'besuch', 'sms', 'notiz') then raise exception using message = 'stand.unbekannt'; end if;
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if o.status <> 'offeriert' then raise exception using message = 'offerte.nicht_offeriert'; end if;

  case p_ergebnis
    when 'nicht_erreicht' then
      naechst := coalesce(d, intern.plus_arbeitstage(current_date, coalesce((cfg ->> 'nicht_erreicht_tage')::int, 2)));
      update public.offerten set nachfassen_am = naechst,
             nachfass_ergebnis = case when nachfass_ergebnis in ('vergleicht', 'interessiert', 'neue_version')
                                      then nachfass_ergebnis else 'nicht_erreicht' end
       where id = o.id;
    when 'mail' then
      -- Nachfass-Mail (V234 «✉ Nachfass-Mail»): Stand bleibt, nächstes Nachfassen nach `mail_tage` Arbeitstagen.
      art := 'mail';
      naechst := coalesce(d, intern.plus_arbeitstage(current_date, coalesce((cfg ->> 'mail_tage')::int, 5)));
      update public.offerten set nachfassen_am = naechst where id = o.id;
    when 'vergleicht', 'interessiert', 'neue_version' then
      tag := intern.nachfass_tag(o.nachfass_schritt + 1);
      naechst := coalesce(d, greatest(o.angebot_am + tag, intern.plus_arbeitstage(current_date, 2)),
                          intern.plus_arbeitstage(current_date, 10));
      update public.offerten
         set nachfass_schritt = nachfass_schritt + 1, nachfass_ergebnis = p_ergebnis, nachfassen_am = naechst,
             entscheid = null, entscheid_erwartet = coalesce(nullif(p ->> 'entscheid_erwartet', '')::date, entscheid_erwartet),
             konkurrenz = coalesce(nullif(trim(coalesce(p ->> 'konkurrenz', '')), ''), konkurrenz)
       where id = o.id;
    when 'spaeter', 'ruht' then
      naechst := case when p_ergebnis = 'ruht'
                      then coalesce(d, (current_date + make_interval(months => coalesce((cfg ->> 'wiedervorlage_monate')::int, 6)))::date)
                      else d end;
      perform public.offerte_entscheiden(o.id, 'vertagt', jsonb_build_object('datum', naechst,
        'grund', coalesce(nullif(trim(coalesce(p ->> 'grund', '')), ''), case when p_ergebnis = 'ruht' then 'Keine Antwort' end, notiz)));
      update public.offerten set nachfass_ergebnis = p_ergebnis where id = o.id;
    when 'ja' then
      if nullif(p ->> 'variante', '') is not null then
        perform public.offerte_angaben_setzen(o.id, jsonb_build_object('variante', p ->> 'variante'));
      end if;
      perform public.offerte_entscheiden(o.id, 'angenommen', jsonb_build_object('datum', coalesce(d, current_date)));
      update public.offerten set nachfass_ergebnis = 'ja', nachfassen_am = null where id = o.id;
    when 'nein' then
      perform public.offerte_entscheiden(o.id, 'verloren', jsonb_build_object('grund', p ->> 'grund'));
      update public.offerten set nachfass_ergebnis = 'nein', nachfassen_am = null,
             konkurrenz = coalesce(nullif(trim(coalesce(p ->> 'konkurrenz', '')), ''), konkurrenz)
       where id = o.id;
  end case;

  insert into public.aktivitaeten (art, richtung, text, ergebnis, person_id, kontakt_id, verkaufschance_id, offerte_id, details)
  values (art, 'aus', concat_ws(' · ', format('Nachfassen %s: %s', o.nummer, texte ->> p_ergebnis), notiz), p_ergebnis,
          intern.meine_person_id(), o.kontakt_id, o.verkaufschance_id, o.id,
          jsonb_strip_nulls(jsonb_build_object('offerte_id', o.id, 'nachfassen', true, 'naechst', naechst)));
  return naechst;
end
$$;
revoke execute on function public.offerte_nachfassen(uuid, text, jsonb) from public, anon;
