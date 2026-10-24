-- Phase 13, Teil 3: Automationen mit KI-Entwurf (Bau-Auftrag 3.3/3.4). Eine Mail-Aktion kann «ki» tragen
-- (Textart wie im Assistenten, z. B. «nachfassen»): Die Mail entsteht wie bisher mit dem Vorlagentext im
-- Ausgangskorb und wartet auf Freigabe; der Zeitplan (Job «ki») ersetzt den Text durch den KI-Entwurf im Stil
-- der Firma und der absendenden Person. Hat jemand den Text schon geändert oder freigegeben, bleibt er stehen.
-- Was automatisch hinausgeht, schreibt nie die KI: KI schlägt vor, ein Mensch bestätigt.

create or replace function intern.automation_nach_aussen(a public.automationen, l public.automation_laeufe, nr int,
                                                         x jsonb, ctx jsonb, p_als uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
<<nach_aussen_ki>>
declare
  kanal text := case when x ->> 'art' = 'sms' then 'sms' else 'mail' end;
  spr text := ctx ->> 'sprache';
  an text := case when kanal = 'sms' then ctx #>> '{kontakt,telefon}' else ctx #>> '{kontakt,email}' end;
  absender uuid := coalesce((intern.automation_empfaenger(coalesce(x -> 'absender', '["zustaendig"]'), ctx))[1], p_als);
  frei boolean := a.modus = 'automatisch';
  v_schluessel text := 'automation:' || l.id || ':' || nr;
  sende_ab timestamptz;
  termin timestamptz;
  art text := coalesce(x ->> 'ausgang_art', case when x ->> 'art' = 'zahlungserinnerung' then 'mahnung' else 'automation' end);
  betreff text;
  id uuid;
begin
  if an is null then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', case when kanal = 'sms' then 'kein_telefon' else 'keine_mail' end);
  end if;
  if coalesce((x ->> 'werbung')::boolean, false) and coalesce((ctx #>> '{kontakt,werbesperre}')::boolean, false) then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'werbesperre');
  end if;
  if x ->> 'art' = 'zahlungserinnerung' and coalesce((ctx #>> '{rechnung,offen_chf}')::numeric, 0) <= 0 then
    return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'schon_bezahlt');
  end if;
  if kanal = 'sms' and x ->> 'sende' = 'vortag_termin' and l.tabelle = 'verkaufschancen' then
    select v.termin_am into termin from public.verkaufschancen v where v.id = l.bezug_id;
    if termin is null or termin < now() then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'kein_termin');
    end if;
    -- Gleicher Schlüssel wie die SMS-Erinnerung aus Phase 8: so geht nie eine zweite SMS für denselben Termin.
    v_schluessel := 'sms_erinnerung:' || l.bezug_id || ':' || to_char(termin at time zone 'Europe/Zurich', 'YYYY-MM-DD"T"HH24:MI');
    art := 'sms_erinnerung';
    sende_ab := (((termin at time zone 'Europe/Zurich')::date - 1)
                 + coalesce((select (wert ->> 'uhrzeit')::time from public.einstellungen e where e.schluessel = 'sms_erinnerung'),
                            '16:00'::time)) at time zone 'Europe/Zurich';
    if sende_ab < now() then sende_ab := null; end if;
  end if;
  -- {Absender} ist, wer unterschreibt und sendet (die Mail geht über deren Outlook), nicht unbedingt die zuständige Person.
  ctx := jsonb_set(ctx, '{platzhalter,Absender}',
                   to_jsonb(coalesce((select p.name from public.personen p where p.id = absender), ctx #>> '{platzhalter,Absender}', '')));
  betreff := intern.automation_text(intern.zweisprachig(x -> 'betreff', spr), ctx);
  begin
    id := public.ausgang_anlegen(jsonb_build_object(
      'kanal', kanal, 'art', art, 'an', an, 'betreff', betreff,
      'text', intern.automation_text(intern.zweisprachig(x -> 'text', spr), ctx), 'sprache', spr,
      'absender_person_id', absender, 'kontakt_id', ctx #>> '{kontakt,id}',
      'verkaufschance_id', case when l.tabelle = 'verkaufschancen' then l.bezug_id end,
      'offerte_id', case when l.tabelle = 'offerten' then l.bezug_id end,
      'projekt_id', case when l.tabelle = 'projekte' then l.bezug_id end,
      'bezug_tabelle', l.tabelle, 'bezug_id', l.bezug_id, 'schluessel', v_schluessel, 'sende_ab', sende_ab,
      'freigeben', frei));
  exception when others then
    if sqlerrm = 'ausgang.doppelt' then
      return jsonb_build_object('ergebnis', 'uebersprungen', 'meldung', 'schon_im_ausgang');
    end if;
    raise;
  end;
  -- Phase 13: Soll die KI den Text schreiben, bleibt der Vorlagentext als Rückfall stehen, bis der Zeitplan den
  -- KI-Entwurf eingesetzt hat. Nur «mit Freigabe»: was automatisch hinausgeht, schreibt nie die KI (Bau-Auftrag 3.4).
  if kanal = 'mail' and not frei and nullif(x ->> 'ki', '') is not null then
    update public.ausgangskorb
       set ki_status = 'wartet',
           ki_auftrag = jsonb_build_object('art', x ->> 'ki', 'tabelle', l.tabelle, 'bezug_id', l.bezug_id,
                                           'sprache', spr, 'person_id', absender, 'wunsch', x ->> 'ki_wunsch',
                                           'automation', a.name_de)
     where ausgangskorb.id = nach_aussen_ki.id;
  end if;
  if not frei then
    perform intern.automation_melden(array[absender], 'info',
      jsonb_build_object('de', 'Entwurf wartet auf Freigabe: ' || coalesce(nullif(betreff, ''), 'SMS'),
                         'fr', 'Brouillon à valider : ' || coalesce(nullif(betreff, ''), 'SMS')),
      jsonb_build_object('de', '{Name} · ' || a.name_de, 'fr', '{Name} · ' || a.name_fr),
      ctx, intern.automation_ziel('ausgangskorb', id), l.id);
  end if;
  return jsonb_build_object('ergebnis', 'ok', 'meldung', case when frei then kanal || '_freigegeben' else kanal || '_wartet' end,
                            'werte', jsonb_build_object('an', an, 'absender', intern.personen_namen(array[absender])),
                            'ziel', intern.automation_ziel('ausgangskorb', id));
end
$$;

/** Offene KI-Entwürfe für den Zeitplan (höchstens p_limit). Älter als ein Tag: Vorlagentext bleibt. */
create or replace function public.ki_entwuerfe_offen(p_limit int default 5) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.ausgangskorb set ki_status = 'uebersprungen',
         ki_auftrag = coalesce(ki_auftrag, '{}') || '{"meldung": "zu_alt"}'
   where ki_status = 'wartet' and (erstellt_am < now() - interval '1 day' or status <> 'wartet' or geloescht_am is not null);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'auftrag', a.ki_auftrag, 'betreff', a.betreff, 'text', a.text,
                                        'sprache', a.sprache, 'absender_person_id', a.absender_person_id)
                     order by a.erstellt_am)
      from (select * from public.ausgangskorb where ki_status = 'wartet' and status = 'wartet' and geloescht_am is null
             order by erstellt_am limit greatest(p_limit, 1)) a), '[]');
end
$$;

/**
 * KI-Entwurf einsetzen: nur, solange die Mail noch wartet und der Text noch der Vorlagentext ist (p_vorher).
 * p_ok = false hält den Fehler fest; der Vorlagentext bleibt dann stehen.
 */
create or replace function public.ki_entwurf_einsetzen(p_id uuid, p_ok boolean, p_betreff text, p_text text,
                                                      p_vorher text, p_meldung text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  select * into a from public.ausgangskorb where id = p_id for update;
  if not found or a.ki_status is distinct from 'wartet' then
    return 'nicht_offen';
  end if;
  if not p_ok then
    update public.ausgangskorb set ki_status = 'fehler',
           ki_auftrag = coalesce(ki_auftrag, '{}') || jsonb_build_object('meldung', coalesce(p_meldung, 'fehler'))
     where id = p_id;
    return 'fehler';
  end if;
  if a.status <> 'wartet' or a.geloescht_am is not null or a.text is distinct from p_vorher then
    update public.ausgangskorb set ki_status = 'uebersprungen',
           ki_auftrag = coalesce(ki_auftrag, '{}') || '{"meldung": "schon_bearbeitet"}'
     where id = p_id;
    return 'uebersprungen';
  end if;
  update public.ausgangskorb
     set betreff = coalesce(nullif(trim(p_betreff), ''), betreff), text = p_text, ki_status = 'fertig',
         ki_auftrag = coalesce(ki_auftrag, '{}') || jsonb_build_object('vorlage_text', p_vorher, 'am', now())
   where id = p_id;
  return 'fertig';
end
$$;
revoke execute on function public.ki_entwuerfe_offen(int) from public, anon, authenticated;
revoke execute on function public.ki_entwurf_einsetzen(uuid, boolean, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ki_entwuerfe_offen(int) to service_role;
grant execute on function public.ki_entwurf_einsetzen(uuid, boolean, text, text, text, text) to service_role;

-- Die Vorlage «Offerte nachfassen» versprach es: ab jetzt schreibt die KI den Entwurf (nur mit Freigabe).
update public.automationen
   set aktionen = (select jsonb_agg(case when e ->> 'art' = 'mail' and not e ? 'ki' then e || '{"ki": "nachfassen"}' else e end
                                    order by i)
                     from jsonb_array_elements(aktionen) with ordinality t(e, i)),
       beschreibung_de = 'Ist die Offerte nach 14 Tagen noch offen (Stand «Nachfassen fällig»), schreibt die KI eine Nachfass-Mail in der Sprache des Kunden und im Stil der Firma; sie wartet im Ausgangskorb auf Freigabe. Die zuständige Person bekommt eine Aufgabe.',
       beschreibung_fr = 'Si l’offre est encore ouverte après 14 jours (« À relancer »), l’IA rédige un e-mail de relance dans la langue du client et le style de l’entreprise ; il attend la validation dans la boîte d’envoi. La personne responsable reçoit une tâche.'
 where vorlage = 'offerte_nachfassen' and geloescht_am is null;
