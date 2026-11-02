-- Offerten vollständig (2.11.2026, Entscheid 0039): Varianten, Gültigkeit, Gewinnchance, Nachfass-Plan mit
-- Ergebnis, Unterlagen-Checkliste und Freigabe vor dem Senden. Regeln stehen hier, damit Oberfläche, Mein Tag und
-- Automationen dasselbe sehen. Werte und Schwellen sind Daten in einstellungen.offerten (nur Administration).

alter table public.offerten
  add column if not exists gueltig_bis date,
  add column if not exists varianten jsonb not null default '[]',
  add column if not exists variante text,
  add column if not exists chance_prozent int check (chance_prozent between 0 and 100),
  add column if not exists entscheid_erwartet date,
  add column if not exists konkurrenz text,
  add column if not exists rabatt_prozent numeric(5, 2) check (rabatt_prozent between 0 and 100),
  add column if not exists unterlagen jsonb not null default '{}',
  add column if not exists nachfass_schritt int not null default 0,
  add column if not exists nachfass_ergebnis text,
  add column if not exists freigabe jsonb;
comment on column public.offerten.varianten is
  'Varianten einer Offerte [{k: "A", titel, betrag_rappen, kwp, batterie, text}], der Kunde wählt eine (variante).';
comment on column public.offerten.chance_prozent is 'Von Hand gesetzte Gewinnchance; leer = automatisch (intern.offerte_chance).';
comment on column public.offerten.nachfass_schritt is 'Wie viele Schritte des Nachfass-Plans erledigt sind.';
comment on column public.offerten.nachfass_ergebnis is
  'Letztes Ergebnis: gesendet (Plan läuft), nicht_erreicht, vergleicht, interessiert, neue_version, spaeter, ruht, ja, nein; leer = übernommen ohne Plan.';
comment on column public.offerten.freigabe is 'Freigabe vor dem Senden {von, name, am, notiz, grund}; leer = nicht freigegeben.';

insert into public.einstellungen (schluessel, wert) values ('offerten', '{
  "gueltig_tage": 30,
  "ziel_arbeitstage": 5,
  "nachfass_plan": [3, 10, 21, 30],
  "nicht_erreicht_tage": 2,
  "wiedervorlage_monate": 6,
  "gewonnen_tage": 14,
  "freigabe": {"aktiv": true, "rabatt_ab": 5, "marge_unter": 18, "durch": ["chris"]},
  "chance": {"zu_offerieren": 20, "offeriert": 30, "vergleicht": 40, "neue_version": 50, "interessiert": 60,
             "vertagt": 20, "alt_tage": 60, "alt": 10},
  "unterlagen": [
    {"id": "fotos", "de": "Fotos Dach, Zähler, Verteilung", "fr": "Photos toit, compteur, tableau"},
    {"id": "stromrechnung", "de": "Stromrechnung / Verbrauch", "fr": "Facture d''électricité / consommation"},
    {"id": "dach", "de": "Dachmasse und Luftbild", "fr": "Dimensions du toit et vue aérienne"},
    {"id": "wuensche", "de": "Wünsche: Batterie, Wallbox, Wärmepumpe", "fr": "Souhaits : batterie, borne, PAC"},
    {"id": "netz", "de": "Netzbetreiber und Tarif", "fr": "Gestionnaire de réseau et tarif"},
    {"id": "hausanschluss", "de": "Hausanschluss und Platz Wechselrichter", "fr": "Raccordement et place onduleur"},
    {"id": "bewilligung", "de": "Bewilligung geklärt (Meldeverfahren/Baugesuch)", "fr": "Autorisation clarifiée"},
    {"id": "zugang", "de": "Gerüst und Zufahrt geprüft", "fr": "Échafaudage et accès vérifiés"}
  ]
}') on conflict (schluessel) do nothing;

/** Offerten-Einstellungen ändern nur Administration (eigener Trigger, damit intern.einstellung_schuetzen unberührt bleibt). */
create or replace function intern.offerten_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'offerte.kein_recht';
  end if;
  return new;
end
$$;
create trigger offerten_schuetzen before insert or update on public.einstellungen
  for each row when (new.schluessel = 'offerten') execute function intern.offerten_einstellung_schuetzen();

/** Einstellungen der Offerten (leer = Standard). */
create or replace function intern.offerten_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select wert from public.einstellungen where schluessel = 'offerten' and geloescht_am is null), '{}')
$$;

