-- Zuständigkeiten (Chris 31.10.2026): Verkauf französischsprachig Filipe, deutschsprachig Loris; Offerten Andy,
-- Chris unterstützt. Neue Leads, auch von der Webseite, bekommen die zuständige Person automatisch, damit Aufgabe
-- «Erstkontakt» und Glocke der Automation «Neuer Lead» gleich bei ihr landen. Bei Abwesenheit (Ferien, krank …)
-- übernimmt die Stellvertretung. Alles als Daten in einstellungen.zustaendigkeiten (nur Administration); pro Lead
-- und Offerte bleibt die Person wie bisher änderbar.
-- Regeln für den Verkauf: die erste passende gewinnt; jedes Feld ist freiwillig
-- (sprache «de»/«fr», standort «muri»/«bulle», region = Nummer, produkt «pv»/«batterie»/«wallbox»/«waermepumpe»).

insert into public.einstellungen (schluessel, wert) values ('zustaendigkeiten', $json${
  "verkauf": [
    {"sprache": "fr", "person": "filipe"},
    {"sprache": "de", "person": "loris"}
  ],
  "offerten": "andreas",
  "stellvertretung": {"filipe": "loris", "loris": "filipe", "andreas": "chris"}
}$json$)
on conflict (schluessel) do nothing;

-- Regeln ändert nur die Administration (zusätzlich zu Ablage, Ausschreibungen, Grossprojekte, KI …).
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel in ('ausschreibungen', 'grossprojekte', 'ablage', 'zustaendigkeiten') and auth.uid() is not null
     and not intern.hat_recht('admin') then
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

/** Ist die Person an diesem Tag abwesend (Ferien, krank, Militär …, aus dem CRM oder Outlook)? */
create or replace function intern.abwesend(p_person uuid, p_tag date default current_date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.abwesenheiten a
                  where a.person_id = p_person and a.geloescht_am is null and p_tag between a.von and a.bis
                    and not a.halbtag)
$$;

/**
 * Aktive Person zu einem Kürzel aus den Zuständigkeiten; ist sie heute abwesend, die Stellvertretung
 * (wenn diese da ist). null, wenn es das Kürzel nicht gibt.
 */
create or replace function intern.zustaendige_person(p_kuerzel text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  cfg jsonb := (select wert from public.einstellungen where schluessel = 'zustaendigkeiten');
  wer uuid;
  ersatz uuid;
begin
  select p.id into wer from public.personen p
   where p.kuerzel = p_kuerzel and p.aktiv and p.geloescht_am is null;
  if wer is null or not intern.abwesend(wer) then return wer; end if;
  select p.id into ersatz from public.personen p
   where p.kuerzel = cfg -> 'stellvertretung' ->> p_kuerzel and p.aktiv and p.geloescht_am is null;
  return case when ersatz is not null and not intern.abwesend(ersatz) then ersatz else wer end;
end
$$;

/** Wer im Verkauf zuständig ist: erste passende Regel aus einstellungen.zustaendigkeiten.verkauf. */
create or replace function intern.verkauf_zustaendig(p_sprache text, p_standort uuid, p_region uuid, p_interesse text[])
returns uuid
language sql stable security definer set search_path = '' as $$
  select intern.zustaendige_person(r ->> 'person')
    from public.einstellungen e, jsonb_array_elements(coalesce(e.wert -> 'verkauf', '[]')) with ordinality as x(r, nr)
   where e.schluessel = 'zustaendigkeiten'
     and (r ->> 'sprache' is null or r ->> 'sprache' = p_sprache)
     and (r ->> 'standort' is null or r ->> 'standort' = (select s.kuerzel from public.standorte s where s.id = p_standort))
     and (r ->> 'region' is null or (r ->> 'region')::int = (select g.nummer from public.regionen g where g.id = p_region))
     and (r ->> 'produkt' is null or r ->> 'produkt' = any (coalesce(p_interesse, '{}')))
     and intern.zustaendige_person(r ->> 'person') is not null
   order by x.nr
   limit 1
$$;

-- Neuer Lead ohne Person → nach den Regeln zuteilen. Der Import der Vorlage (alt_id) behält seine Zuteilung,
-- Messe-Leads (alt_id «messe:…») sind neu und werden zugeteilt.
create or replace function intern.lead_zuteilen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tour_person_id is null and (new.alt_id is null or new.alt_id like 'messe:%') then
    new.tour_person_id := intern.verkauf_zustaendig(
      (select k.sprache from public.kontakte k where k.id = new.kontakt_id), new.standort_id, new.region_id, new.interesse);
    if new.tour_person_id is not null then new.zugewiesen_von := coalesce(new.zugewiesen_von, 'Regel'); end if;
  end if;
  return new;
end
$$;
create trigger zuteilen before insert on public.verkaufschancen
  for each row execute function intern.lead_zuteilen();

-- Offerten: zuerst die Person aus den Zuständigkeiten (Andy), sonst wie bisher (Bulle, Richtofferte, Termin-Person, ich).
create or replace function intern.offerte_verantwortlich(p_standort uuid, p_termin_person uuid, p_richtofferte boolean)
returns uuid language sql stable security definer set search_path = '' as $$
  with regel as (select wert from public.einstellungen where schluessel = 'offerte_verantwortlich')
  select coalesce(
    intern.zustaendige_person((select wert ->> 'offerten' from public.einstellungen where schluessel = 'zustaendigkeiten')),
    case when (select kuerzel from public.standorte where id = p_standort) = 'bulle'
      then (select p.id from public.personen p, regel where p.kuerzel = regel.wert ->> 'bulle' and p.aktiv) end,
    case when p_richtofferte
      then (select p.id from public.personen p, regel where p.kuerzel = regel.wert ->> 'richtofferte' and p.aktiv) end,
    p_termin_person,
    intern.meine_person_id())
$$;
