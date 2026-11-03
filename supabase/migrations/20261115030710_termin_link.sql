-- Termin-Link (03.11.2026, Entscheid 0052): Kunden buchen ihre Besichtigung selbst auf dimension-solaire.ch.
-- Der Link trägt einen zufälligen Schlüssel pro Lead; die Website fragt freie Zeiten und bucht von Server zu Server
-- über die Edge Function «termin» (Schlüssel ANFRAGE_SCHLUESSEL). Frei ist, was im Raster der Besuchszeiten liegt und
-- weder mit Outlook (kalender_eintraege), anderen Besichtigungen, Abwesenheiten noch Feiertagen der zuständigen
-- Person kollidiert. Gebucht wird über setze_stand, damit dieselben Regeln gelten wie beim Termin von Hand.

alter table public.verkaufschancen
  add column if not exists termin_link text,
  add column if not exists termin_link_bis timestamptz;
create unique index if not exists verkaufschancen_termin_link_idx on public.verkaufschancen (termin_link)
  where termin_link is not null;
comment on column public.verkaufschancen.termin_link is 'Schlüssel im Termin-Link an den Kunden (zufällig, nie die ID).';
comment on column public.verkaufschancen.termin_link_bis is 'Bis wann der Termin-Link gilt; nach der Buchung sofort abgelaufen.';

update public.einstellungen set wert = wert || $j${
  "termin_link": {
    "dauer_min": 90,
    "raster_min": 30,
    "puffer_min": 30,
    "vorlauf_stunden": 20,
    "tage": 14,
    "gueltig_tage": 21,
    "max_zeiten": 40,
    "zeiten": {"1": ["08:00", "17:00"], "2": ["08:00", "17:00"], "3": ["08:00", "17:00"], "4": ["08:00", "17:00"],
               "5": ["08:00", "16:00"], "6": ["09:00", "12:00"]},
    "url": {"de": "https://www.dimension-solaire.ch/de/termin/", "fr": "https://www.dimension-solaire.ch/fr/rendez-vous/"},
    "sms": {
      "de": "Guten Tag {name}, wählen Sie hier selbst einen Termin für die kostenlose Besichtigung Ihres Dachs: {link} Freundliche Grüsse, {verkaeufer}, Dimension Solaire",
      "fr": "Bonjour {name}, choisissez ici vous-même un rendez-vous pour la visite gratuite de votre toit : {link} Meilleures salutations, {verkaeufer}, Dimension Solaire"
    }
  }
}$j$::jsonb
 where schluessel = 'verkauf' and not wert ? 'termin_link';

/** Lead zum Schlüssel, nur solange der Link gilt und noch kein Termin, keine Offerte und kein Abschluss da ist. */
create or replace function intern.termin_link_lead(p_schluessel text) returns public.verkaufschancen
language sql stable security definer set search_path = '' as $$
  select v.* from public.verkaufschancen v
   where v.termin_link = p_schluessel and v.geloescht_am is null
     and coalesce(v.termin_link_bis, 'infinity') > now()
     and v.stufe in ('neu', 'offen', 'warten')
$$;

/**
 * Freie Besichtigungszeiten einer Person: Raster in den Besuchszeiten (Wochentag 1 = Montag), ab Vorlauf bis «tage»
 * voraus, ohne Feiertage, Abwesenheiten, Outlook-Termine (ausser «frei») und andere Besichtigungen (mit Puffer).
 */
