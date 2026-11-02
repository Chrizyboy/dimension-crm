-- Service & Garantie neu (2.11.2026, Chris: «zu einfach, soll das Arbeitsgerät werden»), Schritt 1.
-- Ein Fall weiss jetzt, woher er kommt (Website, Mail, Anruf …), wie schlimm es ist (Anlage steht?), bis wann
-- reagiert werden muss, wo der Einsatz ist und wer vor Ort öffnet. Dazu eine Checkliste je Kategorie, Verlauf
-- mit Art (Anruf, Mail, SMS …) und der Eingang aus dem Störungsformular der Website (service_aus_website).
-- Regeln, Reaktionszeiten und Checklisten sind Daten in einstellungen.service (CLAUDE.md Regel 8).

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe) values
  ('servicequelle', 'hand', 'Von Hand', 'Saisie manuelle', 10, null),
  ('servicequelle', 'anruf', 'Anruf', 'Appel', 20, null),
  ('servicequelle', 'mail', 'Mail', 'E-mail', 30, null),
  ('servicequelle', 'website', 'Website-Formular', 'Formulaire du site', 40, null),
  ('servicequelle', 'monitoring', 'Monitoring', 'Monitoring', 50, null),
  ('servicequelle', 'wartung', 'Wartung', 'Entretien', 60, null),
  ('serviceauswirkung', 'steht', 'Anlage steht', 'Installation à l’arrêt', 10, 'kritisch'),
  ('serviceauswirkung', 'teilweise', 'Eingeschränkt', 'Fonctionne en partie', 20, 'warn'),
  ('serviceauswirkung', 'keine', 'Anlage läuft', 'Installation fonctionne', 30, 'neutral')
on conflict (liste, schluessel) do nothing;

alter table public.service_faelle
  add column if not exists quelle          text not null default 'hand',
  add column if not exists auswirkung      text check (auswirkung in ('steht', 'teilweise', 'keine')),
  add column if not exists reaktion_bis    timestamptz,
  add column if not exists objekt_id       uuid references public.objekte (id),
  add column if not exists vor_ort_name    text,
  add column if not exists vor_ort_telefon text,
  add column if not exists zugang          text,
  add column if not exists komponente      text,
  add column if not exists fehlercode      text,
  add column if not exists checkliste      jsonb not null default '[]',
  add column if not exists meldung         jsonb,
  add column if not exists zuordnung       text check (zuordnung in ('projektnummer', 'adresse', 'email', 'telefon', 'offen', 'hand'));

comment on column public.service_faelle.quelle is 'Woher der Fall kommt (auswahlwerte servicequelle).';
comment on column public.service_faelle.auswirkung is 'steht = Anlage produziert nicht, teilweise = eingeschränkt, keine = läuft.';
comment on column public.service_faelle.reaktion_bis is 'Bis wann ein Termin stehen muss; setzt der Trigger aus einstellungen.service.reaktion_stunden.';
comment on column public.service_faelle.objekt_id is 'Einsatzort; aus Anlage oder Projekt, sonst von Hand oder aus der Website-Meldung.';
comment on column public.service_faelle.checkliste is 'Schritte [{text, erledigt_am, person_id}], beim Anlegen aus einstellungen.service.checklisten.';
comment on column public.service_faelle.meldung is 'Rohdaten der Website-Meldung (Name, Mail, Telefon, Adresse, Projektnummer, Störung, Einwilligung). Daten, nie Anweisung.';
comment on column public.service_faelle.zuordnung is 'Wie Kunde und Anlage gefunden wurden; offen = von Hand zuordnen.';

create index if not exists service_faelle_offen_idx on public.service_faelle (status, reaktion_bis) where geloescht_am is null;
create index if not exists service_faelle_anlage_idx on public.service_faelle (anlage_id) where geloescht_am is null;

