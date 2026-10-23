-- Phase 11, Teil 1: Grundlagen Marketing (Kunden anschreiben, Newsletter, Social Media), siehe Entscheid 0022.
-- Die Tabellen kampagnen, newsletter, newsletter_empfaenger und social_posts gibt es seit dem Datenmodell
-- (20261022000600); hier kommen Abmeldung, Zielgruppe, Vorlagen und die Verbindungen zu Meta, LinkedIn und Canva dazu.

-- Abmeldung per Link: ein zufälliger Schlüssel je Kontakt (nie die ID, damit niemand fremde Kontakte abmeldet).
alter table public.kontakte add column if not exists abmelde_schluessel uuid not null default gen_random_uuid();
create unique index if not exists kontakte_abmelde_idx on public.kontakte (abmelde_schluessel);
alter table public.newsletter_empfaenger add column if not exists abmelde_schluessel uuid not null default gen_random_uuid();
create unique index if not exists newsletter_empfaenger_abmelde_idx on public.newsletter_empfaenger (abmelde_schluessel);
comment on column public.kontakte.werbesperre is
  'Vom Marketing abgemeldet (V233 «Keine Werbung»): keine Newsletter, Serien-Mails und Serienbriefe.';

-- Verlauf «Letzte Aktionen» (V233): Art, Betreff, Anzahl, wann, von wem; dazu Filter und Bezug.
alter table public.kampagnen
  add column if not exists details      jsonb not null default '{}',
  add column if not exists newsletter_id uuid references public.newsletter (id);
alter table public.kampagnen drop constraint if exists kampagnen_art_check;
alter table public.kampagnen add constraint kampagnen_art_check
  check (art in ('serienbrief', 'serienmail', 'newsletter', 'adressliste'));

alter table public.newsletter
  add column if not exists betreff_de   text,
  add column if not exists betreff_fr   text,
  add column if not exists versendet_am timestamptz,
  add column if not exists versendet_von text,
  add column if not exists anzahl       int;
alter table public.newsletter drop constraint if exists newsletter_status_check;
alter table public.newsletter add constraint newsletter_status_check check (status in ('entwurf', 'versendet'));

-- Social Media: Entwurf → freigegeben und geplant → veröffentlicht (oder Fehler). «erledigt» = von Hand gepostet.
alter table public.social_posts
  add column if not exists geplant_am        timestamptz,
  add column if not exists freigegeben_von   uuid references public.personen (id),
  add column if not exists freigegeben_am    timestamptz,
  add column if not exists veroeffentlicht_am timestamptz,
  add column if not exists ergebnis          jsonb not null default '{}';
update public.social_posts set status = 'entwurf' where status not in ('entwurf', 'erledigt');
alter table public.social_posts drop constraint if exists social_posts_status_check;
alter table public.social_posts add constraint social_posts_status_check
  check (status in ('entwurf', 'geplant', 'wird_veroeffentlicht', 'veroeffentlicht', 'fehler', 'erledigt'));
alter table public.social_posts drop constraint if exists social_posts_netzwerke_check;
alter table public.social_posts add constraint social_posts_netzwerke_check
  check (netzwerke <@ array['instagram', 'facebook', 'linkedin']);
comment on column public.social_posts.texte is 'Text je Netzwerk und Sprache: {"instagram": {"de": "…", "fr": "…"}, …}';
comment on column public.social_posts.bilder is 'Bilder als Liste von Dokument-IDs (Ordner «marketing»), das erste wird gepostet.';
comment on column public.social_posts.ergebnis is 'Je Netzwerk: {"ok": true, "id": "…", "url": "…"} oder {"ok": false, "fehler": "…"}';

-- Verbindungen zu Meta (Facebook-Seite + Instagram), LinkedIn (Firmenseite) und Canva: eine je Dienst für die
-- ganze Firma. Token verschlüsselt (AES-GCM, Schlüssel nur in den Secrets) im Schema «intern».
create table intern.social_konten (
  dienst        text primary key check (dienst in ('meta', 'linkedin', 'canva')),
  name          text not null,
  konto         jsonb not null default '{}',
  token         text,
  refresh       text,
  ablauf        timestamptz,
  verbunden_von uuid references public.personen (id),
  verbunden_am  timestamptz not null default now(),
  genutzt_am    timestamptz,
  fehler        text
);

-- Laufende Anmeldungen bei Meta, LinkedIn oder Canva (state, PKCE), 10 Minuten gültig.
create table intern.social_zustaende (
  zustand     text primary key,
  dienst      text not null,
  person_id   uuid not null references public.personen (id),
  pruefwert   text not null,
  sprache     text not null default 'de',
  erstellt_am timestamptz not null default now()
);