create or replace function intern.termin_freie_zeiten(p_person uuid, p_cfg jsonb) returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with c as (
    select coalesce((p_cfg ->> 'dauer_min')::int, 90) as dauer, coalesce((p_cfg ->> 'raster_min')::int, 30) as raster,
           coalesce((p_cfg ->> 'puffer_min')::int, 30) as puffer, coalesce((p_cfg ->> 'tage')::int, 14) as tage,
           now() + make_interval(hours => coalesce((p_cfg ->> 'vorlauf_stunden')::int, 20)) as ab,
           coalesce((p_cfg ->> 'max_zeiten')::int, 40) as max_zeiten
  ), feiertage as (
    select x::date as tag from public.einstellungen e, jsonb_array_elements_text(
      coalesce(e.wert -> 'feiertage', '[]')) x where e.schluessel in ('verkauf', 'posteingang')
  ), tage as (
    select d::date as tag, extract(isodow from d)::text as wt
      from c, generate_series((now() at time zone 'Europe/Zurich')::date, (now() at time zone 'Europe/Zurich')::date + c.tage, '1 day') d
  ), fenster as (
    select t.tag, (t.tag + (p_cfg -> 'zeiten' -> t.wt ->> 0)::time) at time zone 'Europe/Zurich' as von,
           (t.tag + (p_cfg -> 'zeiten' -> t.wt ->> 1)::time) at time zone 'Europe/Zurich' as bis
      from tage t
     where p_cfg -> 'zeiten' ? t.wt and t.tag not in (select tag from feiertage)
       and not exists (select 1 from public.abwesenheiten a where a.person_id = p_person and a.geloescht_am is null
                         and t.tag between a.von and a.bis)
  ), zeiten as (
    select z as beginn, z + make_interval(mins => c.dauer) as ende, c.puffer, c.ab
      from fenster f, c, generate_series(f.von, f.bis - make_interval(mins => c.dauer), make_interval(mins => c.raster)) z
  )
  select z.beginn from zeiten z
   where z.beginn >= z.ab
     and not exists (select 1 from public.kalender_eintraege k
                      where k.person_id = p_person and k.geloescht_am is null and k.anzeige_als <> 'free'
                        and k.beginn < z.ende + make_interval(mins => z.puffer)
                        and k.ende > z.beginn - make_interval(mins => z.puffer))
     and not exists (select 1 from public.verkaufschancen v
                      where v.tour_person_id = p_person and v.geloescht_am is null and v.termin_am is not null
                        and v.stufe = 'termin_vereinbart'
                        and v.termin_am < z.ende + make_interval(mins => z.puffer)
                        and v.termin_am + make_interval(mins => coalesce(v.termin_dauer_min, 60) + z.puffer) > z.beginn)
   order by z.beginn
   limit (select max_zeiten from c)
$$;

/**
 * Termin-Link an den Kunden senden: legt den Schlüssel an (oder verlängert ihn) und eine SMS bzw. Mail in den
 * Ausgangskorb, die erst nach Freigabe rausgeht (Regel 6). Gibt Link und Ausgangskorb-ID zurück.
 */
create or replace function public.termin_link_senden(p_verkaufschance uuid, p_kanal text default 'sms') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v public.verkaufschancen;
  k public.kontakte;
  ich public.personen;
  cfg jsonb := (select wert -> 'termin_link' from public.einstellungen where schluessel = 'verkauf');
  sprache text;
  link text;
  text_ text;
  an text;
  aus uuid;
begin
  select * into v from public.verkaufschancen where id = p_verkaufschance and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if v.stufe not in ('neu', 'offen', 'warten') then raise exception using errcode = 'P0001', message = 'termin_link.stand'; end if;
  if v.tour_person_id is null then raise exception using errcode = 'P0001', message = 'stand.person_fehlt'; end if;
  if p_kanal not in ('sms', 'mail') then raise exception using errcode = 'P0001', message = 'ausgang.kanal'; end if;
  select * into k from public.kontakte where id = v.kontakt_id;
  an := case when p_kanal = 'sms' then nullif(k.telefon, '') else nullif(k.email, '') end;
  if an is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  select * into ich from public.personen where id = intern.meine_person_id();
  sprache := case when k.sprache = 'fr' then 'fr' else 'de' end;

  if v.termin_link is null or coalesce(v.termin_link_bis, 'infinity') <= now() then
    v.termin_link := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  end if;
  update public.verkaufschancen
     set termin_link = v.termin_link,
         termin_link_bis = now() + make_interval(days => coalesce((cfg ->> 'gueltig_tage')::int, 21))
   where id = v.id;

  link := (cfg -> 'url' ->> sprache) || '?t=' || v.termin_link;
  text_ := replace(replace(replace(cfg -> 'sms' ->> sprache,
    '{name}', intern.kontaktname(k)), '{link}', link), '{verkaeufer}', coalesce(ich.name, 'Dimension Solaire'));
  aus := public.ausgang_anlegen(jsonb_build_object('kanal', p_kanal, 'art', 'termin_link', 'an', an,
    'betreff', case when sprache = 'fr' then 'Votre rendez-vous de visite' else 'Ihr Termin für die Besichtigung' end,
    'text', text_, 'sprache', sprache, 'kontakt_id', k.id, 'verkaufschance_id', v.id,
    'schluessel', 'termin_link:' || v.id || ':' || current_date || ':' || p_kanal));
  perform intern.vermerke(k.id, v.id, null, 'Termin-Link vorbereitet (' || p_kanal || ', wartet auf Freigabe)',
    jsonb_build_object('termin_link', true));
  return jsonb_build_object('link', link, 'ausgang_id', aus);