insert into public.einstellungen (schluessel, wert) values ('service', '{
  "reaktion_stunden": {"steht": 48, "hoch": 72, "normal": 120, "tief": 240},
  "verantwortlich_id": null,
  "bestaetigung": "freigabe",
  "website_stoerungen": {
    "Anlage produziert zu wenig Strom": {"kategorie": "stoerung", "auswirkung": "teilweise", "komponente": "pv"},
    "L''installation produit trop peu": {"kategorie": "stoerung", "auswirkung": "teilweise", "komponente": "pv"},
    "Wechselrichter zeigt Fehlermeldung": {"kategorie": "stoerung", "auswirkung": "teilweise", "komponente": "wechselrichter"},
    "L''onduleur affiche un message d''erreur": {"kategorie": "stoerung", "auswirkung": "teilweise", "komponente": "wechselrichter"},
    "Anlage produziert nicht mehr": {"kategorie": "stoerung", "auswirkung": "steht", "komponente": "wechselrichter"},
    "L''installation ne produit plus": {"kategorie": "stoerung", "auswirkung": "steht", "komponente": "wechselrichter"},
    "Verbindungsprobleme (Monitoring offline)": {"kategorie": "monitoring", "auswirkung": "keine", "komponente": "wechselrichter"},
    "Problèmes de connexion (monitoring hors ligne)": {"kategorie": "monitoring", "auswirkung": "keine", "komponente": "wechselrichter"},
    "Physische Schäden an der Anlage": {"kategorie": "reklamation", "auswirkung": "teilweise", "komponente": "pv"},
    "Dommages physiques à l''installation": {"kategorie": "reklamation", "auswirkung": "teilweise", "komponente": "pv"},
    "Anlage verschmutzt": {"kategorie": "wartung", "auswirkung": "keine", "komponente": "pv"},
    "Installation encrassée": {"kategorie": "wartung", "auswirkung": "keine", "komponente": "pv"}
  },
  "checklisten": {
    "stoerung": [
      {"de": "Fehlercode, Fotos und Zeitpunkt beim Kunden erfragen", "fr": "Demander code d’erreur, photos et depuis quand"},
      {"de": "Ferndiagnose im Monitoring", "fr": "Diagnostic à distance via le monitoring"},
      {"de": "Garantie geprüft und dem Kunden gesagt, was er zahlt", "fr": "Garantie vérifiée, coûts communiqués au client"},
      {"de": "Material und Ersatzteile bereit", "fr": "Matériel et pièces prêts"},
      {"de": "Vor Ort: Messung, Seriennummer alt/neu, Fotos", "fr": "Sur place : mesure, n° de série ancien/nouveau, photos"},
      {"de": "Funktionstest, Anlage läuft, Kunde informiert", "fr": "Test de fonctionnement, client informé"}
    ],
    "garantie": [
      {"de": "Seriennummer und Kaufdatum festhalten", "fr": "Relever n° de série et date d’achat"},
      {"de": "Beim Hersteller melden, RMA-Nummer erhalten", "fr": "Annoncer au fabricant, obtenir le n° RMA"},
      {"de": "Ersatzgerät bestellt oder erhalten", "fr": "Appareil de remplacement commandé ou reçu"},
      {"de": "Tausch vor Ort, Fotos, Funktionstest", "fr": "Échange sur place, photos, test"},
      {"de": "Altgerät zurück, Gutschrift geprüft", "fr": "Ancien appareil retourné, avoir vérifié"}
    ],
    "reklamation": [
      {"de": "Schaden mit Fotos dokumentieren", "fr": "Documenter le dommage avec photos"},
      {"de": "Ursache klären (Montage, Hersteller, Dritte, Wetter)", "fr": "Clarifier la cause (montage, fabricant, tiers, météo)"},
      {"de": "Versicherung oder Hersteller informieren, falls nötig", "fr": "Informer l’assurance ou le fabricant si nécessaire"},
      {"de": "Behebung geplant und Kunde informiert", "fr": "Réparation planifiée, client informé"}
    ],
    "wartung": [
      {"de": "Termin mit Kunde vereinbart", "fr": "Rendez-vous fixé avec le client"},
      {"de": "Kontrolle nach Leistungskatalog", "fr": "Contrôle selon le catalogue de prestations"},
      {"de": "Rapport mit Fotos und Empfehlungen", "fr": "Rapport avec photos et recommandations"}
    ],
    "monitoring": [
      {"de": "Internet und Router beim Kunden prüfen lassen", "fr": "Faire vérifier internet et routeur chez le client"},
      {"de": "Gerät im Portal neu verbinden", "fr": "Reconnecter l’appareil dans le portail"},
      {"de": "Daten kommen wieder an", "fr": "Les données arrivent à nouveau"}
    ]
  }
}') on conflict (schluessel) do nothing;

/** Service-Einstellungen ändern nur Administration (eigener Trigger, damit intern.einstellung_schuetzen unberührt bleibt). */
create or replace function intern.service_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'service.kein_recht';
  end if;
  return new;