/** Tag n (0 = erster) des Nachfass-Plans in Tagen nach dem Angebot; null, wenn der Plan vorbei ist. */
create or replace function intern.nachfass_tag(p_schritt int) returns int
language sql stable set search_path = '' as $$
  select (intern.offerten_cfg() -> 'nachfass_plan' ->> p_schritt)::int
$$;

/** n Arbeitstage (Mo–Fr) nach einem Datum. */
create or replace function intern.plus_arbeitstage(p_ab date, p_tage int) returns date
language plpgsql immutable set search_path = '' as $$
declare
  d date := p_ab;
  n int := 0;
begin
  while n < p_tage loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end
$$;

/**
 * Marge der neuesten Kalkulation zur Offerte zu tief? Liest die Einkaufspreise mit Server-Rechten, gibt aber
 * nur ja/nein heraus, damit Personen ohne Recht «preise» keine Einkaufspreise sehen.
 */
create or replace function intern.offerte_marge_zu_tief(p_offerte uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  with k as (
    select x.netto_rappen,
           (select sum(coalesce((p ->> 'ekRappen')::numeric, 0) * coalesce((p ->> 'menge')::numeric, 0))
              from jsonb_array_elements(case when jsonb_typeof(x.positionen) = 'array' then x.positionen else '[]' end) p) as ek
      from public.kalkulationen x
     where x.offerte_id = p_offerte and x.geloescht_am is null
     order by x.geaendert_am desc nulls last limit 1)
  select coalesce((select k.netto_rappen > 0 and k.ek > 0
                          and (k.netto_rappen - k.ek) * 100.0 / k.netto_rappen
                              < coalesce((intern.offerten_cfg() -> 'freigabe' ->> 'marge_unter')::numeric, 18)
                     from k), false)
$$;

/** Warum die Offerte eine Freigabe braucht ('rabatt', 'marge') oder null. */
create or replace function intern.offerte_freigabe_grund(o public.offerten) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when not coalesce((intern.offerten_cfg() -> 'freigabe' ->> 'aktiv')::boolean, false) then null
    when o.rabatt_prozent > coalesce((intern.offerten_cfg() -> 'freigabe' ->> 'rabatt_ab')::numeric, 5) then 'rabatt'
    when intern.offerte_marge_zu_tief(o.id) then 'marge'
  end
$$;

/**
 * Gewinnchance in Prozent: von Hand gesetzt, sonst aus Stand, letztem Nachfass-Ergebnis und Alter
 * (Werte in einstellungen.offerten.chance).
 */
create or replace function intern.offerte_chance(o public.offerten) returns int
language sql stable set search_path = '' as $$
  with c as (select coalesce(intern.offerten_cfg() -> 'chance', '{}') as w)
  select case
    when o.status = 'angenommen' or o.entscheid = 'angenommen' then 100
    when o.status in ('verloren', 'archiviert') then 0
    when o.chance_prozent is not null then o.chance_prozent
    when o.status <> 'offeriert' then coalesce((c.w ->> 'zu_offerieren')::int, 20)
    when o.entscheid = 'vertagt' then coalesce((c.w ->> 'vertagt')::int, 20)
    when o.nachfass_ergebnis in ('vergleicht', 'neue_version', 'interessiert') then coalesce((c.w ->> o.nachfass_ergebnis)::int, 30)
    when o.angebot_am < current_date - coalesce((c.w ->> 'alt_tage')::int, 60) then coalesce((c.w ->> 'alt')::int, 10)
    else coalesce((c.w ->> 'offeriert')::int, 30)
  end from c
$$;
grant execute on function intern.offerte_chance(public.offerten) to authenticated;
grant execute on function intern.offerte_freigabe_grund(public.offerten) to authenticated;

/**
 * Stand einer Offerte ohne Projekt (wie 20261024000100). Neu: ein künftiges Nachfass-Datum heisst nur bei
 * übernommenen Offerten ohne Plan (V233) «vertagt»; mit Plan ist es der nächste Schritt und die Offerte «offeriert».
 */
create or replace function intern.stand_offerte(o public.offerten, pruefung boolean) returns text
language sql stable set search_path = '' as $$
  select case
    when o.status in ('verloren', 'archiviert') then 'verloren'
    when o.status = 'angenommen' or o.entscheid = 'angenommen' then 'angenommen'
    when o.status = 'offeriert' then case
      when coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) is null
        or coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) <= current_date then 'nachfassen'
      when o.entscheid = 'vertagt' or (o.nachfassen_am > current_date and o.nachfass_ergebnis is null) then 'vertagt'
      else 'offeriert'
    end
    when pruefung then 'pruefung'
    else 'offerte'
  end