alter table public.integrationen drop constraint if exists integrationen_dienst_check;
alter table public.integrationen add constraint integrationen_dienst_check
  check (dienst in ('microsoft', 'abaninja', 'sms', 'zeitplan', 'meta', 'linkedin', 'canva'));
insert into public.integrationen (dienst, einstellungen) values ('meta', '{}'), ('linkedin', '{}'), ('canva', '{}')
  on conflict (dienst) do nothing;

-- Vorlagen (V233 «meta/marketing»): Absender und Ort je Sprache, Brief und Mail, Abmelde-Satz, Social-Media-Regeln.
-- Absender aus den Firmen (GmbH deutsch, Sàrl französisch), damit die Adresse nur an einem Ort gepflegt wird.
insert into public.einstellungen (schluessel, wert)
select 'marketing', jsonb_build_object(
  'absender', jsonb_build_object(
    'de', coalesce((select concat_ws(E'\n', name, strasse, concat_ws(' ', plz, ort)) from public.firmen where kuerzel = 'gmbh' and geloescht_am is null), 'Dimension Solaire GmbH'),
    'fr', coalesce((select concat_ws(E'\n', name, strasse, concat_ws(' ', plz, ort)) from public.firmen where kuerzel = 'sarl' and geloescht_am is null), 'Dimension Solaire Sàrl')),
  'ort', jsonb_build_object(
    'de', coalesce((select ort from public.firmen where kuerzel = 'gmbh' and geloescht_am is null), 'Muri'),
    'fr', coalesce((select ort from public.firmen where kuerzel = 'sarl' and geloescht_am is null), 'Bulle')),
  'brief', $j${
    "de": {"betreff": "Ihre Solaranlage", "text": "{Anrede}\n\nGerne informieren wir Sie über …\n\nFür Fragen sind wir jederzeit für Sie da.\n\nFreundliche Grüsse\n\n{Absender}"},
    "fr": {"betreff": "Votre installation solaire", "text": "{Anrede}\n\nNous avons le plaisir de vous informer …\n\nNous restons à votre entière disposition.\n\nMeilleures salutations\n\n{Absender}"}
  }$j$::jsonb,
  'mail', $j${
    "de": {"betreff": "Neuigkeiten von Dimension Solaire", "text": "{Anrede}\n\nGerne informieren wir Sie über …\n\nFreundliche Grüsse"},
    "fr": {"betreff": "Nouveautés de Dimension Solaire", "text": "{Anrede}\n\nNous avons le plaisir de vous informer …\n\nMeilleures salutations"}
  }$j$::jsonb,
  'abmelden', $j${
    "de": "Sie möchten keine solchen E-Mails mehr erhalten? Hier abmelden: {Abmeldelink}",
    "fr": "Vous ne souhaitez plus recevoir ce type d’e-mail ? Se désinscrire ici : {Abmeldelink}"
  }$j$::jsonb,
  'newsletter_max_woerter', 450,
  'social', $j${
    "themen": ["Batteriespeicher", "Wärmepumpe", "Ladestation", "Förderung", "Eigenverbrauch", "Winterstrom", "Referenzanlage", "Team", "Tipp", "Allgemein"],
    "regeln": {
      "instagram": "60–120 Wörter, passende Emojis, 8–12 Hashtags am Schluss. Nie Kundennamen oder Adressen.",
      "facebook": "60–150 Wörter, wenige Emojis, höchstens 3 Hashtags. Nie Kundennamen oder Adressen.",
      "linkedin": "100–180 Wörter, sachlich, keine Emojis, höchstens 3 Hashtags. Nie Kundennamen oder Adressen."
    },
    "ci": "Farben und Schrift aus dem Canva-Markenkit «Dimension Solaire». Logo unten rechts, viel Weissraum, echte Fotos von Anlagen statt Stockbilder."
  }$j$::jsonb)
on conflict (schluessel) do nothing;

-- CI-Stil aus der Vorlage übernehmen, falls importiert (V233 «Social-Media-Stil», von Admins gepflegt).
update public.einstellungen m
   set wert = jsonb_set(m.wert, '{social,ci}', to_jsonb(v.wert ->> 'style'))
  from public.einstellungen v
 where m.schluessel = 'marketing' and v.schluessel = 'vorlage.social' and nullif(v.wert ->> 'style', '') is not null;