end
$$;
create trigger service_schuetzen before insert or update on public.einstellungen
  for each row when (new.schluessel = 'service') execute function intern.service_einstellung_schuetzen();

/** Garantie läuft am Tag p_am für die Anlage (Montage) oder eine Komponente der gleichen Art? */
create or replace function intern.service_garantie_laeuft(p_anlage uuid, p_komponente text, p_am date default current_date)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select a.garantie_bis >= p_am
        or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(a.komponenten) = 'array' then a.komponenten else '[]' end) k
                    where nullif(k ->> 'garantie_bis', '') is not null and (k ->> 'garantie_bis')::date >= p_am
                      and (p_komponente is null or k ->> 'art' = p_komponente))
      from public.anlagen a where a.id = p_anlage and a.geloescht_am is null), false)
$$;

/**
 * Ergänzt einen Fall: Projekt und Einsatzort aus der Anlage, Kunde aus dem Einsatzort, Reaktionszeit aus
 * Auswirkung/Priorität, Checkliste der Kategorie beim Anlegen, Garantie automatisch, wenn nichts angegeben ist.
 */
create or replace function intern.service_fall_ergaenzen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'service'), '{}');
  v_std int;
begin
  if new.anlage_id is not null and (tg_op = 'INSERT' or new.anlage_id is distinct from old.anlage_id) then
    select coalesce(new.projekt_id, a.projekt_id), coalesce(new.objekt_id, a.objekt_id)
      into new.projekt_id, new.objekt_id from public.anlagen a where a.id = new.anlage_id;
  end if;
  if new.objekt_id is null and new.projekt_id is not null then
    select p.objekt_id into new.objekt_id from public.projekte p where p.id = new.projekt_id;
  end if;
  if new.kontakt_id is null and new.objekt_id is not null then
    select o.kontakt_id into new.kontakt_id from public.objekte o where o.id = new.objekt_id;
  end if;
  if new.auswirkung = 'steht' and coalesce(new.prioritaet, 'normal') <> 'hoch' and tg_op = 'INSERT' then
    new.prioritaet := 'hoch';
  end if;
  if tg_op = 'INSERT' or new.prioritaet is distinct from old.prioritaet or new.auswirkung is distinct from old.auswirkung then
    v_std := coalesce((cfg -> 'reaktion_stunden' ->> case when new.auswirkung = 'steht' then 'steht' else coalesce(new.prioritaet, 'normal') end)::int, 120);
    new.reaktion_bis := coalesce(case when tg_op = 'INSERT' then new.erstellt_am else old.erstellt_am end, now()) + make_interval(hours => v_std);
  end if;
  if tg_op = 'INSERT' and jsonb_array_length(coalesce(new.checkliste, '[]')) = 0 then
    new.checkliste := coalesce((select jsonb_agg(jsonb_build_object('de', c ->> 'de', 'fr', c ->> 'fr', 'erledigt_am', null, 'person_id', null))
                                  from jsonb_array_elements(cfg -> 'checklisten' -> coalesce(new.kategorie, 'stoerung')) c), '[]');
  end if;
  if tg_op = 'INSERT' and new.garantie is null and new.anlage_id is not null then
    new.garantie := intern.service_garantie_laeuft(new.anlage_id, new.komponente);
  end if;
  return new;
end
$$;
create trigger ergaenzen before insert or update on public.service_faelle
  for each row execute function intern.service_fall_ergaenzen();

