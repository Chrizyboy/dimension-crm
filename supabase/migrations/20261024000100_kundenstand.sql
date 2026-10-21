-- Phase 5, Teil 1: der «Stand» eines Kunden (V137) als Daten und als eine Regel in der Datenbank.
-- V233 rechnete den Stand bei jedem Anzeigen im Browser aus fünf Statusfeldern zusammen.
-- Hier gibt es dafür eine Funktion, damit Liste, Kundenakte, Suche und später Auswertungen
-- immer dasselbe Ergebnis zeigen.

-- Die 16 Stände und 6 Gruppen aus V233, als Auswahlwerte (Texte und Reihenfolge ändert die Administration).
insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften) values
  ('kundenstand_gruppe', 'lead', 'Lead', 'Lead', 10, 'info', '{}'),
  ('kundenstand_gruppe', 'offerte', 'In Offerte', 'En offre', 20, 'marke', '{}'),
  ('kundenstand_gruppe', 'offeriert', 'Offeriert', 'Offre envoyée', 30, 'marke', '{}'),
  ('kundenstand_gruppe', 'auftrag', 'Auftrag / Bau', 'Commande / chantier', 40, 'ok', '{}'),
  ('kundenstand_gruppe', 'verbaut', 'Verbaut / abgeschlossen', 'Construit / clos', 50, 'ok', '{}'),
  ('kundenstand_gruppe', 'aus', 'Verloren / kein Interesse', 'Perdu / pas intéressé', 60, 'neutral', '{}'),
  ('kundenstand', 'lead_neu', 'Lead neu', 'Nouveau lead', 10, 'info', '{"gruppe": "lead"}'),
  ('kundenstand', 'lead_offen', 'Lead offen', 'Lead ouvert', 20, 'info', '{"gruppe": "lead"}'),
  ('kundenstand', 'lead_spaeter', 'Später kontaktieren', 'Recontacter plus tard', 30, 'neutral', '{"gruppe": "lead"}'),
  ('kundenstand', 'termin', 'Termin vereinbart', 'RDV fixé', 40, 'info', '{"gruppe": "lead"}'),
  ('kundenstand', 'nach_termin', 'Termin gehabt – wie weiter?', 'Visite faite – suite ?', 50, 'warn', '{"gruppe": "lead"}'),
  ('kundenstand', 'offerte', 'Offerte in Arbeit', 'Offre en préparation', 60, 'marke', '{"gruppe": "offerte"}'),
  ('kundenstand', 'pruefung', 'Offerte zur Prüfung', 'Offre à valider', 70, 'marke', '{"gruppe": "offerte"}'),
  ('kundenstand', 'offeriert', 'Offeriert', 'Offre envoyée', 80, 'marke', '{"gruppe": "offeriert"}'),
  ('kundenstand', 'nachfassen', 'Nachfassen fällig', 'À relancer', 90, 'warn', '{"gruppe": "offeriert"}'),
  ('kundenstand', 'vertagt', 'Entscheid vertagt', 'Décision reportée', 100, 'neutral', '{"gruppe": "offeriert"}'),
  ('kundenstand', 'angenommen', 'Angenommen – Bau planen', 'Acceptée – à planifier', 110, 'ok', '{"gruppe": "auftrag"}'),
  ('kundenstand', 'bau', 'In Bau', 'Chantier en cours', 120, 'info', '{"gruppe": "auftrag"}'),
  ('kundenstand', 'verbaut', 'Verbaut', 'Construit', 130, 'ok', '{"gruppe": "verbaut"}'),
  ('kundenstand', 'dossier', 'Dossier abgeschlossen', 'Dossier clos', 140, 'neutral', '{"gruppe": "verbaut"}'),
  ('kundenstand', 'verloren', 'Verloren', 'Perdue', 150, 'neutral', '{"gruppe": "aus"}'),
  ('kundenstand', 'kein', 'Kein Interesse', 'Pas intéressé', 160, 'neutral', '{"gruppe": "aus"}')
on conflict (liste, schluessel) do nothing;

-- V233: Eine Offerte fällt 14 Tage nach dem Versand zum Nachfassen (FU_DAYS), ausser es gibt einen eigenen Termin.
insert into public.einstellungen (schluessel, wert) values ('nachfassen_tage', '14')
on conflict (schluessel) do nothing;

