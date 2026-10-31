-- Automatische Dateiablage in SharePoint (Modul-Prüfung 31.10.2026, Chris: «ja bauen»).
-- Die bisherige Ablage bleibt: Bibliothek «Public», BULLE/Devis → Adjudications → Archives, MURI ebenso.
-- Neu legt Dimension Work den Ordner einer Offerte selbst an (mit den 10 Unterordnern), verschiebt ihn bei
-- Annahme zu den Aufträgen und bei Verlust ins Archiv und legt Dateien aus dem CRM in den passenden Unterordner.
-- Die Arbeit mit Microsoft macht der Zeitplan (Edge Function, _shared/ablage.ts); hier stehen nur Regeln und Stand.
-- Standard «aus»: Erst wenn die Administration die Ablage einschaltet, zählt sie, und nur für Offerten ab dann
-- (aktiv_seit). Alte Ordner bleiben, wie sie sind.

insert into public.einstellungen (schluessel, wert) values ('ablage', $json${
  "aktiv": false,
  "aktiv_seit": null,
  "bibliothek": "Public",
  "name": "{nummer} - {kunde} - {ort}",
  "standorte": {
    "bulle": {
      "offerten": "BULLE/Devis - offre - Calculation/D {jahr}",
      "auftraege": "BULLE/Adjudications/A {jahr}",
      "verloren": "BULLE/Archives -Perdus"
    },
    "muri": {
      "offerten": "MURI/2. DEVIS - OFFERTE/{jahr}",
      "auftraege": "MURI/1. ADJUDICATION - AUFTRÄGE/{jahr}",
      "verloren": "MURI/2. DEVIS - OFFERTE/Verloren - Perdus"
    }
  },
  "unterordner": {
    "contrat": "Contrat - Werkvertrag",
    "correspondance": "Correspondance - Korrespondenz",
    "cout": "Coût de revient - Selbstkosten",
    "devis": "Devis - Soumission pour client - Offerte",
    "factures": "Factures - Situations - Garanties - Rechnungen",
    "fournisseur": "Offre fournisseur - Lieferantenofferten",
    "permis": "Permis et subvention - Bewilligungen und Förderung",
    "photo": "Photo - Fotos",
    "plans": "Plans - Pläne",
    "pv": "PV"
  },
  "zuordnung": {
    "offerte": "devis", "angebot": "devis",
    "werkvertrag": "contrat",
    "rechnungen": "factures", "beleg": "factures",
    "fotos": "photo", "bilder": "photo",
    "luftbild": "plans", "plaene": "plans",
    "einkauf": "fournisseur", "lieferanten": "fournisseur",
    "bewilligungen": "permis",
    "korrespondenz": "correspondance", "service": "correspondance", "kundenblatt": "correspondance",
    "selbstkosten": "cout"
  }
}$json$)
on conflict (schluessel) do nothing;

-- Die Regeln der Ablage ändert nur die Administration (wie Ausschreibungen, Grossprojekte, KI).
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte', 'ablage') and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  if new.schluessel = 'automationen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'automation.kein_recht';
  end if;
  if new.schluessel = 'ki' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return new;
end
$$;

-- Ein Ordner pro Offerte (oder pro Projekt ohne Offerte). «soll» sagt, wo er hingehört, «stand», wo er ist.
create table public.ablage_ordner (
  id          uuid primary key default gen_random_uuid(),
  offerte_id  uuid unique references public.offerten (id),
  projekt_id  uuid unique references public.projekte (id),
  soll        text not null default 'offerte' check (soll in ('offerte', 'auftrag', 'verloren')),
  stand       text check (stand in ('offerte', 'auftrag', 'verloren')),
  pfad        text,
  item_id     text,
  url         text,
  fehler      text,
  versucht_am timestamptz,
  check (offerte_id is not null or projekt_id is not null)
);
select intern.richte_fachtabelle_ein('ablage_ordner');
-- Die App liest nur (Link in der Akte); anlegen und ändern machen Trigger und der Server.
drop policy anlegen on public.ablage_ordner;
drop policy aendern on public.ablage_ordner;

/** Ist die Ablage eingeschaltet, und seit wann? null = aus. */
create or replace function intern.ablage_seit() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select coalesce((wert ->> 'aktiv_seit')::timestamptz, '-infinity')
    from public.einstellungen
   where schluessel = 'ablage' and coalesce((wert ->> 'aktiv')::boolean, false)
$$;

