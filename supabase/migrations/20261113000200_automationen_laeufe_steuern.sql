-- Automationen vollständig (Entscheid 0039): Läufe für einen einzelnen Datensatz stoppen, fortsetzen, verschieben,
-- sofort ausführen und einen Schritt wiederholen; geplante Schritte je Datensatz für die Akten; «Warum?» bei Aufgaben.
-- Stoppen/Verschieben dürfen Administration, Geschäftsleitung und die zuständige Person (Chris 2.11.2026).

/** Darf die angemeldete Person diesen Lauf anhalten oder verschieben? */
create or replace function intern.automation_darf_lauf(l public.automation_laeufe) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
begin
  if intern.hat_recht('admin') or intern.hat_recht('gl') then return true; end if;
  if ich is null then return false; end if;
  -- coalesce: ohne zuständige Person ist der Vergleich null, und «not null» würde sonst durchlassen.
  return coalesce(ich::text = intern.automation_kontext(l.tabelle, l.bezug_id) #>> '{zustaendig,id}', false)
      or exists (select 1 from public.aufgaben t where t.lauf_id = l.id and t.person_id = ich);
end
$$;

/** Lauf holen und Recht prüfen (gemeinsam für die Funktionen unten). */
create or replace function intern.automation_lauf_fuer_mich(p_lauf uuid) returns public.automation_laeufe
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
begin
  select * into l from public.automation_laeufe where id = p_lauf for update;
  if not found then raise exception using errcode = 'P0001', message = 'automation.lauf_unbekannt'; end if;
  if not coalesce(intern.automation_darf_lauf(l), false) then raise exception using errcode = '42501', message = 'recht.fehlt'; end if;
  return l;
end
$$;

/** Für diesen Datensatz anhalten, mit Grund. Der Grund steht im Protokoll und als Notiz beim Kunden. */
create or replace function public.automation_lauf_stoppen(p_lauf uuid, p_grund text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe := intern.automation_lauf_fuer_mich(p_lauf);
  ich uuid := intern.meine_person_id();
  name text;
begin
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'automation.grund_fehlt'; end if;
  if l.stand not in ('laeuft', 'wartet', 'server') then raise exception using errcode = 'P0001', message = 'automation.lauf_zu_ende'; end if;
  update public.automation_laeufe set stand = 'gestoppt', gestoppt_grund = trim(p_grund), gestoppt_von = ich where id = l.id;
  perform intern.automation_vermerk(l.id, l.schritt, 'gestoppt', jsonb_build_object('ergebnis', 'uebersprungen',
    'meldung', 'gestoppt', 'werte', jsonb_build_object('von', intern.personen_namen(array[ich]), 'grund', trim(p_grund))));
  select coalesce(a.name_de, '') into name from public.automationen a where a.id = l.automation_id;
  if l.kontakt_id is not null then
    insert into public.aktivitaeten (art, text, person_id, kontakt_id, verkaufschance_id, projekt_id, details)
    values ('notiz', 'Automation «' || name || '» gestoppt: ' || trim(p_grund), ich, l.kontakt_id,
            case when l.tabelle = 'verkaufschancen' then l.bezug_id end,
            case when l.tabelle = 'projekte' then l.bezug_id end, jsonb_build_object('lauf_id', l.id));
  end if;
end
$$;

/** Gestoppten Lauf weiterlaufen lassen: er wartet wieder bis «weiter_am» (Vergangenes läuft in der nächsten Minute). */
create or replace function public.automation_lauf_fortsetzen(p_lauf uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe := intern.automation_lauf_fuer_mich(p_lauf);
begin
  if l.stand <> 'gestoppt' then raise exception using errcode = 'P0001', message = 'automation.nicht_gestoppt'; end if;
  update public.automation_laeufe
     set stand = 'wartet', gestoppt_grund = null, gestoppt_von = null
   where id = l.id;
  perform intern.automation_vermerk(l.id, l.schritt, 'fortgesetzt', jsonb_build_object('ergebnis', 'ok',
    'meldung', 'fortgesetzt', 'werte', jsonb_build_object('von', intern.personen_namen(array[intern.meine_person_id()]))));
end
$$;

/** Wartenden Lauf um p_tage verschieben (negativ = früher, nie vor jetzt). */
create or replace function public.automation_lauf_verschieben(p_lauf uuid, p_tage int) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe := intern.automation_lauf_fuer_mich(p_lauf);
  neu timestamptz;
begin
  if l.stand not in ('wartet', 'gestoppt') then raise exception using errcode = 'P0001', message = 'automation.wartet_nicht'; end if;
  neu := greatest(now(), l.weiter_am + make_interval(days => p_tage));
  update public.automation_laeufe set weiter_am = neu where id = l.id;
  perform intern.automation_vermerk(l.id, l.schritt, 'verschoben', jsonb_build_object('ergebnis', 'ok',
    'meldung', 'verschoben', 'werte', jsonb_build_object('bis', neu, 'von', intern.personen_namen(array[intern.meine_person_id()]))));
  return neu;
end
$$;

/** Wartezeit überspringen: der Zeitplan nimmt den Lauf in der nächsten Minute (Versandfenster gilt weiter). */
create or replace function public.automation_lauf_jetzt(p_lauf uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe := intern.automation_lauf_fuer_mich(p_lauf);
begin
  if l.stand <> 'wartet' then raise exception using errcode = 'P0001', message = 'automation.wartet_nicht'; end if;
  update public.automation_laeufe set weiter_am = now() where id = l.id;
end
$$;

/**
 * Einen fehlgeschlagenen oder übersprungenen Schritt noch einmal ausführen (nur Administration), z. B. nachdem
 * jemand Microsoft verbunden hat. Nur dieser Schritt läuft, danach ist der Lauf wieder zu Ende.
 */
create or replace function public.automation_schritt_wiederholen(p_lauf uuid, p_schritt int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
  letzter jsonb;
begin
  if not intern.hat_recht('admin') then raise exception using errcode = '42501', message = 'recht.fehlt'; end if;
  select * into l from public.automation_laeufe where id = p_lauf for update;
  if not found or l.stand not in ('fertig', 'fehler', 'uebersprungen') then
    raise exception using errcode = 'P0001', message = 'automation.lauf_offen';
  end if;
  select e into letzter from jsonb_array_elements(l.protokoll) e where (e ->> 'nr')::int = p_schritt
   order by e ->> 'zeit' desc limit 1;
  if letzter is null or letzter ->> 'ergebnis' not in ('fehler', 'uebersprungen') or p_schritt < 1 then
    raise exception using errcode = 'P0001', message = 'automation.schritt_ok';
  end if;
  update public.automation_laeufe
     set stand = 'laeuft', schritt = p_schritt, nur_schritt = p_schritt, weiter_am = now(), beendet_am = null,
         fehler = greatest(fehler - case when letzter ->> 'ergebnis' = 'fehler' then 1 else 0 end, 0)
   where id = l.id;
end
$$;

/** Text eines Schritts in Kurzform für Listen («Mail: Ihre Offerte {Offerte}»), Platzhalter eingesetzt. */
create or replace function intern.automation_schritt_text(x jsonb, ctx jsonb, p_sprache text) returns text
language sql stable security definer set search_path = '' as $$
  select nullif(intern.automation_text(coalesce(intern.zweisprachig(x -> 'betreff', p_sprache),
                                                intern.zweisprachig(x -> 'titel', p_sprache),
                                                intern.zweisprachig(x -> 'text', p_sprache)), ctx), '')
$$;

/** Nächster ausführbarer Schritt eines Laufs (nach einem Warten der folgende). */
create or replace function intern.automation_naechster(l public.automation_laeufe, a public.automationen) returns int
language sql stable set search_path = '' as $$
  select case when a.aktionen -> (l.schritt - 1) ->> 'art' = 'warten' and l.stand in ('wartet', 'gestoppt')
              then l.schritt + 1 else greatest(l.schritt, 1) end
$$;

/**
 * Geplante Schritte: für einen Datensatz (Akte, alle mit Grundrecht) oder alle (nur Administration/GL).
 * Wartende und gestoppte Läufe mit dem nächsten Schritt, wann er kommt und ob die Person ihn ändern darf.
 */
create or replace function public.automation_geplant(p_tabelle text default null, p_id uuid default null)
returns table (lauf_id uuid, automation_id uuid, name_de text, name_fr text, titel text, tabelle text, bezug_id uuid,
               stand text, weiter_am timestamptz, schritt int, schritte int, art text, text_de text, text_fr text,
               nach_aussen boolean, modus text, grund text, darf boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'recht.fehlt'; end if;
  if p_id is null and not (intern.hat_recht('admin') or intern.hat_recht('gl')) then
    raise exception using errcode = '42501', message = 'recht.fehlt';
  end if;
  return query
  select l.id, a.id, a.name_de, a.name_fr, l.titel, l.tabelle, l.bezug_id, l.stand, l.weiter_am,
         intern.automation_naechster(l, a), jsonb_array_length(a.aktionen),
         a.aktionen -> (intern.automation_naechster(l, a) - 1) ->> 'art',
         intern.automation_schritt_text(a.aktionen -> (intern.automation_naechster(l, a) - 1), ctx.k, 'de'),
         intern.automation_schritt_text(a.aktionen -> (intern.automation_naechster(l, a) - 1), ctx.k, 'fr'),
         a.aktionen -> (intern.automation_naechster(l, a) - 1) ->> 'art' in ('mail', 'sms', 'zahlungserinnerung'),
         a.modus, l.gestoppt_grund, intern.automation_darf_lauf(l)
    from public.automation_laeufe l
    join public.automationen a on a.id = l.automation_id
    cross join lateral (select intern.automation_kontext(l.tabelle, l.bezug_id) as k) ctx
   where l.stand in ('wartet', 'gestoppt', 'laeuft', 'server')
     and (p_id is null or l.bezug_id = p_id or (p_tabelle = 'kontakte' and l.kontakt_id = p_id))
   order by l.weiter_am
   limit 300;
end
$$;

/** «Warum habe ich diese Aufgabe?»: Automation, Auslöser und Datensatz eines Laufs. Für die Empfänger und die Administration. */
create or replace function public.automation_warum(p_lauf uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  l public.automation_laeufe;
  a public.automationen;
begin
  select * into l from public.automation_laeufe where id = p_lauf;
  if not found then return null; end if;
  if not (intern.hat_recht('admin') or intern.hat_recht('gl')
          or exists (select 1 from public.aufgaben t where t.lauf_id = l.id and t.person_id = intern.meine_person_id())
          or exists (select 1 from public.benachrichtigungen b where b.lauf_id = l.id and b.person_id = intern.meine_person_id())) then
    return null;
  end if;
  select * into a from public.automationen where id = l.automation_id;
  return jsonb_build_object('lauf_id', l.id, 'automation_id', a.id, 'name_de', a.name_de, 'name_fr', a.name_fr,
    'beschreibung_de', a.beschreibung_de, 'beschreibung_fr', a.beschreibung_fr, 'ausloeser', a.ausloeser,
    'titel', l.titel, 'ziel', intern.automation_ziel(l.tabelle, l.bezug_id), 'erstellt_am', l.erstellt_am,
    'stand', l.stand, 'darf', intern.automation_darf_lauf(l));
end
$$;

revoke execute on function public.automation_lauf_stoppen(uuid, text), public.automation_lauf_fortsetzen(uuid),
  public.automation_lauf_verschieben(uuid, int), public.automation_lauf_jetzt(uuid),
  public.automation_schritt_wiederholen(uuid, int), public.automation_geplant(text, uuid),
  public.automation_warum(uuid) from public, anon;
grant execute on function public.automation_lauf_stoppen(uuid, text), public.automation_lauf_fortsetzen(uuid),
  public.automation_lauf_verschieben(uuid, int), public.automation_lauf_jetzt(uuid),
  public.automation_schritt_wiederholen(uuid, int), public.automation_geplant(text, uuid),
  public.automation_warum(uuid) to authenticated;