$$;

/**
 * Beim Senden (Status → offeriert): Freigabe prüfen, Gültigkeit setzen und den Nachfass-Plan neu beginnen.
 * Ändert sich der Rabatt, gilt eine frühere Freigabe nicht mehr.
 */
create or replace function intern.offerte_vor_senden() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.offerten_cfg();
begin
  if new.rabatt_prozent is distinct from old.rabatt_prozent and old.freigabe is not null then
    new.freigabe := null;
  end if;
  if new.status = 'offeriert' and old.status is distinct from 'offeriert' then
    if auth.uid() is not null and new.freigabe is null and intern.offerte_freigabe_grund(new) is not null then
      raise exception using message = 'offerte.freigabe_fehlt';
    end if;
  end if;
  if new.status = 'offeriert' and new.angebot_am is not null
     and (old.status is distinct from 'offeriert' or new.angebot_am is distinct from old.angebot_am) then
    -- «gesendet» markiert Offerten mit Nachfass-Plan; ein Datum in der Zukunft heisst dann nicht «vertagt».
    new.nachfass_schritt := 0;
    new.nachfass_ergebnis := 'gesendet';
    if new.nachfassen_am is null then
      new.nachfassen_am := new.angebot_am + coalesce(intern.nachfass_tag(0), intern.nachfassen_tage());
    end if;
    if new.gueltig_bis is null or new.angebot_am is distinct from old.angebot_am then
      new.gueltig_bis := new.angebot_am + coalesce((cfg ->> 'gueltig_tage')::int, 30);
    end if;
  end if;
  return new;
end
$$;
create trigger offerte_vor_senden before update on public.offerten
  for each row execute function intern.offerte_vor_senden();

/**
 * Offerte vor dem Senden freigeben (Rabatt über der Schwelle oder Marge zu tief). Darf, wer in
 * einstellungen.offerten.freigabe.durch steht (Kürzel), oder Administration.
 */
create or replace function public.offerte_freigeben(p_offerte uuid, p_notiz text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.offerten;
  ich uuid := intern.meine_person_id();
  durch jsonb := coalesce(intern.offerten_cfg() -> 'freigabe' -> 'durch', '[]');
begin
  if not (intern.hat_recht('admin')
          or exists (select 1 from public.personen p where p.id = ich and durch ? p.kuerzel)) then
    raise exception using errcode = '42501', message = 'offerte.freigabe_kein_recht';
  end if;
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  update public.offerten set freigabe = jsonb_strip_nulls(jsonb_build_object(
      'von', ich, 'name', (select name from public.personen where id = ich), 'am', now(),
      'notiz', nullif(trim(coalesce(p_notiz, '')), ''), 'grund', intern.offerte_freigabe_grund(o), 'rabatt', o.rabatt_prozent))
   where id = o.id;
  perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null,
    concat_ws(' · ', format('Offerte %s freigegeben', o.nummer), nullif(trim(coalesce(p_notiz, '')), '')),
    jsonb_build_object('offerte_id', o.id, 'freigabe', true));
end
$$;
revoke execute on function public.offerte_freigeben(uuid, text) from public, anon;
grant execute on function public.offerte_freigeben(uuid, text) to authenticated;

/**
 * Angaben der Offerte ändern (nur mitgegebene Felder): gueltig_bis, chance_prozent (null = automatisch),
 * entscheid_erwartet, konkurrenz, rabatt_prozent, unterlagen (wird zusammengeführt), varianten, variante.
 */