/** Eintrag im Verlauf mit Art (notiz, anruf, mail, sms), Datum und Person. */
create or replace function public.service_eintrag(p_id uuid, p_art text, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'service.notiz_leer'; end if;
  if p_art not in ('notiz', 'anruf', 'mail', 'sms') then raise exception using errcode = 'P0001', message = 'service.art'; end if;
  update public.service_faelle
     set verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(),
                                                                  'art', p_art, 'text', trim(p_text)))
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/** Schritt der Checkliste abhaken oder zurücknehmen (Position ab 0). */
create or replace function public.service_checkliste(p_id uuid, p_nr int, p_erledigt boolean) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.service_faelle
     set checkliste = jsonb_set(checkliste, array[p_nr::text],
                                (checkliste -> p_nr) || case when p_erledigt
                                  then jsonb_build_object('erledigt_am', now(), 'person_id', intern.meine_person_id())
                                  else jsonb_build_object('erledigt_am', null, 'person_id', null) end)
   where id = p_id and geloescht_am is null and p_nr >= 0 and p_nr < jsonb_array_length(checkliste);
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/** Eigenen Schritt an die Checkliste anhängen. */
create or replace function public.service_checkliste_dazu(p_id uuid, p_text text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'service.notiz_leer'; end if;
  update public.service_faelle
     set checkliste = checkliste || jsonb_build_array(jsonb_build_object('de', trim(p_text), 'fr', trim(p_text),
                                                                         'erledigt_am', null, 'person_id', null))
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/** Text für den Vergleich von Adressen: klein, ohne Akzente, Satzzeichen und «strasse/str.». */
create or replace function intern.service_adresse_text(p text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(regexp_replace(translate(lower(coalesce(p, '')), 'äöüéèêàâîôûç', 'aoueeeaaiouc'),
                                       '(strasse|str\.?|rue|route|chemin|ch\.)', '', 'g'), '[^a-z0-9]', '', 'g')
$$;

/**
 * Kunde, Einsatzort, Projekt und Anlage zu einer Meldung finden: zuerst die Projektnummer, dann die Adresse
 * (PLZ und Strasse mit Nummer), dann Mail und Telefon. Gibt {art, kontakt_id, objekt_id, projekt_id, anlage_id}.
 */
create or replace function intern.service_zuordnen(p_projekt text, p_adresse text, p_email text, p_telefon text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_nr text := nullif(regexp_replace(coalesce(p_projekt, ''), '\D', '', 'g'), '');
  v_plz text := substring(coalesce(p_adresse, '') from '\m(\d{4})\M');
  v_strasse text;
  v_tel text := right(regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g'), 9);
  r record;
begin
  if v_nr is not null then
    select p.id as projekt_id, p.kontakt_id, p.objekt_id into r from public.projekte p
     where regexp_replace(p.nummer, '\D', '', 'g') = v_nr and p.geloescht_am is null order by p.erstellt_am desc limit 1;
    if found then
      return jsonb_build_object('art', 'projektnummer', 'projekt_id', r.projekt_id, 'kontakt_id', r.kontakt_id, 'objekt_id', r.objekt_id,
        'anlage_id', (select a.id from public.anlagen a where a.projekt_id = r.projekt_id and a.geloescht_am is null limit 1));
    end if;
  end if;
  if v_plz is not null then
    -- Strasse mit Hausnummer: alles vor der PLZ, ohne Komma.
    v_strasse := intern.service_adresse_text(split_part(split_part(p_adresse, v_plz, 1), ',', 1));
    if length(v_strasse) >= 4 then
      select o.id as objekt_id, o.kontakt_id into r from public.objekte o
       where o.plz = v_plz and o.geloescht_am is null and intern.service_adresse_text(o.strasse) = v_strasse
       order by (select count(*) from public.anlagen a where a.objekt_id = o.id and a.geloescht_am is null) desc, o.erstellt_am desc
       limit 1;
      if found then
        return jsonb_build_object('art', 'adresse', 'kontakt_id', r.kontakt_id, 'objekt_id', r.objekt_id,
          'anlage_id', (select a.id from public.anlagen a where a.objekt_id = r.objekt_id and a.geloescht_am is null order by a.ibn_am desc nulls last limit 1),
          'projekt_id', (select p.id from public.projekte p where p.objekt_id = r.objekt_id and p.geloescht_am is null order by p.erstellt_am desc limit 1));
      end if;
    end if;
  end if;
  if nullif(trim(p_email), '') is not null then
    select k.id into r from public.kontakte k where lower(k.email) = lower(trim(p_email)) and k.geloescht_am is null limit 1;
    if found then return jsonb_build_object('art', 'email', 'kontakt_id', r.id); end if;
  end if;
  if length(v_tel) = 9 then
    select k.id into r from public.kontakte k
     where right(regexp_replace(coalesce(k.telefon, ''), '\D', '', 'g'), 9) = v_tel and k.geloescht_am is null limit 1;
    if found then return jsonb_build_object('art', 'telefon', 'kontakt_id', r.id); end if;
  end if;
  return jsonb_build_object('art', 'offen');
end
$$;

/**
 * Neue Störungsmeldung aus dem Formular der Website (Edge Function «stoerung», nur mit Dienstschlüssel).
 * Legt einen Fall an, ordnet Kunde und Anlage zu, meldet es der verantwortlichen Person (Glocke) und bereitet
 * die Eingangsbestätigung im Ausgangskorb vor (mit Freigabe, ausser einstellungen.service.bestaetigung =
 * «automatisch»). Gleiche Meldung (gleicher idempotency_key) nur einmal. Gibt {id, nummer, doppelt}.
 */
create or replace function public.service_aus_website(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'service'), '{}');
  v_schluessel text := nullif(left(trim(p ->> 'idempotency_key'), 100), '');
  v_sprache text := case when p ->> 'lang' = 'fr' then 'fr' else 'de' end;
  v_stoerung text := left(nullif(trim(p ->> 'problem'), ''), 200);
  v_art jsonb := coalesce(cfg -> 'website_stoerungen' -> v_stoerung, '{}');
  v_zu jsonb;
  v_person uuid := nullif(cfg ->> 'verantwortlich_id', '')::uuid;
  v_fall public.service_faelle;
  v_email text := lower(nullif(trim(p ->> 'email'), ''));
  v_name text := left(nullif(trim(p ->> 'name'), ''), 200);
  v_titel text;
begin
  if v_name is null or v_email is null or nullif(trim(p ->> 'address'), '') is null or v_stoerung is null then
    raise exception using errcode = 'P0001', message = 'service.meldung_unvollstaendig';
  end if;
  if coalesce((p ->> 'consent')::boolean, false) is not true then
    raise exception using errcode = 'P0001', message = 'service.einwilligung_fehlt';
  end if;
  if v_schluessel is not null then
    select * into v_fall from public.service_faelle where meldung ->> 'idempotency_key' = v_schluessel and geloescht_am is null limit 1;
    if found then return jsonb_build_object('id', v_fall.id, 'nummer', v_fall.nummer, 'doppelt', true); end if;
  end if;

  v_zu := intern.service_zuordnen(p ->> 'project', p ->> 'address', v_email, p ->> 'phone');
  if v_person is null or not exists (select 1 from public.personen x where x.id = v_person and x.aktiv and x.geloescht_am is null) then
    v_person := null;
  end if;
  v_titel := left(v_stoerung || coalesce(' · ' || nullif(trim(p ->> 'address'), ''), ''), 200);

  insert into public.service_faelle (nummer, titel, beschreibung, kategorie, prioritaet, status, quelle, auswirkung, komponente,
    kontakt_id, objekt_id, projekt_id, anlage_id, person_id, vor_ort_name, vor_ort_telefon, zuordnung, meldung, verlauf)
  values ('', v_titel, left(nullif(trim(p ->> 'message'), ''), 5000), coalesce(v_art ->> 'kategorie', 'stoerung'), 'normal', 'neu',
    'website', v_art ->> 'auswirkung', v_art ->> 'komponente',
    (v_zu ->> 'kontakt_id')::uuid, (v_zu ->> 'objekt_id')::uuid, (v_zu ->> 'projekt_id')::uuid, (v_zu ->> 'anlage_id')::uuid,
    v_person, v_name, left(nullif(trim(p ->> 'phone'), ''), 40), v_zu ->> 'art',
    jsonb_build_object('name', v_name, 'email', v_email, 'telefon', left(p ->> 'phone', 40), 'adresse', left(p ->> 'address', 300),
                       'projekt', left(p ->> 'project', 40), 'stoerung', v_stoerung, 'text', left(p ->> 'message', 5000),
                       'einwilligung', left(p ->> 'consentText', 1000), 'einwilligung_version', left(p ->> 'consentVersion', 40),
                       'sprache', v_sprache, 'seite', left(p ->> 'page', 300), 'idempotency_key', v_schluessel, 'am', now()),
    jsonb_build_array(jsonb_build_object('am', now(), 'person_id', null, 'art', 'system',
      'text', case v_zu ->> 'art'
        when 'projektnummer' then 'Störungsmeldung von der Website. Kunde und Anlage über die Projektnummer erkannt.'
        when 'adresse' then 'Störungsmeldung von der Website. Kunde und Anlage über die Adresse erkannt.'
        when 'email' then 'Störungsmeldung von der Website. Kunde über die Mail erkannt, Anlage bitte prüfen.'
        when 'telefon' then 'Störungsmeldung von der Website. Kunde über die Telefonnummer erkannt, Anlage bitte prüfen.'
        else 'Störungsmeldung von der Website. Kein Kunde gefunden: bitte zuordnen oder neu anlegen.' end)))
  returning * into v_fall;

  -- Glocke: verantwortliche Person, sonst alle mit Recht admin.
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x.id, case when v_fall.auswirkung = 'steht' then 'warnung' else 'info' end,
         'Neue Störung ' || v_fall.nummer || ': ' || v_stoerung, 'Nouvelle panne ' || v_fall.nummer || ' : ' || v_stoerung,
         v_name || ' · ' || coalesce(p ->> 'address', ''), v_name || ' · ' || coalesce(p ->> 'address', ''),
         '/aftersales?fall=' || v_fall.id
    from public.personen x
    left join public.rollen ro on ro.schluessel = x.rolle
   where x.aktiv and x.geloescht_am is null
     and (x.id = v_person or (v_person is null and ('admin' = any (x.rechte) or 'admin' = any (coalesce(ro.rechte, '{}')))));

  -- Eingangsbestätigung in der Sprache des Formulars, aus dem Postfach der verantwortlichen Person.
  if v_person is not null then
    insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, sprache, kontakt_id, projekt_id,
      bezug_tabelle, bezug_id, schluessel, status, automatisch, freigegeben_am)
    values ('mail', 'service_bestaetigung', v_email,
      case v_sprache when 'fr' then 'Votre annonce de panne ' || v_fall.nummer else 'Ihre Störungsmeldung ' || v_fall.nummer end,
      case v_sprache
        when 'fr' then 'Bonjour ' || v_name || E',\n\nNous avons bien reçu votre annonce « ' || v_stoerung || ' » (n° ' || v_fall.nummer
          || E'). Nous vous contactons rapidement pour la suite.\n\nMeilleures salutations\nDimension Solaire'
        else 'Guten Tag ' || v_name || E'\n\nWir haben Ihre Meldung «' || v_stoerung || '» erhalten (Nr. ' || v_fall.nummer
          || E'). Wir melden uns so rasch wie möglich bei Ihnen.\n\nFreundliche Grüsse\nDimension Solaire' end,
      v_person, v_sprache, v_fall.kontakt_id, v_fall.projekt_id, 'service_faelle', v_fall.id, 'service_bestaetigung:' || v_fall.id,
      case when cfg ->> 'bestaetigung' = 'automatisch' then 'freigegeben' else 'wartet' end,
      cfg ->> 'bestaetigung' = 'automatisch', case when cfg ->> 'bestaetigung' = 'automatisch' then now() end);
  end if;

  return jsonb_build_object('id', v_fall.id, 'nummer', v_fall.nummer, 'doppelt', false, 'zuordnung', v_zu ->> 'art');
end
$$;
revoke all on function public.service_aus_website(jsonb) from public, anon, authenticated;
grant execute on function public.service_aus_website(jsonb) to service_role;
revoke all on function intern.service_zuordnen(text, text, text, text) from public, anon;

/** Kunde, Einsatzort und Anlage eines Falls nachträglich zuordnen (z. B. nach einer Website-Meldung ohne Treffer). */
create or replace function public.service_zuordnen(p_id uuid, p_kontakt uuid, p_objekt uuid default null, p_anlage uuid default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.service_faelle
     set kontakt_id = p_kontakt,
         objekt_id = coalesce(p_objekt, (select a.objekt_id from public.anlagen a where a.id = p_anlage), objekt_id),
         anlage_id = coalesce(p_anlage, anlage_id),
         zuordnung = 'hand',
         verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(), 'art', 'system',
                                                                  'text', 'Kunde zugeordnet'))
   where id = p_id and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'service.nicht_gefunden'; end if;
end
$$;

/**
 * Kunde aus einer Website-Meldung neu anlegen (Name, Mail, Telefon, Sprache, Adresse als Objekt) und dem Fall
 * zuordnen. Gibt die Kontakt-ID.
 */
create or replace function public.service_kunde_aus_meldung(p_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  m jsonb;
  v_kontakt uuid;
  v_objekt uuid;
  v_plz text;
  v_vor text;
  v_nach text;
begin
  select meldung into m from public.service_faelle where id = p_id and geloescht_am is null;
  if m is null then raise exception using errcode = 'P0001', message = 'service.keine_meldung'; end if;
  v_nach := regexp_replace(trim(m ->> 'name'), '^.*\s', '');
  v_vor := nullif(trim(left(trim(m ->> 'name'), length(trim(m ->> 'name')) - length(v_nach))), '');
  insert into public.kontakte (vorname, nachname, email, telefon, sprache)
  values (v_vor, v_nach, m ->> 'email', m ->> 'telefon', coalesce(m ->> 'sprache', 'de'))
  returning id into v_kontakt;
  v_plz := substring(coalesce(m ->> 'adresse', '') from '\m(\d{4})\M');
  insert into public.objekte (kontakt_id, strasse, plz, ort)
  values (v_kontakt, nullif(trim(split_part(split_part(m ->> 'adresse', coalesce(v_plz, '§'), 1), ',', 1)), ''), v_plz,
          nullif(trim(split_part(m ->> 'adresse', coalesce(v_plz, '§'), 2)), ''))
  returning id into v_objekt;
  perform public.service_zuordnen(p_id, v_kontakt, v_objekt, null);
  return v_kontakt;
end
$$;

-- «Mein Tag» am Handy: Einsatzort des Falls zuerst (auch ohne Anlage), Ansprechperson und Zugang in der Notiz.
create or replace function public.mein_tag(p_von date, p_bis date, p_person uuid default null)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_person uuid := intern.meine_person_id();
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
          'typ', 'service', 'id', f.id, 'von', (f.termin_am at time zone 'Europe/Zurich')::date,
          'bis', (f.termin_am at time zone 'Europe/Zurich')::date,
          'zeit', to_char(f.termin_am at time zone 'Europe/Zurich', 'HH24:MI'), 'notiz', concat_ws(E'\n', f.beschreibung, 'Vor Ort: ' || nullif(concat_ws(', ', f.vor_ort_name, f.vor_ort_telefon), ''), 'Zugang: ' || f.zugang),
          'service', jsonb_build_object('id', f.id, 'nummer', f.nummer, 'titel', f.titel, 'garantie', f.garantie,
                                        'prioritaet', f.prioritaet, 'kategorie', f.kategorie),
          'projekt', case when p.id is null then null else jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) end,
          'kunde', jsonb_build_object('name', coalesce(nullif(trim(coalesce(k.vorname, '') || ' ' || coalesce(k.nachname, '')), ''), k.firma),
                                      'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache),
          'adresse', jsonb_build_object('strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'breite', o.breite, 'laenge', o.laenge),
          'team', '[]'::jsonb,
          'material', null,
          'rapporte', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'art', r.art, 'datum', r.datum,
                                                                     'abgeschlossen_am', r.abgeschlossen_am) order by r.datum), '[]')
                         from public.rapporte r where r.service_fall_id = f.id and r.geloescht_am is null)) as e
          from public.service_faelle f
          left join public.anlagen a on a.id = f.anlage_id
          left join public.projekte p on p.id = coalesce(f.projekt_id, a.projekt_id)
          left join public.kontakte k on k.id = coalesce(f.kontakt_id, p.kontakt_id)
          left join public.objekte o on o.id = coalesce(f.objekt_id, a.objekt_id, p.objekt_id)
         where f.geloescht_am is null and f.status <> 'erledigt' and f.person_id = v_person
           and (f.termin_am at time zone 'Europe/Zurich')::date between p_von and p_bis
      ) x(e)), '[]'));
