-- Wartung Teil 2 (Entscheid 0044): Inspektionen planen mit Ankündigung 2 Wochen vorher (Ausgangskorb, Freigabe
-- per Klick), eigene Anlagen ohne Wartungsvertrag mit Angebot (einzeln und als Serie) und die Inspektion am Handy
-- mit Prüfpunkten und Vorjahreswerten. Texte und Prüfpunkte sind Daten in «wartung_pakete» (nur Administration).

update public.einstellungen set wert = wert || $json$
{
  "ankuendigung": {
    "de": {
      "betreff": "Inspektion Ihrer Photovoltaikanlage am {datum}",
      "text": "Guten Tag {name}\n\nIm Rahmen Ihres Wartungsvertrags {nummer} ({paket}) kommen wir am {datum} zwischen {zeit} zur Inspektion Ihrer Anlage. Unser Techniker {person} meldet sich kurz vor der Ankunft.\n\nBitte sorgen Sie dafür, dass Wechselrichter, Speicher und Zählerkasten zugänglich sind. Passt der Termin nicht, antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\nDimension Solaire"
    },
    "fr": {
      "betreff": "Inspection de votre installation photovoltaïque le {datum}",
      "text": "Bonjour {name}\n\nDans le cadre de votre contrat d'entretien {nummer} ({paket}), nous passerons le {datum} entre {zeit} pour l'inspection de votre installation. Notre technicien {person} vous contactera peu avant son arrivée.\n\nMerci de rendre accessibles l'onduleur, la batterie et le tableau électrique. Si la date ne vous convient pas, répondez simplement à cet e-mail.\n\nMeilleures salutations\nDimension Solaire"
    }
  },
  "angebot": {
    "de": {
      "betreff": "Wartungsvertrag für Ihre Photovoltaikanlage",
      "text": "Guten Tag {name}\n\nIhre Anlage ({kwp} kWp, in Betrieb seit {ibn}) läuft. Damit das so bleibt, empfehlen wir Ihnen unseren Wartungsvertrag {paket} für CHF {preis} pro Jahr (exkl. MWST):\n\n{leistungen}\n\nMindestlaufzeit 3 Jahre, danach jährlich kündbar. Möchten Sie den Vertrag abschliessen? Antworten Sie einfach auf diese Mail, wir erledigen den Rest. Alle Pakete finden Sie auf www.dimension-solaire.ch.\n\nFreundliche Grüsse\nDimension Solaire"
    },
    "fr": {
      "betreff": "Contrat d'entretien pour votre installation photovoltaïque",
      "text": "Bonjour {name}\n\nVotre installation ({kwp} kWc, en service depuis {ibn}) fonctionne. Pour que cela dure, nous vous recommandons notre contrat d'entretien {paket} pour CHF {preis} par an (hors TVA) :\n\n{leistungen}\n\nDurée minimale 3 ans, ensuite résiliable chaque année. Vous souhaitez conclure le contrat ? Répondez simplement à cet e-mail, nous nous occupons du reste. Tous les forfaits sur www.dimension-solaire.ch.\n\nMeilleures salutations\nDimension Solaire"
    }
  },
  "pruefpunkte": [
    {"schluessel": "sichtkontrolle", "de": "Sichtkontrolle Module, Unterkonstruktion, Kabel und Steckverbinder", "fr": "Contrôle visuel modules, sous-construction, câbles et connecteurs", "art": "ja_nein"},
    {"schluessel": "wr_check", "de": "Wechselrichter und Speicher geprüft, Fehlerspeicher gelesen", "fr": "Onduleur et batterie contrôlés, mémoire d'erreurs lue", "art": "ja_nein"},
    {"schluessel": "firmware", "de": "Firmware auf aktuellem Stand", "fr": "Firmware à jour", "art": "ja_nein"},
    {"schluessel": "schutz", "de": "Überspannungsschutz, Anlagenschalter, Klemmstellen", "fr": "Parafoudre, sectionneur, bornes", "art": "ja_nein"},
    {"schluessel": "luefter", "de": "Lüfter und Filter am Wechselrichter gereinigt", "fr": "Ventilateurs et filtres de l'onduleur nettoyés", "art": "ja_nein"},
    {"schluessel": "ertrag", "de": "Ertrag seit letzter Inspektion", "fr": "Production depuis la dernière inspection", "art": "wert", "einheit": "kWh"},
    {"schluessel": "isolation", "de": "Isolationswiderstand", "fr": "Résistance d'isolement", "art": "wert", "einheit": "MΩ", "nur_messung": true},
    {"schluessel": "leerlaufspannung", "de": "Leerlaufspannung Uoc (String 1)", "fr": "Tension à vide Uoc (string 1)", "art": "wert", "einheit": "V", "nur_messung": true},
    {"schluessel": "kurzschlussstrom", "de": "Kurzschlussstrom Isc (String 1)", "fr": "Courant de court-circuit Isc (string 1)", "art": "wert", "einheit": "A", "nur_messung": true},
    {"schluessel": "speicher_soh", "de": "Zustand Speicher (SoH)", "fr": "État de la batterie (SoH)", "art": "wert", "einheit": "%"}
  ],
  "abweichung_prozent": 10
}
$json$::jsonb
where schluessel = 'wartung_pakete';