create or replace function public.offerte_angaben_setzen(p_offerte uuid, p jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  o public.offerten;
  v jsonb;
begin
  select * into o from public.offerten where id = p_offerte and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if p ? 'varianten' then
    v := p -> 'varianten';
    if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 4
       or exists (select 1 from jsonb_array_elements(v) x where nullif(trim(coalesce(x ->> 'k', '')), '') is null) then
      raise exception using message = 'offerte.varianten_ungueltig';
    end if;
  end if;
  if nullif(p ->> 'variante', '') is not null
     and not exists (select 1 from jsonb_array_elements(coalesce(v, o.varianten)) x where x ->> 'k' = p ->> 'variante') then
    raise exception using message = 'offerte.variante_unbekannt';
  end if;
  update public.offerten set
    gueltig_bis = case when p ? 'gueltig_bis' then nullif(p ->> 'gueltig_bis', '')::date else gueltig_bis end,
    chance_prozent = case when p ? 'chance_prozent' then nullif(p ->> 'chance_prozent', '')::int else chance_prozent end,
    entscheid_erwartet = case when p ? 'entscheid_erwartet' then nullif(p ->> 'entscheid_erwartet', '')::date else entscheid_erwartet end,
    konkurrenz = case when p ? 'konkurrenz' then nullif(trim(p ->> 'konkurrenz'), '') else konkurrenz end,
    rabatt_prozent = case when p ? 'rabatt_prozent' then nullif(p ->> 'rabatt_prozent', '')::numeric else rabatt_prozent end,
    unterlagen = case when jsonb_typeof(p -> 'unterlagen') = 'object' then unterlagen || (p -> 'unterlagen') else unterlagen end,
    varianten = coalesce(v, varianten),
    variante = case when p ? 'variante' then nullif(p ->> 'variante', '') else variante end,
    -- Die gewählte Variante bestimmt Betrag und Leistung der Offerte (Werkvertrag, Kennzahlen).
    betrag_rappen = coalesce((select (x ->> 'betrag_rappen')::bigint from jsonb_array_elements(coalesce(v, varianten)) x
                               where x ->> 'k' = coalesce(nullif(p ->> 'variante', ''), case when p ? 'variante' then null else variante end)
                                 and nullif(x ->> 'betrag_rappen', '') is not null), betrag_rappen),
    leistung_kwp = coalesce((select (x ->> 'kwp')::numeric from jsonb_array_elements(coalesce(v, varianten)) x
                              where x ->> 'k' = coalesce(nullif(p ->> 'variante', ''), case when p ? 'variante' then null else variante end)
                                and nullif(x ->> 'kwp', '') is not null), leistung_kwp)
  where id = o.id;
  if p ? 'variante' and nullif(p ->> 'variante', '') is distinct from o.variante then
    perform intern.vermerke(o.kontakt_id, o.verkaufschance_id, null,
      format('Offerte %s: Variante %s gewählt', o.nummer, coalesce(nullif(p ->> 'variante', ''), '–')),
      jsonb_build_object('offerte_id', o.id, 'variante', p ->> 'variante'));
  end if;
end
$$;
revoke execute on function public.offerte_angaben_setzen(uuid, jsonb) from public, anon;
grant execute on function public.offerte_angaben_setzen(uuid, jsonb) to authenticated;

/**
 * Ergebnis beim Nachfassen erfassen; setzt den nächsten Schritt nach dem Plan, damit keine Offerte ohne Datum bleibt.
 * Ergebnisse: nicht_erreicht (in n Arbeitstagen nochmals), vergleicht / interessiert / neue_version (nächster
 * Plan-Schritt), spaeter (Datum + Grund, «vertagt»), ruht (Wiedervorlage in Monaten), ja (angenommen, optional
 * Variante), nein (verloren, Grund Pflicht, optional Konkurrenz). Angaben: notiz, datum, grund, variante,
 * konkurrenz, art (anruf, mail, besuch, sms; Standard anruf).
 */
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
    "neue_version": "neue Version gewünscht", "spaeter": "später", "ruht": "keine Antwort, ruht", "ja": "Ja, Auftrag", "nein": "Nein"}';
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
grant execute on function public.offerte_nachfassen(uuid, text, jsonb) to authenticated;

