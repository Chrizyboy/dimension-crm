-- Fahrzeuge, Team, Einstellungen (Modul-Prüfung 28A):
--  * Dienst-Wächter: stündlich prüfen, ob Microsoft je Person, Zeitplan, Datensicherung, SMS-Guthaben und AbaNinja
--    laufen. Glocke einmal pro Ausfall (bis er behoben ist): abgelaufene Microsoft-Anmeldung an die Person, alles an
--    die Administration. Läuft zweimal: im Zeitplan (mit SMS/AbaNinja) und direkt in der Datenbank (pg_cron), damit
--    auch ein stehender Zeitplan auffällt.
--  * Zustand aller Dienste für Einstellungen › Betrieb (dienste_zustand).
--  * Checklisten «Neue Person» (14 Tage vor Eintritt) und «Austritt» (am Stichtag) als Aufgaben an die Administration.
--  * Handbuch: Prozesse, deren Stand älter als 12 Monate ist, als Aufgabe «prüfen» an die Administration.

create table intern.dienst_meldungen (
  schluessel text primary key,
  gemeldet_am timestamptz not null default now()
);

insert into public.einstellungen (schluessel, wert) values
  ('waechter', '{"sms_mindestens": 100, "zeitplan_still_minuten": 30, "sicherung_stunden": 30}')
on conflict (schluessel) do nothing;

update public.einstellungen set wert = jsonb_build_object('checklisten', jsonb_build_object(
  'eintritt_vorlauf_tage', 14,
  'eintritt', jsonb_build_array(
    jsonb_build_object('de', 'Einladung ins CRM senden (am Vortag)', 'fr', 'Envoyer l’invitation au CRM (la veille)'),
    jsonb_build_object('de', 'Handy-App einrichten und Anmeldung testen', 'fr', 'Installer l’app mobile et tester la connexion'),
    jsonb_build_object('de', 'Pflicht-Kurse der Rolle prüfen und erfassen', 'fr', 'Vérifier et saisir les cours obligatoires du rôle'),
    jsonb_build_object('de', 'Geräte, Kleider und Fahrzeug übergeben', 'fr', 'Remettre appareils, vêtements et véhicule'),
    jsonb_build_object('de', '«Erste Schritte» im Handbuch zeigen', 'fr', 'Montrer «Premiers pas» dans le manuel')),
  'austritt', jsonb_build_array(
    jsonb_build_object('de', 'Konto am Stichtag sperren (Einstellungen › Benutzer)', 'fr', 'Bloquer le compte à la date (Réglages › Utilisateurs)'),
    jsonb_build_object('de', 'Geräte und Fahrzeug zurücknehmen', 'fr', 'Reprendre appareils et véhicule'),
    jsonb_build_object('de', 'Zuständigkeiten und offene Aufgaben an die Stellvertretung', 'fr', 'Transmettre responsabilités et tâches ouvertes au remplaçant'),
    jsonb_build_object('de', 'Microsoft-Konto und Postfach abmelden', 'fr', 'Désactiver le compte Microsoft et la boîte mail'))))
  || wert
 where schluessel = 'ressourcen';

/** Glocke einmal pro Ausfall: nur wenn der Schlüssel noch nicht gemeldet ist. Gibt 1 zurück, wenn gemeldet wurde. */
create or replace function intern.waechter_melden(p_schluessel text, p_an uuid[], p_titel_de text, p_titel_fr text,
                                                  p_text_de text, p_text_fr text, p_ziel text) returns int
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(cardinality(p_an), 0) = 0 then return 0; end if;
  insert into intern.dienst_meldungen (schluessel) values (p_schluessel) on conflict do nothing;
  if not found then return 0; end if;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
  select x, 'warnung', p_titel_de, p_titel_fr, p_text_de, p_text_fr, p_ziel, true from unnest(p_an) x;
  return 1;
end
$$;

/**
 * Dienst-Wächter. `p_extern` kommt vom Zeitplan: {"sms": {"ok": true, "credits": 250}, "abaninja": {"ok": false,
 * "meldung": "…"}}; fehlt ein Dienst, bleibt sein Stand unberührt (Aufruf aus pg_cron ohne Angaben).
 * Behobenes löscht die Meldung, damit ein neuer Ausfall wieder läutet. Gibt die Zahl neuer Meldungen zurück.
 */
create or replace function public.dienste_pruefen(p_extern jsonb default '{}') returns int
language plpgsql security definer set search_path = '' as $$
declare
  w jsonb := coalesce((select wert from public.einstellungen where schluessel = 'waechter'), '{}');
  admins uuid[] := intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb);
  n int := 0;
  v record;
  s public.sicherungen;
  credits int;
