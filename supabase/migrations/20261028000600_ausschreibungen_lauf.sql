-- Phase 8b, Teil 6: Täglicher Lauf (Server, 07:00) und Zahlen für Startseite, Glocke und Trichter.

/**
 * Täglicher Lauf: «Später» wieder vorlegen, Auslöser der Spur Beobachten prüfen, nach 6 Monaten
 * archivieren, einmal nachfassen, an offene Bewilligungen erinnern und stille Quellen melden.
 * Gibt die Zahlen pro Schritt zurück. Nur der Server ruft ihn auf (oder die Administration von Hand).
 */
create or replace function public.ausschreibungen_pruefen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := intern.as_cfg();
  a public.ausschreibungen;
  s public.anschreiben;
  q record;
  n_spaeter int := 0;
  n_ausloeser int := 0;
  n_archiv int := 0;
  n_nachfassen int := 0;
  n_erinnert int := 0;
  n_alarm int := 0;
  p uuid;
begin
  if auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;

  for a in select * from public.ausschreibungen where status = 'spaeter' and wiedervorlage_am <= current_date
             and geloescht_am is null loop
    update public.ausschreibungen set status = intern.as_grundstatus(a), wiedervorlage_am = null where id = a.id;
    perform intern.as_vermerk(a.id, 'Wiedervorlage: wieder zum Entscheiden');
    n_spaeter := n_spaeter + 1;
  end loop;

  -- Auslöser «Datum» erreicht: in die Spur Akquise. Ohne Auslöser nach x Monaten archivieren.
  for a in select * from public.ausschreibungen where spur = 'beobachten' and status = 'beobachten' and geloescht_am is null loop
    if a.ausloeser = 'datum' and a.ausloeser_am <= current_date then
      update public.ausschreibungen set spur = 'akquise', status = 'kontakt_fehlt', ausloeser = null where id = a.id;
      perform intern.as_vermerk(a.id, 'Auslöser erreicht (Datum): Spur Akquise');
      perform intern.akquise_vorbereiten(a.id);
      n_ausloeser := n_ausloeser + 1;
    elsif coalesce(a.beobachten_seit, a.erstellt_am::date)
          < current_date - make_interval(months => coalesce((c ->> 'beobachten_monate')::int, 6)) then
      update public.ausschreibungen set status = 'archiviert',
             grund = 'Kein Auslöser nach ' || coalesce((c ->> 'beobachten_monate')::int, 6) || ' Monaten' where id = a.id;
      perform intern.as_vermerk(a.id, 'Archiviert: kein Auslöser');
      n_archiv := n_archiv + 1;
    end if;
  end loop;

  -- Einmal nachfassen, wenn nach n Arbeitstagen keine Antwort kam (Mail und Brief; Anrufe nicht).
  for s in select x.* from public.anschreiben x join public.ausschreibungen d on d.id = x.ausschreibung_id
            where x.art = 'erst' and x.status = 'versendet' and x.antwort_am is null and x.kanal <> 'anruf'
              and d.status = 'versendet' and x.geloescht_am is null
              and intern.arbeitstage_plus(x.versendet_am::date, coalesce((c ->> 'nachfassen_arbeitstage')::int, 5)) <= current_date
              and not exists (select 1 from public.anschreiben y where y.dossier_kontakt_id = x.dossier_kontakt_id
                                and y.art = 'nachfassen' and y.geloescht_am is null) loop
    begin
      perform intern.anschreiben_vorbereiten(s.dossier_kontakt_id, 'nachfassen');
      n_nachfassen := n_nachfassen + 1;
    exception when sqlstate 'P0001' then
      null; -- inzwischen gesperrt: nicht nachfassen
    end;
  end loop;

  -- Erinnern: Entwürfe und Prüf-Fälle, die zu lange warten. Nach 2 Arbeitstagen Andy, nach 3 auch die Vertretung;
  -- läuft eine Frist in weniger als 7 Tagen ab, gleich beide.
  for a in select x.* from public.ausschreibungen x
            where x.geloescht_am is null and x.haupt_id is null
              and (x.status = 'pruefen' or (x.status in ('entwurf', 'nachfassen')
                   and exists (select 1 from public.anschreiben y where y.ausschreibung_id = x.id and y.status = 'entwurf'))) loop
    for p in select unnest(intern.as_personen('bewilligen'))
              where intern.arbeitstage_plus(a.geaendert_am::date, coalesce((c ->> 'bewilligen_erinnern_arbeitstage')::int, 2)) <= current_date
                 or (a.frist is not null and a.frist - current_date < coalesce((c ->> 'frist_beide_tage')::int, 7))
              union
             select unnest(intern.as_personen('bewilligen_vertretung'))
              where intern.arbeitstage_plus(a.geaendert_am::date, coalesce((c ->> 'bewilligen_vertretung_arbeitstage')::int, 3)) <= current_date
                 or (a.frist is not null and a.frist - current_date < coalesce((c ->> 'frist_beide_tage')::int, 7)) loop
      if intern.aufgabe_einmal(p, case when a.status = 'pruefen' then 'Entscheiden: ' else 'Bewilligen: ' end || a.nummer,
           current_date, 'ausschreibungen', a.id, a.titel) is not null then
        n_erinnert := n_erinnert + 1;
      end if;
    end loop;
  end loop;

  -- Quellen-Kontrolle: eine Quelle, die schon lief, aber seit x Tagen keinen erfolgreichen Lauf hat → Alarm.
  for q in select l.quelle, max(l.beginn) filter (where l.ok) as zuletzt_ok from public.quellen_laeufe l
            where l.geloescht_am is null group by l.quelle loop
    if q.zuletzt_ok is null or q.zuletzt_ok < now() - make_interval(days => coalesce((c ->> 'quelle_still_tage')::int, 2)) then
      foreach p in array intern.as_personen('alarm') loop
        perform intern.aufgabe_einmal(p, 'Quelle prüfen: ' || q.quelle || ' liefert nichts mehr', current_date,
          'quellen_laeufe', null, 'Letzter erfolgreicher Lauf: ' || coalesce(to_char(q.zuletzt_ok at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI'), 'nie'));
      end loop;
      n_alarm := n_alarm + 1;
    end if;
  end loop;

  return jsonb_build_object('spaeter', n_spaeter, 'ausloeser', n_ausloeser, 'archiviert', n_archiv,
    'nachfassen', n_nachfassen, 'erinnert', n_erinnert, 'quellen_alarm', n_alarm);
end
$$;

/** Zusammenfassung für Startseite und Glocke: was wartet heute auf wen. */
create or replace function public.ausschreibungen_tagesbericht() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'neu_heute', (select count(*) from public.ausschreibungen where erstellt_am >= current_date and geloescht_am is null
                    and haupt_id is null and status <> 'verworfen'),
    'pruefen', (select count(*) from public.ausschreibungen where status = 'pruefen' and geloescht_am is null and haupt_id is null),
    'bewilligen', (select count(*) from public.anschreiben where status = 'entwurf' and geloescht_am is null),
    'senden', (select count(*) from public.anschreiben where status = 'bewilligt' and geloescht_am is null),
    'antworten', (select count(*) from public.ausschreibungen where status = 'antwort' and geloescht_am is null),
    'kontakt_fehlt', (select count(*) from public.ausschreibungen where status = 'kontakt_fehlt' and geloescht_am is null
                        and haupt_id is null),
    'fristen', (select count(*) from public.ausschreibungen where geloescht_am is null
                  and status in ('pruefen', 'teilnahme', 'kalkulation') and frist between current_date and current_date + 7),
    'quellen_still', (select count(*) from (select quelle from public.quellen_laeufe where geloescht_am is null group by quelle
                        having coalesce(max(beginn) filter (where ok), '-infinity') < now() - interval '2 days') x),
    'darf_bewilligen', intern.as_darf('bewilligen'),
    'darf_senden', intern.as_darf('senden'))
$$;

/**
 * Trichter pro Quelle und Kanton: gefunden → relevant → bearbeitet (teilgenommen oder angeschrieben) →
 * Antwort → Erfolg (Zuschlag oder Lead). Doppelte zählen nur einmal (Hauptdossier).
 */
create or replace function public.ausschreibungen_trichter(p_von date, p_bis date)
returns table (quelle text, kanton text, gefunden bigint, relevant bigint, bearbeitet bigint, antwort bigint, erfolg bigint)
language sql stable security invoker set search_path = '' as $$
  select a.quelle, coalesce(a.kanton, '–'),
    count(*),
    count(*) filter (where a.status not in ('verworfen', 'archiviert')),
    count(*) filter (where a.status in ('teilnahme', 'kalkulation', 'eingereicht', 'zuschlag', 'absage',
                                        'versendet', 'nachfassen', 'antwort', 'lead', 'kein_interesse')),
    count(*) filter (where a.status in ('zuschlag', 'absage', 'antwort', 'lead', 'kein_interesse')),
    count(*) filter (where a.status in ('zuschlag', 'lead'))
  from public.ausschreibungen a
  where a.geloescht_am is null and a.haupt_id is null and a.erstellt_am::date between p_von and p_bis
  group by 1, 2
  order by 3 desc
$$;

-- Rechte: Server-Funktionen nur für den Dienst, alles andere für angemeldete Personen (RLS schützt die Daten).
revoke execute on function public.ausschreibungen_pruefen() from public, anon;
grant execute on function public.ausschreibungen_pruefen() to authenticated;
revoke execute on function public.dossier_kontakt_speichern(jsonb), public.anschreiben_entwerfen(uuid, text),
  public.anschreiben_aendern(uuid, text, text), public.anschreiben_bewilligen(uuid[]), public.anschreiben_ablehnen(uuid, text),
  public.anschreiben_senden(uuid[]), public.anschreiben_antwort(uuid, text), public.anschreiben_volltext(uuid),
  public.ausschreibung_entscheiden(uuid, text, jsonb), public.ausschreibungen_entscheiden(uuid[], text, jsonb),
  public.kontaktsperre_anlegen(text, text, text, date), public.kontaktsperre_aufheben(uuid),
  public.ausschreibungen_tagesbericht(), public.ausschreibungen_trichter(date, date) from public, anon;
grant execute on function public.dossier_kontakt_speichern(jsonb), public.anschreiben_entwerfen(uuid, text),
  public.anschreiben_aendern(uuid, text, text), public.anschreiben_bewilligen(uuid[]), public.anschreiben_ablehnen(uuid, text),
  public.anschreiben_senden(uuid[]), public.anschreiben_antwort(uuid, text), public.anschreiben_volltext(uuid),
  public.ausschreibung_entscheiden(uuid, text, jsonb), public.ausschreibungen_entscheiden(uuid[], text, jsonb),
  public.kontaktsperre_anlegen(text, text, text, date), public.kontaktsperre_aufheben(uuid),
  public.ausschreibungen_tagesbericht(), public.ausschreibungen_trichter(date, date) to authenticated;