/** Wohin gehört der Ordner einer Offerte nach ihrem Entscheid? */
create or replace function intern.ablage_soll(p_entscheid text) returns text
language sql immutable set search_path = '' as $$
  select case when p_entscheid = 'angenommen' then 'auftrag'
              when p_entscheid in ('verloren', 'abgelehnt') then 'verloren'
              else 'offerte' end
$$;

-- Neue Offerte → Ordner anlegen; Entscheid geändert → Ordner verschieben.
create or replace function intern.ablage_offerte() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  seit timestamptz := intern.ablage_seit();
begin
  if tg_op = 'INSERT' then
    if seit is not null and new.geloescht_am is null and new.erstellt_am >= seit then
      insert into public.ablage_ordner (offerte_id, soll) values (new.id, intern.ablage_soll(new.entscheid))
      on conflict (offerte_id) do nothing;
    end if;
  elsif new.entscheid is distinct from old.entscheid then
    -- Ein Projekt zur Offerte hält den Ordner bei den Aufträgen, auch wenn der Entscheid zurückgenommen wird.
    update public.ablage_ordner a
       set soll = case when a.projekt_id is not null then 'auftrag' else intern.ablage_soll(new.entscheid) end
     where a.offerte_id = new.id;
  end if;
  return new;
end
$$;
create trigger ablage after insert or update of entscheid on public.offerten
  for each row execute function intern.ablage_offerte();

-- Neues Projekt → Ordner der Offerte zu den Aufträgen; Projekt ohne Offerte bekommt einen eigenen Ordner.
create or replace function intern.ablage_projekt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.ablage_ordner set projekt_id = new.id, soll = 'auftrag'
   where offerte_id = new.offerte_id and new.offerte_id is not null and projekt_id is null;
  if not found and intern.ablage_seit() is not null and new.erstellt_am >= intern.ablage_seit()
     and not exists (select 1 from public.ablage_ordner where offerte_id = new.offerte_id) then
    insert into public.ablage_ordner (projekt_id, soll) values (new.id, 'auftrag') on conflict do nothing;
  end if;
  return new;
end
$$;
create trigger ablage after insert on public.projekte
  for each row execute function intern.ablage_projekt();

