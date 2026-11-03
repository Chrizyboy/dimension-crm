-- Rollen mit Zusätzen (Chris 2.11.2026, Abhak-Liste «Rollen und Zugriffe»):
--   * Jede Person hat eine Rolle im Geschäft (Verkauf, Innendienst, Projektleitung, Montage, Buchhaltung).
--   * Dazu kommen zwei Zusätze als persönliche Rechte: «gl» (Geschäftsleitung: sieht alles inkl. Finanzen und
--     Personal, arbeitet im Tagesgeschäft normal, sieht Einstellungen, ändert das System nicht) und «admin»
--     (Administration: ändert das System, sieht ohne «gl» nur, was die Rolle erlaubt).
--   * «admin» ist darum nicht mehr Oberbegriff aller Rechte. Neu: «personal» (Personal-Akten und Arbeitszeiten
--     aller), «marge» (Kennzahlen mit Marge), «visum» (Erstvisum von Rechnungen eigener Projekte).
--   * Monteur fällt weg, es gibt nur noch Montage (mit der einfachen Handy-Ansicht).
--   * Posteingang: jede Person sieht nur ihr eigenes Postfach und die Team-Postfächer (info@), nie das Postfach
--     anderer, auch nicht GL oder Administration.

alter table public.rollen drop constraint rollen_rechte_gueltig;
alter table public.rollen add constraint rollen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'planung', 'personal', 'marge', 'visum', 'gl', 'admin']);
alter table public.personen drop constraint personen_rechte_gueltig;
alter table public.personen add constraint personen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'planung', 'personal', 'marge', 'visum', 'gl', 'admin']);

/**
 * Wirksame Rechte einer Person: Rechte der Rolle plus persönliche Rechte. «gl» bringt alle Fachrechte mit
 * (preise, finanzen, planung, personal, marge, visum), aber nicht «admin». «admin» bringt nur sich selbst.
 */
create or replace function intern.wirksame_rechte(p_person uuid)
returns text[]
language sql stable security definer set search_path = '' as $$
  with r as (
    select p.rechte || coalesce(ro.rechte, '{}') as roh
      from public.personen p
      left join public.rollen ro on ro.schluessel = p.rolle and ro.aktiv and ro.geloescht_am is null
     where p.id = p_person and p.aktiv and p.geloescht_am is null
  )
  select array(select distinct x from r, unnest(
           array['basis'] || r.roh
           || case when 'gl' = any (r.roh) then array['preise', 'finanzen', 'planung', 'personal', 'marge', 'visum']
                   else '{}'::text[] end) x order by 1)
    from r
$$;

create or replace function intern.hat_recht(p_recht text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_recht = any (intern.wirksame_rechte(intern.meine_person_id())), false)
$$;
comment on function intern.hat_recht(text) is
  'Hat die angemeldete Person das Recht? Siehe intern.wirksame_rechte: «gl» umfasst die Fachrechte, «admin» nur das System.';

-- Empfänger der Personal-Fristen: nur noch wer «personal» hat (GL, Buchhaltung), nicht mehr die Administration.
create or replace function intern.personal_berechtigte()
returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p
   where p.aktiv and p.geloescht_am is null and 'personal' = any (intern.wirksame_rechte(p.id))
$$;

-- ---------- Rollen nach der Abhak-Liste ----------
-- Bereiche = Seitenleiste (Daten schützt RLS). «Mein Tag», Aufgaben, Handbuch und Team sind immer sichtbar.
update public.rollen set rechte = '{marge}', bereiche = '{dashboard,sales,tenders,contracting,quotes,workcontracts,pricing,customers,contacts,marketing,projects,aftersales,contracts,purchasing,inbox,outbox,ai,expenses}'
 where schluessel = 'verkauf';
update public.rollen set rechte = '{preise,visum}', bereiche = '{dashboard,sales,tenders,contracting,quotes,workcontracts,pricing,customers,contacts,marketing,projects,aftersales,contracts,purchasing,fleet,inbox,outbox,ai,expenses}'
 where schluessel = 'innendienst';
update public.rollen set rechte = '{preise,visum}', bereiche = '{dashboard,quotes,workcontracts,pricing,customers,contacts,projects,fieldwork,aftersales,contracts,purchasing,fleet,inbox,outbox,ai,expenses}'
 where schluessel = 'projektleitung';
update public.rollen set rechte = '{}', bereiche = '{fieldwork,aftersales,fleet,expenses}', ansicht = 'einfach',
       beschreibung_de = 'Eigene Einsätze, Baustelle, Rapporte, Service und Fahrzeuge, am Handy.',
       beschreibung_fr = 'Ses interventions, chantier, rapports, service et véhicules, sur mobile.'
 where schluessel = 'montage';
update public.rollen set rechte = '{finanzen,preise,planung,personal,marge,visum}', bereiche = '{dashboard,quotes,workcontracts,pricing,customers,contacts,aftersales,contracts,invoices,finance,inbox,outbox,ai,expenses}'
 where schluessel = 'buchhaltung';

-- Monteur in Montage zusammenführen.
update public.personen set rolle = 'montage' where rolle = 'monteur';
update public.rollen set aktiv = false where schluessel = 'monteur';

-- Rollen und Zusätze je Person (Chris 2.11.2026). Nur wo die Person noch die alte Rolle hat, damit eine spätere
-- Änderung in Einstellungen › Benutzer nicht überschrieben wird, falls die Migration nochmals läuft.
update public.personen p set rolle = z.rolle, rechte = array(select distinct x from unnest(p.rechte || z.zusatz) x)
  from (values ('chris', 'verkauf', '{gl,admin}'::text[]), ('loris', 'verkauf', '{admin}'), ('andreas', 'projektleitung', '{gl}'),
               ('erich', 'buchhaltung', '{gl}'), ('filipe', 'verkauf', '{}'), ('davis', 'innendienst', '{}'),
               ('jose', 'projektleitung', '{}')) as z (kuerzel, rolle, zusatz)
 where p.kuerzel = z.kuerzel and p.rolle in ('admin', 'mitarbeit') and p.geloescht_am is null;
-- Die alte Rolle «Administration» bleibt für alle, die noch nicht umgestellt sind, mit vollem Zugriff (Zusätze GL
-- und Administration), damit niemand ausgesperrt wird. Neue Personen bekommen eine Rolle im Geschäft plus Zusätze.
update public.rollen set rechte = '{gl,admin}', reihenfolge = 95,
       name_de = 'Gesamtzugriff (alt)', name_fr = 'Accès complet (ancien)',
       beschreibung_de = 'Alte Rolle «Administration»: Geschäftsleitung und Administration. Besser eine Rolle im Geschäft wählen und die Zusätze bei der Person setzen.',
       beschreibung_fr = 'Ancien rôle «Administration»: direction et administration. Mieux: choisir un rôle métier et cocher les compléments.'
 where schluessel = 'admin';