/** Offerten-Liste mit den neuen Angaben: Chance, Gültigkeit, Varianten, Freigabe, Phase für den Arbeitsvorrat. */
create or replace view public.offerten_liste with (security_invoker = true) as
select
  o.id, o.nummer, o.titel, o.status, o.sprache, o.angebot_am, o.angebot_am_frueher, o.betrag_rappen,
  o.leistung_kwp, o.anzahl_module, o.wechselrichter, o.batterie, o.entscheid, o.entscheid_am, o.vertagt_grund,
  o.verlustgrund, o.nachfassen_am, o.verantwortlich_id, o.eturnity_id, o.versionen, o.wirtschaftlichkeit,
  o.zurueckgegeben, o.verkaufschance_id, o.objekt_id, o.erstellt_am, o.geaendert_am,
  jsonb_array_length(o.versionen) as anzahl_versionen,
  st.kuerzel as standort, o.standort_id,
  k.id as kontakt_id, k.kundennummer, intern.kontaktname(k) as name, k.telefon, k.email,
  coalesce(ob.plz, pv.plz) as plz,
  coalesce(ob.ort, regexp_replace(pv.ort, '\s+\d+$', '')) as ort,
  ob.strasse,
  pe.name as verantwortlich_name,
  intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false)) as stand,
  case when o.status = 'offeriert' then coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) end as faellig_am,
  coalesce(v.stufe = 'zur_offerte', false) as im_eingang,
  pr.id as projekt_id, pr.nummer as projekt_nummer,
  wv.id as werkvertrag_id, wv.status as werkvertrag_status,
  lower(concat_ws(' ', o.nummer, intern.kontaktname(k), k.email, k.telefon, ob.strasse, ob.plz, ob.ort, pv.ort, o.titel,
                  o.wechselrichter, o.batterie, 'k' || lpad(k.kundennummer::text, 4, '0'))) as suchtext,
  -- Neu (Entscheid 0040)
  coalesce(o.gueltig_bis, o.angebot_am + coalesce((intern.offerten_cfg() ->> 'gueltig_tage')::int, 30)) as gueltig_bis,
  o.varianten, o.variante, o.chance_prozent, intern.offerte_chance(o) as chance,
  o.entscheid_erwartet, o.konkurrenz, o.rabatt_prozent, o.unterlagen, o.nachfass_schritt, o.nachfass_ergebnis,
  o.freigabe, case when o.freigabe is null and o.status = 'in_arbeit' then intern.offerte_freigabe_grund(o) end as freigabe_grund,
  case
    when o.status = 'angenommen' or o.entscheid = 'angenommen' then 'gewonnen'
    when o.status in ('verloren', 'archiviert') then 'verloren'
    when o.status = 'offeriert' and o.nachfass_ergebnis in ('interessiert', 'neue_version') then 'verhandlung'
    when o.status = 'offeriert' then 'offeriert'
    when v.stufe = 'zur_offerte' and v.offerte_status = 'pruefung' then 'pruefen'
    when o.freigabe is null and intern.offerte_freigabe_grund(o) is not null then 'pruefen'
    when v.stufe = 'zur_offerte' and coalesce(v.offerte_status, 'neu') in ('neu', 'rueckfrage') then 'zu_offerieren'
    else 'planung'
  end as phase,
  v.termin_am, v.zur_offerte_am, v.tour_person_id as verkauf_person_id, tp.name as verkauf_person_name,
  v.offerte_status as eingang_status, v.offerte_rueckfrage as rueckfrage,
  o.status = 'offeriert' and coalesce(o.gueltig_bis, o.angebot_am + coalesce((intern.offerten_cfg() ->> 'gueltig_tage')::int, 30)) < current_date
    as abgelaufen
from public.offerten o
join public.kontakte k on k.id = o.kontakt_id and k.geloescht_am is null
left join public.objekte ob on ob.id = o.objekt_id
left join lateral intern.ort_aus_verzeichnis(ob.plz, ob.ort) pv on true
left join public.standorte st on st.id = o.standort_id
left join public.verkaufschancen v on v.id = o.verkaufschance_id and v.geloescht_am is null
left join public.personen pe on pe.id = o.verantwortlich_id
left join public.personen tp on tp.id = v.tour_person_id
left join lateral (select x.id, x.nummer from public.projekte x
                    where x.offerte_id = o.id and x.geloescht_am is null order by x.erstellt_am desc limit 1) pr on true
left join lateral (select x.id, x.status from public.werkvertraege x
                    where x.offerte_id = o.id and x.geloescht_am is null and x.status <> 'storniert'
                    order by x.erstellt_am desc limit 1) wv on true
where o.geloescht_am is null;
grant select on public.offerten_liste to authenticated;

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge) values
  ('verlustgrund_offerte', 'preis', 'Preis / Konkurrenz günstiger', 'Prix / concurrence moins chère', 1),
  ('verlustgrund_offerte', 'zeitpunkt', 'Zeitpunkt, später', 'Pas maintenant', 2),
  ('verlustgrund_offerte', 'finanzierung', 'Finanzierung', 'Financement', 3),
  ('verlustgrund_offerte', 'dach', 'Dach oder Statik ungeeignet', 'Toit ou statique inadapté', 4),
  ('verlustgrund_offerte', 'kein_interesse', 'Kein Interesse mehr', 'Plus d''intérêt', 5),
  ('verlustgrund_offerte', 'andere', 'Anderer Grund', 'Autre raison', 6)
on conflict do nothing;