/** Ordner, zu dem ein Dokument gehört (über Offerte oder Projekt), oder null. */
create or replace function intern.ablage_zu(p_tabelle text, p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id from public.ablage_ordner a
   where a.geloescht_am is null
     and ((p_tabelle = 'offerten' and a.offerte_id = p_id)
       or (p_tabelle = 'projekte' and (a.projekt_id = p_id
             or a.offerte_id = (select p.offerte_id from public.projekte p where p.id = p_id))))
   limit 1
$$;

/**
 * Für den Server: Ordner, die angelegt oder verschoben werden müssen, mit allem für Name und Pfad.
 * Nach einem Fehler erst eine Stunde später wieder.
 */
create or replace function public.ablage_offen(p_limit int default 10) returns table (
  id uuid, soll text, stand text, item_id text, pfad text, url text,
  nummer text, kunde text, ort text, titel text, standort text, jahr_offerte int, jahr_auftrag int
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.soll, a.stand, a.item_id, a.pfad, a.url,
         coalesce(o.nummer, p.nummer), intern.kontaktname(k), coalesce(nullif(ob.ort, ''),
           (select x.ort from public.objekte x where x.kontakt_id = k.id and x.geloescht_am is null order by x.erstellt_am limit 1)),
         coalesce(o.titel, p.titel), coalesce(so.kuerzel, sp.kuerzel, case when o.sprache = 'fr' then 'bulle' else 'muri' end),
         coalesce(o.jahr, extract(year from coalesce(o.angebot_am, o.erstellt_am::date, p.erstellt_am::date))::int),
         extract(year from coalesce(p.unterzeichnet_am, o.entscheid_am, p.erstellt_am::date, current_date))::int
    from public.ablage_ordner a
    left join public.offerten o on o.id = a.offerte_id
    left join public.projekte p on p.id = a.projekt_id
    join public.kontakte k on k.id = coalesce(o.kontakt_id, p.kontakt_id)
    left join public.objekte ob on ob.id = coalesce(o.objekt_id, p.objekt_id)
    left join public.standorte so on so.id = o.standort_id
    left join public.standorte sp on sp.id = p.standort_id
   where a.geloescht_am is null
     and (a.item_id is null or a.stand is distinct from a.soll)
     and (a.fehler is null or a.versucht_am < now() - interval '1 hour')
   order by a.erstellt_am
   limit p_limit
$$;

/**
 * Für den Server: Ergebnis festhalten. Wurde der Ordner verschoben, ziehen Pfad und Link der Dateien darin mit,
 * damit «Öffnen» in der Akte weiter stimmt.
 */
create or replace function public.ablage_ergebnis(
  p_id uuid, p_ok boolean, p_stand text default null, p_pfad text default null, p_item text default null,
  p_url text default null, p_fehler text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  alt public.ablage_ordner;
begin
  select * into alt from public.ablage_ordner where id = p_id for update;
  if not p_ok then
    update public.ablage_ordner set fehler = coalesce(p_fehler, 'fehler'), versucht_am = now() where id = p_id;
    return;
  end if;
  update public.ablage_ordner
     set stand = p_stand, pfad = p_pfad, item_id = coalesce(p_item, item_id), url = coalesce(p_url, url),
         fehler = null, versucht_am = now()
   where id = p_id;
  if alt.pfad is not null and alt.pfad <> p_pfad then
    update public.dokumente d
       set sharepoint_pfad = p_pfad || substr(d.sharepoint_pfad, length(alt.pfad) + 1),
           sharepoint_url = case when alt.url is not null and p_url is not null and d.sharepoint_url like alt.url || '%'
                                 then p_url || substr(d.sharepoint_url, length(alt.url) + 1) else d.sharepoint_url end
     where d.sharepoint_pfad like alt.pfad || '/%'
       and intern.ablage_zu(d.bezug_tabelle, d.bezug_id) = p_id;
  end if;
end
$$;

/** Für den Server: Dateien aus dem CRM, die in einen schon angelegten Ordner gehören. */
create or replace function public.ablage_dateien_offen(p_limit int default 10) returns table (
  id uuid, name text, ordner text, speicher_pfad text, ablage_pfad text
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name, d.ordner, d.speicher_pfad, a.pfad
    from public.dokumente d
    join public.ablage_ordner a on a.id = intern.ablage_zu(d.bezug_tabelle, d.bezug_id)
   where d.geloescht_am is null and d.speicher = 'intern' and d.speicher_pfad is not null
     and d.bezug_tabelle in ('offerten', 'projekte')
     and a.item_id is not null and a.stand = a.soll
     and coalesce((d.sharepoint_status ->> 'ablage')::boolean, false) = false
     and coalesce((d.sharepoint_status ->> 'versucht_am')::timestamptz, '-infinity') < now() - interval '1 hour'
   order by d.erstellt_am
   limit p_limit
$$;

-- Die Sicherung (Kunden-Backup) lässt Dateien aus, die in die Ablage gehören: sonst lägen sie doppelt.
create or replace function public.sicherung_offen(p_limit int default 10, p_ids uuid[] default null) returns table (
  id uuid, name text, ordner text, speicher_pfad text, kundennummer int, kunde text, kontakt_id uuid
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name, d.ordner, d.speicher_pfad, k.kundennummer, intern.kontaktname(k), k.id
    from public.dokumente d
    join lateral (
      select case d.bezug_tabelle
               when 'kontakte' then d.bezug_id
               when 'verkaufschancen' then (select v.kontakt_id from public.verkaufschancen v where v.id = d.bezug_id)
               when 'offerten' then (select o.kontakt_id from public.offerten o where o.id = d.bezug_id)
               when 'werkvertraege' then (select w.kontakt_id from public.werkvertraege w where w.id = d.bezug_id)
               when 'projekte' then (select p.kontakt_id from public.projekte p where p.id = d.bezug_id)
             end as kontakt_id) b on true
    join public.kontakte k on k.id = b.kontakt_id
   where d.geloescht_am is null and d.speicher = 'intern' and d.speicher_pfad is not null
     and coalesce((d.sharepoint_status ->> 'ok')::boolean, false) = false
     and (d.bezug_tabelle not in ('offerten', 'projekte') or intern.ablage_zu(d.bezug_tabelle, d.bezug_id) is null)
     and (p_ids is null or d.id = any (p_ids))
     and (p_ids is not null or coalesce((d.sharepoint_status ->> 'versucht_am')::timestamptz, '-infinity') < now() - interval '1 day')
   order by d.erstellt_am
   limit p_limit
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ablage_offen(int)', 'ablage_ergebnis(uuid, boolean, text, text, text, text, text)', 'ablage_dateien_offen(int)',
    'sicherung_offen(int, uuid[])']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$$;