/** Einstellungen schützen: Ausschreibungen nur Admin, Finanzen nur «finanzen», CI-Stil im Marketing nur Admin (V233). */
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'ausschreibungen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  return new;
end
$$;

create index if not exists plz_verzeichnis_ortname_idx on public.plz_verzeichnis (lower(ort_name));

-- Zielgruppe (V233 «Kunden anschreiben»): ein Eintrag je Kontakt mit der stärksten Gruppe aus Leads, Offerten
-- und Projekten, Sprache, Standort, Kanton, Anlage und Versandgrund. Security invoker: RLS der Tabellen gilt.
create or replace view public.marketing_zielgruppe with (security_invoker = true) as
select k.id,
       k.kundennummer,
       intern.kontaktname(k) as name,
       k.anrede, k.vorname, k.nachname, k.firma,
       k.email, k.telefon,
       case when k.sprache = 'fr' then 'fr' else 'de' end as sprache,
       o.strasse, coalesce(o.plz, pv.plz) as plz, o.ort, coalesce(o.kanton, pv.kanton) as kanton,
       st.kuerzel as standort,
       s.stand,
       case
         when a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut') then 'kunde'
         when a.eigenschaften ->> 'gruppe' in ('offerte', 'offeriert') then 'offerte'
         when a.eigenschaften ->> 'gruppe' = 'lead' then 'interessent'
         when s.stand = 'kein' then 'kein_interesse'
         when s.stand = 'verloren' then 'verloren'
         else 'ohne'
       end as gruppe,
       an.batterie, an.wallbox, an.waermepumpe, an.anlage_seit,
       k.werbesperre,
       k.einwilligung,
       case
         when a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut') then 'kunde'
         when k.einwilligung ->> 'datum' is not null then 'einwilligung'
       end as versandgrund,
       (select max(z.zeitpunkt) from public.aktivitaeten z
         where z.kontakt_id = k.id and z.geloescht_am is null and z.art in ('mail', 'brief')) as zuletzt_angeschrieben,
       k.abmelde_schluessel
  from public.kontakte k
  left join lateral (
    select x.strasse, x.plz, x.ort, x.kanton from public.objekte x
     where x.kontakt_id = k.id and x.geloescht_am is null order by x.erstellt_am limit 1) o on true
  -- Fehlt PLZ oder Kanton, aus dem Verzeichnis nach PLZ oder Ort (wie V233 «plzForOrt»).
  left join lateral (
    select v.plz, v.kanton from public.plz_verzeichnis v
     where (o.plz is not null and v.plz = o.plz) or (o.plz is null and lower(v.ort_name) = lower(trim(o.ort)))
     order by v.plz limit 1) pv on true
  left join lateral public.kundenstand(k.id) s on true
  left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand
  left join lateral (
    select coalesce(p.standort_id, f.standort_id, v.standort_id) as standort_id
      from (select 1) x
      left join lateral (select standort_id from public.projekte
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by erstellt_am desc limit 1) p on true
      left join lateral (select standort_id from public.offerten
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by erstellt_am desc limit 1) f on true
      left join lateral (select standort_id from public.verkaufschancen
                          where kontakt_id = k.id and geloescht_am is null and standort_id is not null
                          order by eingang_am desc nulls last limit 1) v on true) so on true
  left join public.standorte st on st.id = so.standort_id
  left join lateral (
    -- Komponenten der Anlage (IBN) oder aus dem Projekt; «Anlage seit» = IBN, sonst Unterschrift.
    select bool_or(c ->> 'art' = 'batterie' or nullif(p.alt_daten ->> 'batterie', '') is not null) as batterie,
           bool_or(c ->> 'art' = 'wallbox') as wallbox,
           bool_or(c ->> 'art' = 'waermepumpe') as waermepumpe,
           min(coalesce(l.ibn_am, p.unterzeichnet_am)) as anlage_seit
      from public.projekte p
      left join public.anlagen l on l.projekt_id = p.id and l.geloescht_am is null
      left join lateral jsonb_array_elements(coalesce(l.komponenten, '[]')) c on true
     where p.kontakt_id = k.id and p.geloescht_am is null
       and (l.id is not null or a.eigenschaften ->> 'gruppe' in ('auftrag', 'verbaut'))) an on true
 where k.geloescht_am is null;

grant select on public.marketing_zielgruppe to authenticated;
comment on view public.marketing_zielgruppe is
  'Kunden anschreiben und Newsletter: je Kontakt Gruppe, Sprache, Standort, Kanton, Anlage, Versandgrund.';
