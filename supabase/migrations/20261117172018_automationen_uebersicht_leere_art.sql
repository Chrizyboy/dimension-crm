-- Helpdesk T001: Die Übersicht der Automationen brach ab, sobald Automationen gelaufen waren. Schritte wie
-- «Bedingungen geprüft» haben keine Meldung, also keine Art; jsonb_object_agg verlangt aber einen Schlüssel und
-- wirft sonst «field name must not be null». Solche Schritte sind keine erledigte Arbeit und zählen nicht mit.
-- Sonst unverändert gegenüber 20261113000300_automationen_uebersicht.sql.

/** Übersicht: Zustand, Wirkung der letzten 7 Tage (mit geschätzter Zeit), Probleme und die nächsten 24 Stunden. */
create or replace function public.automation_uebersicht() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cfg jsonb := intern.automation_cfg();
  min jsonb := coalesce(cfg -> 'minuten', '{}');
  schritte jsonb;
  vorwoche int;
begin
  perform intern.automation_sehen();
  -- Ergebnisse der Schritte: Meldungen wie «aufgabe», «mail_wartet», «rechnung_entwurf» auf eine Art abbilden.
  with e as (
    select l.id, l.automation_id, l.titel, l.tabelle, l.bezug_id, s
      from public.automation_laeufe l, jsonb_array_elements(l.protokoll) s
     where l.geaendert_am > now() - interval '14 days')
  select jsonb_build_object(
    'wirkung', coalesce((select jsonb_object_agg(art, n) from (
        select case when s ->> 'meldung' like 'mail%' then 'mail' when s ->> 'meldung' like 'sms%' then 'sms'
                    when s ->> 'art' in ('outlook_termin', 'sharepoint_ordner', 'abaninja_kunde') then 'server'
                    else s ->> 'meldung' end as art, count(*) as n
          from e where s ->> 'ergebnis' = 'ok' and (s ->> 'zeit')::timestamptz > now() - interval '7 days'
         group by 1) w where art is not null), '{}'),
    'mails_wartend', (select count(*) from public.ausgangskorb k where k.geloescht_am is null and k.status = 'wartet'
                        and k.schluessel like 'automation:%'),
    'mails_freigegeben', (select count(*) from e where s ->> 'meldung' in ('mail_wartet', 'sms_wartet')
                            and (s ->> 'zeit')::timestamptz > now() - interval '7 days'
                            and exists (select 1 from public.ausgangskorb k where k.schluessel = 'automation:' || e.id || ':' || (s ->> 'nr')
                                          and k.status in ('freigegeben', 'wird_gesendet', 'gesendet'))),
    'rechnungen_rappen', (select coalesce(sum(r.total_rappen), 0) from public.rechnungen r
                            where r.geloescht_am is null and r.status = 'entwurf'
                              and exists (select 1 from e where s ->> 'meldung' = 'rechnung_entwurf'
                                            and s ->> 'ziel' like '%' || r.id || '%')),
    'probleme', (select count(*) from e where s ->> 'ergebnis' = 'fehler' and (s ->> 'zeit')::timestamptz > now() - interval '7 days'),
    'probleme_vorwoche', (select count(*) from e where s ->> 'ergebnis' = 'fehler'
                            and (s ->> 'zeit')::timestamptz between now() - interval '14 days' and now() - interval '7 days'),
    'aufmerksamkeit', coalesce((select jsonb_agg(p order by p ->> 'zeit' desc) from (
        select jsonb_build_object('lauf_id', e.id, 'automation_id', e.automation_id, 'titel', e.titel,
                 'ziel', intern.automation_ziel(e.tabelle, e.bezug_id), 'nr', s ->> 'nr', 'art', s ->> 'art',
                 'ergebnis', s ->> 'ergebnis', 'meldung', s ->> 'meldung', 'werte', s -> 'werte', 'zeit', s ->> 'zeit') p
          from e
         where (s ->> 'zeit')::timestamptz > now() - interval '7 days'
           and (s ->> 'ergebnis' = 'fehler' or s ->> 'meldung' in ('keine_mail', 'kein_telefon', 'kein_empfaenger',
                                                                    'nicht_verbunden', 'keine_verbindung'))
           and not exists (select 1 from public.automation_laeufe x where x.id = e.id and x.nur_schritt is not null)
         order by s ->> 'zeit' desc limit 20) q), '[]'))
  into schritte;

  return schritte || jsonb_build_object(
    'motor', (select jsonb_build_object('zuletzt_am', z.zuletzt_am, 'ok', z.ok, 'meldung', z.meldung)
                from intern.zeitplan_laeufe z where z.job = 'automationen'),
    'aktiv', (select count(*) from public.automationen a where a.geloescht_am is null and a.aktiv),
    'alle', (select count(*) from public.automationen a where a.geloescht_am is null),
    'wartend', (select count(*) from public.automation_laeufe l where l.stand in ('wartet', 'server')),
    'minuten', min,
    'ausgeschaltet', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name_de', a.name_de, 'name_fr', a.name_fr,
        'seit', a.geaendert_am, 'von', (select p.name from public.aenderungsprotokoll x
                                          join public.personen p on p.auth_user_id = x.benutzer
                                         where x.tabelle = 'automationen' and x.datensatz = a.id
                                         order by x.zeitpunkt desc limit 1)))
        from public.automationen a where a.geloescht_am is null and not a.aktiv), '[]'),
    'mails_alt', (select count(*) from public.ausgangskorb k where k.geloescht_am is null and k.status = 'wartet'
                    and k.schluessel like 'automation:%' and k.erstellt_am < now() - interval '2 days'),
    'naechste', coalesce((select jsonb_agg(to_jsonb(g) order by g.weiter_am) from (
        select * from public.automation_geplant() x where x.weiter_am < now() + interval '24 hours' and x.stand = 'wartet'
         limit 8) g), '[]'));
end
$$;