end
$$;

/** Text aus p, wenn das Feld mitgeschickt wurde, sonst der bisherige Wert (leer = null). */
create or replace function intern.feld(p jsonb, p_name text, p_alt text) returns text
language sql immutable as $$
  select case when p ? p_name then nullif(trim(p ->> p_name), '') else p_alt end
$$;


/**
 * Alles zur Fall-Akte in einer Abfrage (Rechte wie in der App): Kunde, Einsatzort, Anlage, Wartungsvertrag,
 * frühere Fälle, Rapporte, Rechnungen, zugeordnete Mails und offene Garantiefälle beim Hersteller.
 */
create or replace function public.service_akte(p_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'kunde', (select jsonb_build_object('id', k.id, 'name', coalesce(nullif(k.firma, ''), nullif(trim(concat_ws(' ', k.vorname, k.nachname)), ''), '–'),
                                        'telefon', k.telefon, 'email', k.email, 'sprache', k.sprache, 'kundennummer', k.kundennummer)
                from public.kontakte k where k.id = f.kontakt_id),
    'ort', (select jsonb_build_object('id', o.id, 'strasse', o.strasse, 'plz', o.plz, 'ort', o.ort, 'netzbetreiber', o.netzbetreiber,
                                      'breite', o.breite, 'laenge', o.laenge)
              from public.objekte o where o.id = f.objekt_id),
    'anlage', (select jsonb_build_object('id', a.id, 'ibn_am', a.ibn_am, 'garantie_bis', a.garantie_bis, 'naechste_kontrolle', a.naechste_kontrolle,
                                         'leistung_kwp', a.leistung_kwp, 'komponenten', a.komponenten, 'monitoring', a.monitoring, 'notiz', a.notiz)
                 from public.anlagen a where a.id = f.anlage_id),
    'projekt', (select jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel) from public.projekte p where p.id = f.projekt_id),
    'vertrag', (select jsonb_build_object('id', w.id, 'nummer', w.nummer, 'naechste_wartung', w.naechste_wartung,
                                          'rhythmus_monate', w.rhythmus_monate, 'leistungen', w.leistungen)
                  from public.wartungsvertraege w
                 where w.geloescht_am is null and w.status = 'aktiv'
                   and (w.anlage_id = f.anlage_id or (w.anlage_id is null and w.kontakt_id = f.kontakt_id))
                 order by (w.anlage_id = f.anlage_id) desc nulls last limit 1),
    'fruehere', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nummer', x.nummer, 'titel', x.titel, 'status', x.status,
                                                               'erstellt_am', x.erstellt_am) order by x.erstellt_am desc)
                            from (select * from public.service_faelle x
                                   where x.id <> f.id and x.geloescht_am is null
                                     and ((f.anlage_id is not null and x.anlage_id = f.anlage_id) or (f.kontakt_id is not null and x.kontakt_id = f.kontakt_id))
                                   order by x.erstellt_am desc limit 10) x), '[]'),
    'rapporte', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nummer', r.nummer, 'datum', r.datum, 'art', r.art,
                                                               'verrechnung', r.verrechnung, 'arbeiten', r.arbeiten,
                                                               'abgeschlossen_am', r.abgeschlossen_am,
                                                               'person', (select pe.name from public.personen pe where pe.id = r.person_id),
                                                               'stunden', (select round(sum(extract(epoch from (coalesce(z.stopp, now()) - z.start)) / 3600)::numeric, 1)
                                                                             from public.zeiten z where z.rapport_id = r.id and z.geloescht_am is null))
                                           order by r.datum desc)
                            from public.rapporte r where r.service_fall_id = f.id and r.geloescht_am is null), '[]'),
    'rechnungen', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nummer', b.nummer, 'status', b.status, 'titel', b.titel,
                                                                 'total_rappen', b.total_rappen, 'bezahlt_rappen', b.bezahlt_rappen,
                                                                 'rapport_id', b.rapport_id, 'datum', b.datum) order by b.erstellt_am)
                              from public.rechnungen b
                             where b.geloescht_am is null and b.status <> 'storniert'
                               and (b.service_fall_id = f.id or b.rapport_id in (select r.id from public.rapporte r where r.service_fall_id = f.id))), '[]'),
    'mails', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'betreff', m.betreff, 'von_name', m.von_name, 'von_email', m.von_email,
                                                            'eingang_am', m.eingang_am, 'zusammenfassung', m.zusammenfassung) order by m.eingang_am desc)
                         from public.posteingang m where m.service_fall_id = f.id and m.geloescht_am is null), '[]'),
    'rma_offen', (select count(*) from public.garantiefaelle g
                   where g.service_fall_id = f.id and g.geloescht_am is null and g.status not in ('abgeschlossen', 'abgelehnt'))
  )
  from public.service_faelle f where f.id = p_id and f.geloescht_am is null
$$;

/** Zahlen für den Leitstand, die nicht in der Fall-Liste stehen: offene RMA und Service-Rapporte ohne Rechnung. */
create or replace function public.service_leitstand() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'rma_offen', (select count(*) from public.garantiefaelle g where g.geloescht_am is null and g.status not in ('abgeschlossen', 'abgelehnt')),
    'zu_verrechnen', (select count(*) from public.rapporte r
                       where r.service_fall_id is not null and r.geloescht_am is null and r.abgeschlossen_am is not null
                         and r.verrechnung = 'kostenpflichtig'
                         and not exists (select 1 from public.rechnungen b where b.rapport_id = r.id and b.geloescht_am is null and b.status <> 'storniert'))
  )
$$;