end
$$;
revoke execute on function public.termin_link_senden(uuid, text) from public, anon;
grant execute on function public.termin_link_senden(uuid, text) to authenticated;

/** Für die Website: Vorname, Verkäufer, Sprache, Dauer und freie Zeiten zum Schlüssel (nur Server zu Server). */
create or replace function public.termin_link_zeiten(p_schluessel text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.verkaufschancen;
  cfg jsonb := (select wert -> 'termin_link' from public.einstellungen where schluessel = 'verkauf');
begin
  v := intern.termin_link_lead(p_schluessel);
  if v.id is null then return jsonb_build_object('gueltig', false); end if;
  return jsonb_build_object(
    'gueltig', true,
    'vorname', (select coalesce(nullif(k.vorname, ''), '') from public.kontakte k where k.id = v.kontakt_id),
    'sprache', (select case when k.sprache = 'fr' then 'fr' else 'de' end from public.kontakte k where k.id = v.kontakt_id),
    'verkaeufer', (select p.name from public.personen p where p.id = v.tour_person_id),
    'ort', (select o.ort from public.objekte o where o.id = v.objekt_id),
    'dauer_min', coalesce((cfg ->> 'dauer_min')::int, 90),
    'zeiten', coalesce((select jsonb_agg(z) from intern.termin_freie_zeiten(v.tour_person_id, cfg) z), '[]'));
end
$$;
revoke execute on function public.termin_link_zeiten(text) from public, anon, authenticated;
grant execute on function public.termin_link_zeiten(text) to service_role;

/**
 * Für die Website: Termin buchen. Nur eine Zeit, die gerade noch frei ist; danach gilt der Link nicht mehr.
 * Die zuständige Person bekommt eine Glocke (Popup), Outlook trägt sie wie gewohnt in der Lead-Akte ein.
 */
create or replace function public.termin_link_buchen(p_schluessel text, p_beginn timestamptz, p_notiz text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.verkaufschancen;
  cfg jsonb := (select wert -> 'termin_link' from public.einstellungen where schluessel = 'verkauf');
  name text;
begin
  v := intern.termin_link_lead(p_schluessel);
  if v.id is null then return jsonb_build_object('ok', false, 'fehler', 'ungueltig'); end if;
  -- Sperre pro Person, damit zwei Kunden nicht gleichzeitig dieselbe Zeit bekommen.
  perform pg_advisory_xact_lock(hashtext('termin_link:' || v.tour_person_id));
  if not exists (select 1 from intern.termin_freie_zeiten(v.tour_person_id, cfg) z where z = p_beginn) then
    return jsonb_build_object('ok', false, 'fehler', 'besetzt');
  end if;
  perform public.setze_stand(v.id, 'termin', jsonb_build_object('termin_am', p_beginn, 'person_id', v.tour_person_id,
    'dauer_min', coalesce((cfg ->> 'dauer_min')::int, 90),
    'notiz', concat_ws(' · ', 'Vom Kunden über den Termin-Link gebucht', nullif(left(trim(p_notiz), 500), ''))));
  update public.verkaufschancen set termin_link_bis = now() where id = v.id;
  select intern.kontaktname(k) into name from public.kontakte k where k.id = v.kontakt_id;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
  values (v.tour_person_id, 'info', 'Termin gebucht: ' || name, 'Rendez-vous réservé : ' || name,
          'Besichtigung am ' || to_char(p_beginn at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') || ' (über den Termin-Link)',
          'Visite le ' || to_char(p_beginn at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') || ' (via le lien de rendez-vous)',
          '/sales?lead=' || v.id, true);
  return jsonb_build_object('ok', true, 'beginn', p_beginn);
end
$$;
revoke execute on function public.termin_link_buchen(text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.termin_link_buchen(text, timestamptz, text) to service_role;