/** Tage bis zum Nachfassen aus den Einstellungen, sonst 14 wie in V233. */
create or replace function intern.nachfassen_tage() returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select (wert #>> '{}')::int from public.einstellungen where schluessel = 'nachfassen_tage'), 14)
$$;
grant execute on function intern.nachfassen_tage() to authenticated;

-- Stand einer Verkaufschance ohne Offerte (V233 stageOf, Teil «Lead»).
create or replace function intern.stand_verkaufschance(v public.verkaufschancen) returns text
language sql stable set search_path = '' as $$
  select case
    when v.stufe = 'kein_interesse' then 'kein'
    when v.stufe = 'zur_offerte' then case when v.offerte_status = 'pruefung' then 'pruefung' else 'offerte' end
    when v.stufe = 'abgeschlossen' then 'offeriert'
    when v.stufe = 'termin_vereinbart' then case when v.termin_am < now() then 'nach_termin' else 'termin' end
    when v.stufe = 'warten' or v.wiedervorlage_am > current_date then 'lead_spaeter'
    when v.stufe = 'offen' then 'lead_offen'
    else 'lead_neu'
  end
$$;

-- Stand einer Offerte ohne Projekt. «Nachfassen» kommt vor «vertagt», genau wie in V233.
create or replace function intern.stand_offerte(o public.offerten, pruefung boolean) returns text
language sql stable set search_path = '' as $$
  select case
    when o.status in ('verloren', 'archiviert') then 'verloren'
    when o.status = 'angenommen' or o.entscheid = 'angenommen' then 'angenommen'
    when o.status = 'offeriert' then case
      when coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) is null
        or coalesce(o.nachfassen_am, o.angebot_am + intern.nachfassen_tage()) <= current_date then 'nachfassen'
      when o.entscheid = 'vertagt' or o.nachfassen_am > current_date then 'vertagt'
      else 'offeriert'
    end
    when pruefung then 'pruefung'
    else 'offerte'
  end
$$;

-- Stand eines Projekts. Alte Dossiers ohne Entscheid gelten als abgeschlossen (V233: closed ohne «angenommen»).
create or replace function intern.stand_projekt(p public.projekte, angenommen boolean) returns text
language sql stable set search_path = '' as $$
  select case
    when p.status = 'abgeschlossen' or p.bau_status in ('ibn', 'fertig') then 'verbaut'
    when p.status = 'im_bau' then 'bau'
    when angenommen then 'angenommen'
    else 'dossier'
  end
$$;

/**
 * Stand eines Kontakts: der Stand seines jüngsten Geschäfts (Projekt, sonst Offerte, sonst Verkaufschance).
 * Ein Kontakt ohne Geschäft (z. B. ein Lieferant) hat keinen Stand.
 * Läuft mit den Rechten der aufrufenden Person, damit niemand über den Stand mehr erfährt als sonst.
 */
create or replace function public.kundenstand(p_kontakt uuid)
returns table (stand text, stand_datum date, bezug_tabelle text, bezug_id uuid)
language sql stable security invoker set search_path = '' as $$
  with kandidaten as (
    select intern.stand_projekt(p, coalesce(o.entscheid = 'angenommen', false)) as stand,
           coalesce(p.baubeginn, p.unterzeichnet_am, o.angebot_am, p.erstellt_am::date) as datum,
           'projekte' as tabelle, p.id
      from public.projekte p
      left join public.offerten o on o.id = p.offerte_id
     where p.kontakt_id = p_kontakt and p.geloescht_am is null
    union all
    select intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false)),
           coalesce(o.angebot_am, o.erstellt_am::date), 'offerten', o.id
      from public.offerten o
      left join public.verkaufschancen v on v.id = o.verkaufschance_id
     where o.kontakt_id = p_kontakt and o.geloescht_am is null
       and not exists (select 1 from public.projekte p where p.offerte_id = o.id and p.geloescht_am is null)
    union all
    select intern.stand_verkaufschance(v), coalesce(v.eingang_am, v.erstellt_am::date), 'verkaufschancen', v.id
      from public.verkaufschancen v
     where v.kontakt_id = p_kontakt and v.geloescht_am is null
       and not exists (select 1 from public.offerten o where o.verkaufschance_id = v.id and o.geloescht_am is null)
       and not exists (select 1 from public.projekte p where p.verkaufschance_id = v.id and p.geloescht_am is null)
  )
  select k.stand, k.datum, k.tabelle, k.id
    from kandidaten k
    left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = k.stand
   order by k.datum desc nulls last, a.reihenfolge desc nulls last
   limit 1
$$;
grant execute on function public.kundenstand(uuid) to authenticated;

grant execute on function intern.stand_verkaufschance(public.verkaufschancen) to authenticated;
grant execute on function intern.stand_offerte(public.offerten, boolean) to authenticated;
grant execute on function intern.stand_projekt(public.projekte, boolean) to authenticated;