alter table public.wartungsvertraege
  add column if not exists termin_von timestamptz,
  add column if not exists termin_bis timestamptz,
  add column if not exists termin_person_id uuid references public.personen (id),
  add column if not exists termin_geplant_von uuid references public.personen (id),
  add column if not exists angekuendigt_am timestamptz;
comment on column public.wartungsvertraege.termin_von is 'Geplante Inspektion (Beginn); nach «Wartung erledigt» wieder leer.';
comment on column public.wartungsvertraege.angekuendigt_am is 'Ankündigung an den Kunden im Ausgangskorb angelegt (einmal pro Termin).';

/** Termin der nächsten Inspektion setzen oder leeren (p_von null). Ein neuer Tag braucht eine neue Ankündigung. */
create or replace function public.wartung_termin_setzen(p_id uuid, p_von timestamptz, p_bis timestamptz, p_person uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_von is not null and (p_bis is null or p_bis <= p_von) then
    raise exception using errcode = 'P0001', message = 'wartung.termin_ungueltig';
  end if;
  update public.wartungsvertraege
     set termin_von = p_von, termin_bis = case when p_von is null then null else p_bis end,
         termin_person_id = case when p_von is null then null else p_person end,
         termin_geplant_von = case when p_von is null then null else intern.meine_person_id() end,
         angekuendigt_am = case when (p_von at time zone 'Europe/Zurich')::date
                                     = (termin_von at time zone 'Europe/Zurich')::date then angekuendigt_am end
   where id = p_id and geloescht_am is null and status = 'aktiv';
  if not found then raise exception using errcode = 'P0001', message = 'wartung.nicht_aktiv'; end if;
end
$$;

/** Nach «Wartung erledigt» (neuer Eintrag im Verlauf und neue nächste Wartung) ist der Termin verbraucht. */
create or replace function intern.wartung_termin_aufraeumen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (jsonb_array_length(coalesce(new.verlauf, '[]')) > jsonb_array_length(coalesce(old.verlauf, '[]'))
      and new.naechste_wartung is distinct from old.naechste_wartung)
     or new.status = 'beendet' then
    new.termin_von := null; new.termin_bis := null; new.termin_person_id := null;
    new.termin_geplant_von := null; new.angekuendigt_am := null;
  end if;
  return new;
end
$$;
drop trigger if exists wartung_termin_aufraeumen on public.wartungsvertraege;
create trigger wartung_termin_aufraeumen before update on public.wartungsvertraege
  for each row execute function intern.wartung_termin_aufraeumen();

/** Platzhalter {name} … in einem Text ersetzen. */
create or replace function intern.wartung_fuelle(p_text text, p_werte jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v text := p_text;
  k text;
begin
  for k in select jsonb_object_keys(p_werte) loop
    v := replace(v, '{' || k || '}', coalesce(p_werte ->> k, ''));
  end loop;
  return v;
end
$$;

/** Name für die Anrede: Vor- und Nachname, sonst Firma. */
create or replace function intern.wartung_kundenname(k public.kontakte) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma, '')
$$;

/** Ankündigung eines Termins in den Ausgangskorb (wartet auf Freigabe, Entscheid Chris: Mail, Freigabe per Klick). */
create or replace function intern.wartung_ankuendigung_anlegen(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  w public.wartungsvertraege;
  k public.kontakte;
  v_cfg jsonb := (select wert from public.einstellungen where schluessel = 'wartung_pakete');
  v_sprache text;
  v_vorlage jsonb;
  v_werte jsonb;
  v_id uuid;
begin
  select * into w from public.wartungsvertraege where id = p_id and geloescht_am is null for update;
  if not found or w.termin_von is null or w.angekuendigt_am is not null then return null; end if;
  select * into k from public.kontakte where id = w.kontakt_id;
  if nullif(trim(k.email), '') is null then return null; end if;
  v_sprache := coalesce(w.sprache, k.sprache, 'de');
  v_vorlage := v_cfg -> 'ankuendigung' -> v_sprache;
  v_werte := jsonb_build_object(
    'name', intern.wartung_kundenname(k), 'nummer', coalesce(w.nummer, ''),
    'paket', coalesce((select p ->> 'name' from jsonb_array_elements(v_cfg -> 'pakete') p where p ->> 'id' = w.paket), ''),
    'datum', to_char(w.termin_von at time zone 'Europe/Zurich', 'DD.MM.YYYY'),
    'zeit', to_char(w.termin_von at time zone 'Europe/Zurich', 'HH24:MI') || '–'
            || to_char(w.termin_bis at time zone 'Europe/Zurich', 'HH24:MI'),
    'person', coalesce((select split_part(name, ' ', 1) from public.personen where id = w.termin_person_id), ''));
  insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, sprache, kontakt_id, projekt_id,
                                   bezug_tabelle, bezug_id, schluessel, status)
  values ('mail', 'wartung_ankuendigung', k.email, intern.wartung_fuelle(v_vorlage ->> 'betreff', v_werte),
          intern.wartung_fuelle(v_vorlage ->> 'text', v_werte), coalesce(w.termin_geplant_von, w.termin_person_id),
          v_sprache, w.kontakt_id, w.projekt_id, 'wartungsvertraege', w.id,
          'wartung-ankuendigung-' || w.id || '-' || to_char(w.termin_von at time zone 'Europe/Zurich', 'YYYYMMDD'), 'wartet')
  on conflict do nothing
  returning id into v_id;
  update public.wartungsvertraege set angekuendigt_am = now() where id = w.id;
  return v_id;
end
$$;
revoke execute on function intern.wartung_ankuendigung_anlegen(uuid) from public, anon, authenticated;

/** «Jetzt ankündigen» von Hand (statt auf den Zeitplan zu warten). */
create or replace function public.wartung_ankuendigen(p_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.wartungsvertraege where id = p_id and termin_von is not null and geloescht_am is null) then
    raise exception using errcode = 'P0001', message = 'wartung.kein_termin';
  end if;
  if (select k.email from public.wartungsvertraege w join public.kontakte k on k.id = w.kontakt_id where w.id = p_id) is null then
    raise exception using errcode = 'P0001', message = 'wartung.keine_mail';
  end if;
  v_id := intern.wartung_ankuendigung_anlegen(p_id);
  return v_id;
end
$$;

/** Zeitplan (stündlich): Ankündigungen für Termine in den nächsten 14 Tagen (ankuendigung_tage), einmal pro Termin. */
create or replace function public.wartung_ankuendigungen() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_tage int := coalesce((select (wert -> 'bedingungen' ->> 'ankuendigung_tage')::int from public.einstellungen
                           where schluessel = 'wartung_pakete'), 14);
  v_n int := 0;
  r record;
begin
  for r in
    select id from public.wartungsvertraege
     where geloescht_am is null and status = 'aktiv' and angekuendigt_am is null
       and termin_von > now() and termin_von <= now() + make_interval(days => v_tage)
  loop
    if intern.wartung_ankuendigung_anlegen(r.id) is not null then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end
$$;
revoke execute on function public.wartung_ankuendigungen() from public, anon, authenticated;
grant execute on function public.wartung_ankuendigungen() to service_role;

-- Angebote an Kunden ohne Wartungsvertrag (Verlauf: wann, welches Paket, was daraus wurde).
create table if not exists public.wartung_angebote (
  id                 uuid primary key default gen_random_uuid(),
  anlage_id          uuid not null references public.anlagen (id),
  kontakt_id         uuid not null references public.kontakte (id),
  paket              text not null,
  preis_netto_rappen int,
  ausgang_id         uuid references public.ausgangskorb (id),
  gesendet_am        timestamptz not null default now(),
  stand              text not null default 'offen' check (stand in ('offen', 'angenommen', 'abgelehnt')),
  notiz              text
);
select intern.richte_fachtabelle_ein('wartung_angebote');
create index if not exists wartung_angebote_anlage_idx on public.wartung_angebote (anlage_id) where geloescht_am is null;

/**
 * Eigene Anlagen (mit Inbetriebnahme) ohne laufenden Wartungsvertrag, mit passendem Paket (Comfort, über 50 kWp
 * Premium), Tarif der Website und dem letzten Angebot.
 */
create or replace view public.wartung_ohne_vertrag with (security_invoker = true) as
select a.id as anlage_id, o.kontakt_id, intern.wartung_kundenname(k) as kunde, k.email, k.telefon,
       coalesce(k.sprache, 'de') as sprache, o.ort, o.plz, a.leistung_kwp, a.ibn_am, a.garantie_bis,
       p.id as projekt_id, p.nummer as projekt_nummer,
       case when coalesce(a.leistung_kwp, 0) > 50 then 'premium' else 'comfort' end as paket,
       public.wartung_tarif(case when coalesce(a.leistung_kwp, 0) > 50 then 'premium' else 'comfort' end, a.leistung_kwp)
         as tarif_rappen,
       g.gesendet_am as angebot_am, g.stand as angebot_stand, g.paket as angebot_paket
  from public.anlagen a
  join public.objekte o on o.id = a.objekt_id
  join public.kontakte k on k.id = o.kontakt_id and k.geloescht_am is null
  left join public.projekte p on p.id = a.projekt_id
  left join lateral (select x.gesendet_am, x.stand, x.paket from public.wartung_angebote x
                      where x.anlage_id = a.id and x.geloescht_am is null order by x.gesendet_am desc limit 1) g on true
 where a.geloescht_am is null and a.ibn_am is not null
   and not exists (select 1 from public.wartungsvertraege w
                    where w.geloescht_am is null and w.status in ('aktiv', 'gekuendigt')
                      and (w.anlage_id = a.id or (w.anlage_id is null and w.kontakt_id = o.kontakt_id)));
grant select on public.wartung_ohne_vertrag to authenticated;

/**
 * Angebot an eine oder mehrere Anlagen (Serie): je Anlage eine Mail in der Kundensprache mit passendem Paket, Preis
 * und Leistungen, über den Ausgangskorb (Klick = Freigabe). Ohne Mail-Adresse oder schon heute angeboten: übersprungen.
 * Gibt die Zahl der Angebote zurück.
 */
create or replace function public.wartung_angebot_senden(p_anlagen uuid[], p_paket text default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_cfg jsonb := (select wert from public.einstellungen where schluessel = 'wartung_pakete');
  r record;
  v_paket jsonb;
  v_preis int;
  v_vorlage jsonb;
  v_werte jsonb;
  v_ausgang uuid;
  v_n int := 0;
  -- Tag in der Schweiz, nicht der Datenbank (UTC): kurz nach Mitternacht wäre «heute» sonst noch gestern.
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  for r in select * from public.wartung_ohne_vertrag where anlage_id = any (p_anlagen) loop
    continue when nullif(trim(r.email), '') is null;
    continue when r.angebot_am is not null and (r.angebot_am at time zone 'Europe/Zurich')::date = v_heute;
    select p into v_paket from jsonb_array_elements(v_cfg -> 'pakete') p where p ->> 'id' = coalesce(p_paket, r.paket);
    if v_paket is null then raise exception using errcode = 'P0001', message = 'wartung.paket_unbekannt'; end if;
    v_preis := public.wartung_tarif(v_paket ->> 'id', r.leistung_kwp);
    continue when v_preis is null; -- über 100 kWp: Preis auf Anfrage, Offerte von Hand
    v_vorlage := v_cfg -> 'angebot' -> r.sprache;
    v_werte := jsonb_build_object(
      'name', r.kunde, 'paket', v_paket ->> 'name',
      'preis', to_char(v_preis / 100.0, 'FM999G990D00'),
      'kwp', trim(to_char(r.leistung_kwp, 'FM9990.0')),
      'ibn', to_char(r.ibn_am, 'MM.YYYY'),
      'leistungen', (select string_agg('– ' || (l ->> r.sprache), E'\n') from jsonb_array_elements(v_paket -> 'leistungen') l));
    v_ausgang := public.ausgang_anlegen(jsonb_build_object(
      'kanal', 'mail', 'art', 'wartung_angebot', 'an', r.email, 'sprache', r.sprache, 'kontakt_id', r.kontakt_id,
      'projekt_id', r.projekt_id, 'bezug_tabelle', 'anlagen', 'bezug_id', r.anlage_id,
      'schluessel', 'wartung-angebot-' || r.anlage_id || '-' || to_char(v_heute, 'YYYYMMDD'),
      'betreff', intern.wartung_fuelle(v_vorlage ->> 'betreff', v_werte),
      'text', intern.wartung_fuelle(v_vorlage ->> 'text', v_werte),
      'freigeben', true));
    insert into public.wartung_angebote (anlage_id, kontakt_id, paket, preis_netto_rappen, ausgang_id)
    values (r.anlage_id, r.kontakt_id, v_paket ->> 'id', v_preis, v_ausgang);
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;

/** Was aus dem letzten Angebot einer Anlage wurde (angenommen / abgelehnt / offen). */
create or replace function public.wartung_angebot_stand(p_anlage uuid, p_stand text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.wartung_angebote set stand = p_stand
   where id = (select id from public.wartung_angebote where anlage_id = p_anlage and geloescht_am is null
                order by gesendet_am desc limit 1);
  if not found then raise exception using errcode = 'P0001', message = 'wartung.kein_angebot'; end if;
end
$$;

/**
 * Werte der letzten Inspektion (abgeschlossener Wartungs-Rapport des Vertrags), sonst der Inbetriebnahme, für den
 * Vergleich am Handy: {datum, quelle, werte}.
 */
create or replace function public.wartung_vorjahr(p_vertrag uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('datum', r.datum, 'quelle', 'wartung', 'werte', r.pruefpunkte)
       from public.rapporte r
      where r.wartungsvertrag_id = p_vertrag and r.art = 'wartung' and r.abgeschlossen_am is not null
        and r.geloescht_am is null
      order by r.datum desc limit 1),
    (select jsonb_build_object('datum', r.datum, 'quelle', 'ibn', 'werte', r.pruefpunkte)
       from public.wartungsvertraege w
       join public.rapporte r on r.projekt_id = w.projekt_id and r.art = 'ibn' and r.geloescht_am is null
      where w.id = p_vertrag
      order by r.datum desc limit 1))
$$;

-- Mein Tag am Handy: Stand aus 20261114027384_mein_tag_ueberfaellig, dazu die geplanten Inspektionen der Person.
create or replace function public.mein_tag(p_von date, p_bis date, p_person uuid default null)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_person uuid := intern.meine_person_id();
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  if p_person is not null and p_person is distinct from v_person then
    if not intern.hat_recht('preise') then
      raise exception using errcode = 'P0001', message = 'baustelle.fremde_person';
    end if;
    v_person := p_person;
  end if;
  return jsonb_build_object(
    'person_id', v_person,
    'laufend', (select jsonb_build_object('id', z.id, 'start', z.start, 'rapport_id', z.rapport_id, 'projekt_id', z.projekt_id, 'art', z.art)
                  from public.zeiten z where z.person_id = v_person and z.stopp is null and z.geloescht_am is null limit 1),
    'eintraege', coalesce((
      select jsonb_agg(e order by e ->> 'von', e ->> 'zeit') from (
        select jsonb_build_object(
          'typ', 'einsatz', 'id', es.id, 'von', es.von, 'bis', es.bis, 'zeit', null, 'notiz', es.notiz,
          'projekt', jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel, 'bau_status', p.bau_status,
                                        'elektriker', p.elektriker),
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', (select coalesce(jsonb_agg(t.name order by t.name), '[]') from public.personen t where t.id = any (es.personen)),
          'material', (select jsonb_build_object('zeilen', count(*), 'fehlt', count(*) filter (where m.fehlt > 0))
                         from public.projekt_material_stand m where m.projekt_id = p.id),
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.projekt_id = p.id and r.geloescht_am is null
                          and r.service_fall_id is null and r.datum between es.von and es.bis)) as e
          from public.einsaetze es
          join public.projekte p on p.id = es.projekt_id and p.geloescht_am is null
          left join public.kontakte k on k.id = p.kontakt_id
          left join public.objekte o on o.id = p.objekt_id
         where es.geloescht_am is null and es.art <> 'geplant'
           and es.von <= p_bis and es.bis >= p_von and v_person = any (es.personen)
        union all
        select jsonb_build_object(
          'typ', 'service', 'id', f.id, 'von', case when u.ueberfaellig then v_heute else u.termin_tag end,
          'bis', case when u.ueberfaellig then v_heute else u.termin_tag end,
          'ueberfaellig', u.ueberfaellig, 'termin_tag', u.termin_tag,
          'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', f.beschreibung,
          'service', jsonb_build_object('id', f.id, 'nummer', f.nummer, 'titel', f.titel, 'garantie', f.garantie,
                                        'prioritaet', f.prioritaet, 'kategorie', f.kategorie, 'auswirkung', f.auswirkung,
                                        'komponente', f.komponente, 'fehlercode', f.fehlercode, 'dauer_minuten', f.dauer_minuten,
                                        'vor_ort_name', f.vor_ort_name, 'vor_ort_telefon', f.vor_ort_telefon, 'zugang', f.zugang,
                                        'checkliste', f.checkliste,
                                        'angekommen', exists (select 1 from jsonb_array_elements(f.verlauf) v
                                                               where v ->> 'art' = 'besuch'
                                                                 and (v ->> 'am')::timestamptz >= f.termin_am - interval '12 hours'),
                                        'anlage', case when a.id is null then null else jsonb_build_object(
                                          'id', a.id, 'leistung_kwp', a.leistung_kwp, 'komponenten', a.komponenten,
                                          'monitoring', a.monitoring) end),
          'projekt', case when p.id is null then null else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) end,
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', (select coalesce(jsonb_agg(t.name order by t.name), '[]') from public.personen t
                    where t.id = any (array_append(f.team, f.person_id))),
          'material', null,
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.service_fall_id = f.id and r.geloescht_am is null)) as e
          from public.service_faelle f
          left join public.anlagen a on a.id = f.anlage_id
          left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
          left join public.objekte o on o.id = coalesce(f.objekt_id, a.objekt_id, p.objekt_id)
          cross join lateral (select (f.termin_am at time zone 'Europe/Zurich')::date as termin_tag) d
          -- Überfällig nur, wenn heute im gefragten Zeitraum liegt: dann gehört der Fall auf heute.
          cross join lateral (select d.termin_tag < v_heute and v_heute between p_von and p_bis as ueberfaellig, d.termin_tag) u
         where f.geloescht_am is null and f.status <> 'erledigt' and (f.person_id = v_person or v_person = any (f.team))
           and (u.ueberfaellig or u.termin_tag between p_von and p_bis)
        union all
        -- Inspektion aus einem Wartungsvertrag (Termin in der Wartung geplant), Rapport-Art «wartung».
        select jsonb_build_object(
          'typ', 'wartung', 'id', w.id, 'von', (w.termin_von at time zone 'Europe/Zurich')::date,
          'bis', (w.termin_von at time zone 'Europe/Zurich')::date,
          'zeit', to_char(w.termin_von at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', w.notiz,
          'wartung', jsonb_build_object('id', w.id, 'nummer', w.nummer, 'paket', w.paket, 'kwp', w.anlage_kwp,
                                        'bis', to_char(w.termin_bis at time zone 'Europe/Zurich', 'HH24:MI')),
          'projekt', case when p.id is null then null else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) end,
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', coalesce(w.anlage_ort, o.ort),
                                        'breite', o.breite, 'laenge', o.laenge),
          'team', '[]'::jsonb,
          'material', null,
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.wartungsvertrag_id = w.id and r.geloescht_am is null
                          and r.datum = (w.termin_von at time zone 'Europe/Zurich')::date)) as e
          from public.wartungsvertraege w
          left join public.anlagen a on a.id = w.anlage_id
          left join public.projekte p on p.id = coalesce(w.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = w.kontakt_id
          -- Adresse der Anlage oder des Projekts; alte Verträge ohne Anlage: erstes Objekt des Kunden.
          left join lateral (select x.* from public.objekte x
                              where x.geloescht_am is null
                                and (x.id = coalesce(a.objekt_id, p.objekt_id)
                                     or (coalesce(a.objekt_id, p.objekt_id) is null and x.kontakt_id = w.kontakt_id))
                              order by x.id = coalesce(a.objekt_id, p.objekt_id) desc nulls last, x.erstellt_am limit 1) o on true
         where w.geloescht_am is null and w.status = 'aktiv' and w.termin_person_id = v_person
           and (w.termin_von at time zone 'Europe/Zurich')::date between p_von and p_bis
      ) x(e)), '[]'));
end
$$;

revoke execute on function public.wartung_termin_setzen(uuid, timestamptz, timestamptz, uuid) from public, anon;
revoke execute on function public.wartung_ankuendigen(uuid) from public, anon;
revoke execute on function public.wartung_angebot_senden(uuid[], text) from public, anon;
revoke execute on function public.wartung_angebot_stand(uuid, text) from public, anon;
revoke execute on function public.wartung_vorjahr(uuid) from public, anon;
grant execute on function public.wartung_termin_setzen(uuid, timestamptz, timestamptz, uuid), public.wartung_ankuendigen(uuid),
  public.wartung_angebot_senden(uuid[], text), public.wartung_angebot_stand(uuid, text), public.wartung_vorjahr(uuid)
  to authenticated;