begin
  -- Microsoft je Person: abgelaufene Anmeldung an die Person selbst und an die Administration
  for v in select m.person_id, p.name, m.fehler is not null and m.token is not null as kaputt
             from intern.microsoft_verbindungen m join public.personen p on p.id = m.person_id
            where p.aktiv and p.geloescht_am is null and m.getrennt_am is null loop
    if v.kaputt then
      n := n + intern.waechter_melden('microsoft:' || v.person_id, array[v.person_id],
        'Microsoft neu verbinden', 'Reconnecter Microsoft',
        'Die Anmeldung ist abgelaufen. Unter Mein Konto › Microsoft neu verbinden, sonst kommen Mails und Kalender nicht mehr.',
        'La connexion a expiré. Reconnecter sous Mon compte › Microsoft, sinon e-mails et agenda ne suivent plus.', '/konto');
      n := n + intern.waechter_melden('microsoft_admin:' || v.person_id, admins,
        'Microsoft getrennt: ' || v.name, 'Microsoft déconnecté : ' || v.name,
        'Mails, Kalender und Posteingang dieser Person laufen nicht. Die Ablage nimmt die nächste verbundene Person.',
        'E-mails, agenda et boîte de réception de cette personne ne suivent plus. Le classement passe par la prochaine personne connectée.',
        '/settings?reiter=verbindungen');
    else
      delete from intern.dienst_meldungen where schluessel in ('microsoft:' || v.person_id, 'microsoft_admin:' || v.person_id);
    end if;
  end loop;

  -- Zeitplan: einzelne Jobs mit Fehler und ein stehender Zeitplan
  for v in select job, ok, meldung from intern.zeitplan_laeufe where job <> 'waechter' loop
    if v.ok is false then
      n := n + intern.waechter_melden('job:' || v.job, admins, 'Zeitplan: «' || v.job || '» schlägt fehl',
        'Planificateur : «' || v.job || '» échoue', 'Meldung: ' || coalesce(v.meldung, '–'),
        'Message : ' || coalesce(v.meldung, '–'), '/settings?reiter=betrieb');
    else
      delete from intern.dienst_meldungen where schluessel = 'job:' || v.job;
    end if;
  end loop;
  if (select max(zuletzt_am) from intern.zeitplan_laeufe)
       < now() - make_interval(mins => coalesce((w ->> 'zeitplan_still_minuten')::int, 30)) then
    n := n + intern.waechter_melden('zeitplan_still', admins, 'Zeitplan steht', 'Planificateur arrêté',
      'Seit über einer halben Stunde lief kein Job: keine Mails, SMS, Automationen und Sicherungen.',
      'Aucune tâche depuis plus d’une demi-heure : pas d’e-mails, SMS, automatisations ni sauvegardes.', '/settings?reiter=betrieb');
  else
    delete from intern.dienst_meldungen where schluessel = 'zeitplan_still';
  end if;

  -- Datensicherung: letzte automatische fehlgeschlagen oder zu lange keine erfolgreiche
  select * into s from public.sicherungen where art = 'automatisch' and status in ('ok', 'fehler', 'abgelaufen')
   order by begonnen_am desc limit 1;
  if found and s.status <> 'ok' then
    n := n + intern.waechter_melden('sicherung:' || s.id, admins, 'Datensicherung fehlgeschlagen', 'Sauvegarde échouée',
      'Sicherung vom ' || to_char(s.begonnen_am at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') || ': ' || coalesce(s.fehler, s.status),
      'Sauvegarde du ' || to_char(s.begonnen_am at time zone 'Europe/Zurich', 'DD.MM.YYYY HH24:MI') || ' : ' || coalesce(s.fehler, s.status),
      '/settings?reiter=sicherung');
  end if;
  if found and (select max(begonnen_am) from public.sicherungen where status = 'ok')
                 < now() - make_interval(hours => coalesce((w ->> 'sicherung_stunden')::int, 30)) then
    n := n + intern.waechter_melden('sicherung_alt', admins, 'Keine aktuelle Datensicherung', 'Pas de sauvegarde récente',
      'Die letzte erfolgreiche Sicherung ist älter als ' || coalesce((w ->> 'sicherung_stunden')::int, 30) || ' Stunden.',
      'La dernière sauvegarde réussie date de plus de ' || coalesce((w ->> 'sicherung_stunden')::int, 30) || ' heures.',
      '/settings?reiter=sicherung');
  else
    delete from intern.dienst_meldungen where schluessel = 'sicherung_alt';
  end if;

  -- SMS (ASPSMS): Verbindung und Guthaben, nur wenn der Zeitplan gemessen hat
  if p_extern ? 'sms' then
    perform public.integration_geprueft('sms', coalesce((p_extern #>> '{sms,ok}')::boolean, false),
      coalesce(p_extern #>> '{sms,meldung}', 'credits:' || coalesce(p_extern #>> '{sms,credits}', '?')));
    credits := (p_extern #>> '{sms,credits}')::int;
    if (p_extern #>> '{sms,ok}')::boolean is false then
      n := n + intern.waechter_melden('sms', admins, 'SMS-Versand gestört', 'Envoi SMS perturbé',
        'ASPSMS antwortet nicht: ' || coalesce(p_extern #>> '{sms,meldung}', '–'),
        'ASPSMS ne répond pas : ' || coalesce(p_extern #>> '{sms,meldung}', '–'), '/settings?reiter=verbindungen');
    else
      delete from intern.dienst_meldungen where schluessel = 'sms';
    end if;
    if credits is not null and credits < coalesce((w ->> 'sms_mindestens')::int, 100) then
      n := n + intern.waechter_melden('sms_guthaben', admins, 'SMS-Guthaben fast leer: ' || credits,
        'Crédit SMS presque épuisé : ' || credits, 'Bei ASPSMS Guthaben nachkaufen, sonst gehen Erinnerungen nicht mehr raus.',
        'Racheter du crédit chez ASPSMS, sinon les rappels ne partent plus.', '/settings?reiter=verbindungen');
    elsif credits is not null then
      delete from intern.dienst_meldungen where schluessel = 'sms_guthaben';
    end if;
  end if;

  -- AbaNinja
  if p_extern ? 'abaninja' then
    perform public.integration_geprueft('abaninja', coalesce((p_extern #>> '{abaninja,ok}')::boolean, false),
      coalesce(p_extern #>> '{abaninja,meldung}', 'ok'));
    if (p_extern #>> '{abaninja,ok}')::boolean is false then
      n := n + intern.waechter_melden('abaninja', admins, 'AbaNinja nicht erreichbar', 'AbaNinja injoignable',
        'Rechnungen und Abgleich warten: ' || coalesce(p_extern #>> '{abaninja,meldung}', '–'),
        'Factures et rapprochement en attente : ' || coalesce(p_extern #>> '{abaninja,meldung}', '–'), '/settings?reiter=verbindungen');
    else
      delete from intern.dienst_meldungen where schluessel = 'abaninja';
    end if;
  end if;

  n := n + public.personal_checklisten() + public.handbuch_pruefen();
  return n;
end
$$;

/**
 * Checklisten aus einstellungen.ressourcen.checklisten: «Neue Person» ab `eintritt_vorlauf_tage` vor dem Eintritt,
 * «Austritt» ab 7 Tagen vor dem Austritt; je Schritt eine Aufgabe an die Administration, je Person nur einmal.
 */
create or replace function public.personal_checklisten() returns int
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb := coalesce((select wert -> 'checklisten' from public.einstellungen where schluessel = 'ressourcen'), '{}');
  heute date := (now() at time zone 'Europe/Zurich')::date;
  admins uuid[] := intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb);
  n int := 0;
  v record;
  art text;
begin
  if coalesce(cardinality(admins), 0) = 0 then return 0; end if;
  for v in select a.person_id, p.name, a.eintritt, a.austritt from public.personal_akten a
             join public.personen p on p.id = a.person_id
            where a.geloescht_am is null and p.geloescht_am is null loop
    foreach art in array array['eintritt', 'austritt'] loop
      continue when (art = 'eintritt' and (v.eintritt is null or v.eintritt < heute - 30
                       or v.eintritt > heute + coalesce((c ->> 'eintritt_vorlauf_tage')::int, 14)))
                 or (art = 'austritt' and (v.austritt is null or v.austritt < heute - 30 or v.austritt > heute + 7));
      insert into intern.dienst_meldungen (schluessel) values (art || ':' || v.person_id) on conflict do nothing;
      continue when not found;
      insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id)
      select concat_ws(': ', s.schritt ->> coalesce(ad.sprache, 'de'), v.name),
             case art when 'eintritt' then case when coalesce(ad.sprache, 'de') = 'fr' then 'Arrivée le ' else 'Eintritt am ' end
                      else case when coalesce(ad.sprache, 'de') = 'fr' then 'Départ le ' else 'Austritt am ' end end
               || to_char(case art when 'eintritt' then v.eintritt else v.austritt end, 'DD.MM.YYYY'),
             case art when 'eintritt' then v.eintritt - case when s.nr = 1 then 1 else 0 end else v.austritt end,
             ad.id, 'personen', v.person_id
        from jsonb_array_elements(coalesce(c -> art, '[]')) with ordinality s(schritt, nr)
        cross join public.personen ad
       where ad.id = any (admins);
      n := n + 1;
    end loop;
  end loop;
  return n;
end
$$;

/** Prozesse im Handbuch mit Stand älter als 12 Monate: Aufgabe «prüfen» an die Administration, einmal je Stand. */
create or replace function public.handbuch_pruefen() returns int
language plpgsql security definer set search_path = '' as $$
declare
  admins uuid[] := intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb);
  heute date := (now() at time zone 'Europe/Zurich')::date;
  n int := 0;
  v record;
begin
  if coalesce(cardinality(admins), 0) = 0 then return 0; end if;
  for v in select h.id, h.titel_de, h.titel_fr, coalesce(h.datum, (h.geaendert_am at time zone 'Europe/Zurich')::date) as stand
             from public.handbuch_eintraege h
            where h.art = 'prozess' and h.geloescht_am is null
              and coalesce(h.datum, (h.geaendert_am at time zone 'Europe/Zurich')::date) < heute - interval '12 months' loop
    insert into intern.dienst_meldungen (schluessel) values ('handbuch:' || v.id || ':' || v.stand) on conflict do nothing;
    continue when not found;
    insert into public.aufgaben (titel, text, faellig_am, person_id)
    select case when coalesce(p.sprache, 'de') = 'fr' then 'Vérifier le processus : ' || coalesce(v.titel_fr, v.titel_de)
                else 'Prozess prüfen: ' || v.titel_de end,
           case when coalesce(p.sprache, 'de') = 'fr' then 'Dernière mise à jour le ' else 'Stand vom ' end
             || to_char(v.stand, 'DD.MM.YYYY') || '. Handbuch › Prozesse.',
           heute + 14, p.id
      from public.personen p where p.id = any (admins);
    n := n + 1;
  end loop;
  return n;
end
$$;

/** Zustand aller Dienste für Einstellungen › Betrieb (nur Administration). */
create or replace function public.dienste_zustand() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  w jsonb := coalesce((select wert from public.einstellungen where schluessel = 'waechter'), '{}');
begin
  if not intern.hat_recht('admin') then raise exception using errcode = '42501', message = 'betrieb.kein_recht'; end if;
  return jsonb_build_object(
    'zeitplan', (select jsonb_build_object('zuletzt', max(zuletzt_am),
                   'ok', max(zuletzt_am) >= now() - make_interval(mins => coalesce((w ->> 'zeitplan_still_minuten')::int, 30)))
                   from intern.zeitplan_laeufe),
    'jobs', coalesce((select jsonb_agg(jsonb_build_object('job', job, 'zuletzt', zuletzt_am, 'meldung', meldung) order by job)
                        from intern.zeitplan_laeufe where ok is false), '[]'),
    'sicherung', (select jsonb_build_object('zuletzt', max(begonnen_am) filter (where status = 'ok'),
                    'ok', coalesce(max(begonnen_am) filter (where status = 'ok')
                                   >= now() - make_interval(hours => coalesce((w ->> 'sicherung_stunden')::int, 30)), false))
                    from public.sicherungen),
    'microsoft', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'ok', m.fehler is null, 'zuletzt', m.genutzt_am,
                                                               'meldung', m.fehler) order by p.name)
                             from intern.microsoft_verbindungen m join public.personen p on p.id = m.person_id
                            where m.token is not null and m.getrennt_am is null and p.aktiv and p.geloescht_am is null), '[]'),
    'integrationen', coalesce((select jsonb_agg(jsonb_build_object('dienst', i.dienst, 'ok', i.zuletzt_ok,
                                                                   'zuletzt', i.zuletzt_geprueft_am, 'meldung', i.meldung) order by i.dienst)
                                 from public.integrationen i where i.geloescht_am is null and i.dienst not in ('microsoft', 'zeitplan')), '[]'),
    'sms_mindestens', coalesce((w ->> 'sms_mindestens')::int, 100));
end
$$;

revoke execute on function intern.waechter_melden(text, uuid[], text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.dienste_pruefen(jsonb) from public, anon, authenticated;
grant execute on function public.dienste_pruefen(jsonb) to service_role;
revoke execute on function public.personal_checklisten() from public, anon, authenticated;
grant execute on function public.personal_checklisten() to service_role;
revoke execute on function public.handbuch_pruefen() from public, anon, authenticated;
grant execute on function public.handbuch_pruefen() to service_role;
revoke execute on function public.dienste_zustand() from public, anon;
grant execute on function public.dienste_zustand() to authenticated;

-- Zweiter Wächter direkt in der Datenbank: fällt auch auf, wenn der Zeitplan selbst steht.
select cron.schedule('crm-waechter', '17 * * * *', 'select public.dienste_pruefen()');
