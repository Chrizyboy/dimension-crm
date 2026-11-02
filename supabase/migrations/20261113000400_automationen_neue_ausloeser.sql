-- Automationen vollständig (Entscheid 0041): vier neue Auslöser nach Datum, die Nachfass-Folge 3/10/21 und
-- Vorlagen dazu. Die Durchsicht läuft getrennt von intern.automationen_durchsehen (die parallel ausgebaut wird):
-- automationen_abarbeiten ruft beide auf. Wie überall gilt «nur Neues»: der Bestand beim ersten Durchsehen ist Basis.
--  * lead.ohne_kontakt      Lead offen, seit N Arbeitstagen kein Anruf, keine Mail, kein Besuch (einmal je Lücke)
--  * anlage.jahrestag       Jahrestag der Inbetriebnahme (je Jahr einmal), Bezug ist das Projekt
--  * rechnung.bezahlt       Rechnung ganz bezahlt
--  * garantie.laeuft_ab     Garantie der Anlage endet in N Tagen (Einstellungen), Bezug ist das Projekt

create or replace function intern.automationen_durchsehen_ausbau(p_sofort boolean default false) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.automation_cfg();
  heute date := (now() at time zone 'Europe/Zurich')::date;
  e text;
  basis boolean;
  n int := 0;
  r record;
begin
  if not p_sofort and exists (select 1 from intern.automation_durchsicht where ereignis = '*ausbau'
                                 and zuletzt_am > now() - interval '10 minutes') then
    return 0;
  end if;
  insert into intern.automation_durchsicht (ereignis) values ('*ausbau')
  on conflict (ereignis) do update set zuletzt_am = now();

  foreach e in array array['lead.ohne_kontakt', 'anlage.jahrestag', 'rechnung.bezahlt', 'garantie.laeuft_ab'] loop
    basis := not exists (select 1 from intern.automation_durchsicht where ereignis = e);
    for r in
      select 'verkaufschancen' as tabelle, v.id, v.id || ':' || k.letzter as schluessel,
             jsonb_build_object('letzter_kontakt', k.letzter) as daten
        from public.verkaufschancen v
        cross join lateral (
          select coalesce((select max(a.zeitpunkt)::date from public.aktivitaeten a
                            where a.verkaufschance_id = v.id and a.geloescht_am is null
                              and a.art in ('anruf', 'mail', 'besuch', 'sms', 'brief')),
                          v.eingang_am, v.erstellt_am::date) as letzter) k
       where e = 'lead.ohne_kontakt' and v.geloescht_am is null and v.stufe in ('neu', 'offen')
         and (v.wiedervorlage_am is null or v.wiedervorlage_am <= heute)
         and intern.automation_arbeitstage_plus(k.letzter, coalesce((cfg ->> 'lead_ohne_kontakt_tage')::int, 5)) <= heute
      union all
      select 'projekte', an.projekt_id, an.projekt_id || ':' || extract(year from heute),
             jsonb_build_object('jahre', extract(year from age(heute, an.ibn_am))::int, 'kwp', an.leistung_kwp)
        from public.anlagen an
       where e = 'anlage.jahrestag' and an.geloescht_am is null and an.projekt_id is not null and an.ibn_am is not null
         and an.ibn_am <= heute - interval '1 year'
         and to_char(an.ibn_am, 'MM-DD') between to_char(heute - 6, 'MM-DD') and to_char(heute, 'MM-DD')
      union all
      select 'rechnungen', x.id, x.id::text, jsonb_build_object('bezahlt_am', x.bezahlt_am)
        from public.rechnungen x
       where e = 'rechnung.bezahlt' and x.geloescht_am is null and x.status = 'bezahlt'
         and coalesce(x.bezahlt_am, heute) >= heute - 30
      union all
      select 'projekte', an.projekt_id, an.projekt_id || ':' || an.garantie_bis,
             jsonb_build_object('garantie_bis', an.garantie_bis)
        from public.anlagen an
       where e = 'garantie.laeuft_ab' and an.geloescht_am is null and an.projekt_id is not null
         and an.garantie_bis between heute and heute + coalesce((cfg ->> 'garantie_vorlauf_tage')::int, 60)
    loop
      if intern.automation_signal(e, r.tabelle, r.id, r.schluessel, r.daten, basis) and not basis then n := n + 1; end if;
    end loop;
    insert into intern.automation_durchsicht (ereignis) values (e)
    on conflict (ereignis) do update set zuletzt_am = now();
  end loop;
  return n;
end
$$;

/** Einstieg für den Zeitplan: beide Durchsichten, verteilen, fällige Läufe weiterbringen. */
create or replace function public.automationen_abarbeiten(p_limit int default 50) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_neu int;
  v_signale int := 0;
  v_laeufe int := 0;
  v_lauf uuid;
begin
  v_signale := intern.automationen_durchsehen() + intern.automationen_durchsehen_ausbau();
  v_neu := intern.automationen_verteilen();
  for v_lauf in select id from public.automation_laeufe
                 where stand in ('laeuft', 'wartet') and weiter_am <= now() order by weiter_am limit p_limit loop
    perform intern.automation_lauf_weiter(v_lauf);
    v_laeufe := v_laeufe + 1;
  end loop;
  return jsonb_build_object('signale', v_signale, 'neue_laeufe', v_neu, 'schritte', v_laeufe,
                            'server', (select count(*) from public.automation_laeufe where stand = 'server'));
end
$$;
revoke execute on function public.automationen_abarbeiten(int) from public, anon, authenticated;
grant execute on function public.automationen_abarbeiten(int) to service_role;

/**
 * Was der Ausbau zum Katalog hinzufügt (Auslöser, Aktionen, Platzhalter). Die App fügt es an automation_katalog() an,
 * damit dieser Katalog nicht doppelt gepflegt wird.
 */
create or replace function public.automation_katalog_ausbau() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ereignisse', jsonb_build_array(
      jsonb_build_object('schluessel', 'lead.ohne_kontakt', 'tabelle', 'verkaufschancen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'anlage.jahrestag', 'tabelle', 'projekte', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'rechnung.bezahlt', 'tabelle', 'rechnungen', 'art', 'zeit'),
      jsonb_build_object('schluessel', 'garantie.laeuft_ab', 'tabelle', 'projekte', 'art', 'zeit')),
    'aktionen', jsonb_build_array(
      jsonb_build_object('art', 'wiedervorlage', 'nach_aussen', false),
      jsonb_build_object('art', 'notiz', 'nach_aussen', false)))
$$;
grant execute on function public.automation_katalog_ausbau() to authenticated;

/** Beide Kataloge zusammen (für die Prüfung beim Speichern). */
create or replace function intern.automation_katalog_alle() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'ereignisse', (public.automation_katalog() -> 'ereignisse') || (public.automation_katalog_ausbau() -> 'ereignisse'),
    'aktionen', (public.automation_katalog() -> 'aktionen') || (public.automation_katalog_ausbau() -> 'aktionen'))
$$;

-- Eingeschaltet wird «ab jetzt»: aktiv_seit merken. Wer einschaltet oder ändert, unter dessen Rechten läuft sie.
-- Neu: kennt die Auslöser und Aktionen des Ausbaus, prüft Versandfenster und Wiedervorlage.
create or replace function intern.automation_vor_speichern() returns trigger
language plpgsql set search_path = '' as $$
declare
  x jsonb;
  k jsonb := intern.automation_katalog_alle();
begin
  if new.ausloeser not in (select e ->> 'schluessel' from jsonb_array_elements(k -> 'ereignisse') e) then
    raise exception using errcode = 'P0001', message = 'automation.ausloeser_unbekannt';
  end if;
  if jsonb_typeof(new.aktionen) <> 'array' or jsonb_array_length(new.aktionen) = 0 then
    raise exception using errcode = 'P0001', message = 'automation.keine_aktion';
  end if;
  if jsonb_typeof(new.bedingungen) <> 'array' then
    raise exception using errcode = 'P0001', message = 'automation.bedingungen';
  end if;
  for x in select * from jsonb_array_elements(new.aktionen) loop
    if x ->> 'art' not in (select a ->> 'art' from jsonb_array_elements(k -> 'aktionen') a) then
      raise exception using errcode = 'P0001', message = 'automation.aktion_unbekannt';
    end if;
    if x ->> 'art' in ('warten', 'wiedervorlage') and coalesce((x ->> 'tage')::int, 0) < 1 then
      raise exception using errcode = 'P0001', message = 'automation.warten_tage';
    end if;
  end loop;
  if new.versandfenster is not null and not coalesce((new.versandfenster ->> 'immer')::boolean, false)
     and (jsonb_typeof(new.versandfenster -> 'tage') <> 'array' or jsonb_array_length(new.versandfenster -> 'tage') = 0
          or (new.versandfenster ->> 'von')::time >= (new.versandfenster ->> 'bis')::time) then
    raise exception using errcode = 'P0001', message = 'automation.versandfenster';
  end if;
  if new.aktiv and (tg_op = 'INSERT' or not old.aktiv) then new.aktiv_seit := now(); end if;
  if not new.aktiv then new.aktiv_seit := null; end if;
  new.ausfuehren_als := coalesce(intern.meine_person_id(), new.ausfuehren_als);
  return new;
end
$$;

-- Nachfass-Folge 3/10/21 (Modul-Prüfung 3.1): nur wenn die Vorlage noch so ist, wie sie ausgeliefert wurde.
update public.automationen set
  name_de = 'Offerte gesendet: nachfassen (3, 10, 21 Tage)',
  name_fr = 'Offre envoyée : relancer (3, 10, 21 jours)',
  beschreibung_de = 'Solange die Offerte offen ist: nach 3 Arbeitstagen ein Anruf, nach 10 Tagen eine Nachfass-Mail, die die KI im Stil der Firma schreibt (Freigabe), nach 21 Tagen Wiedervorlage in 3 Monaten mit Notiz.',
  beschreibung_fr = 'Tant que l’offre est ouverte : après 3 jours ouvrables un appel, après 10 jours un e-mail de relance rédigé par l’IA dans le style de l’entreprise (validation), après 21 jours un rappel dans 3 mois avec note.',
  aktionen = $j$[
  {"art": "warten", "tage": 3, "arbeitstage": true},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Kurz anrufen: Offerte {Offerte} ({Name})", "fr": "Appeler : offre {Offerte} ({Name})"},
   "text": {"de": "Fragen klären, nächsten Schritt im Lead festhalten.", "fr": "Clarifier les questions, noter la suite dans le lead."}},
  {"art": "warten", "tage": 7},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"], "ersatz_aufgabe": true, "ki": "nachfassen",
   "betreff": {"de": "Ihre Offerte {Offerte}", "fr": "Votre offre {Offerte}"},
   "text": {"de": "{Anrede}\n\nVor einiger Zeit haben wir Ihnen unsere Offerte {Offerte} geschickt. Haben Sie Fragen dazu, oder dürfen wir etwas anpassen? Gerne besprechen wir die nächsten Schritte mit Ihnen.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nNous vous avons envoyé il y a quelque temps notre offre {Offerte}. Avez-vous des questions ou souhaitez-vous une adaptation ? Nous discutons volontiers de la suite avec vous.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "warten", "tage": 11},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "wiedervorlage", "tage": 90, "text": {"de": "Keine Rückmeldung nach 3 Kontakten (Offerte {Offerte})", "fr": "Pas de réponse après 3 contacts (offre {Offerte})"}},
  {"art": "notiz", "text": {"de": "Nachfassen ohne Antwort: Wiedervorlage in 3 Monaten.", "fr": "Relance sans réponse : rappel dans 3 mois."}}
 ]$j$
 where vorlage = 'offerte_nachfassen' and aktionen -> 0 ->> 'tage' = '14' and jsonb_array_length(aktionen) = 4;

insert into public.automationen (vorlage, reihenfolge, name_de, name_fr, beschreibung_de, beschreibung_fr, aktiv, aktiv_seit,
                                 ausloeser, bedingungen, aktionen) values
('lead_ohne_kontakt', 15,
 'Lead ohne Kontakt: erinnern, dann Stellvertretung',
 'Lead sans contact : rappeler, puis suppléance',
 'Ist ein offener Lead seit 5 Arbeitstagen ohne Anruf, Mail oder Besuch, bekommt die zuständige Person eine Aufgabe. Zwei Arbeitstage später geht eine Meldung an die Leitung, wenn sich nichts getan hat.',
 'Si un lead ouvert est sans appel, e-mail ni visite depuis 5 jours ouvrables, la personne responsable reçoit une tâche. Deux jours ouvrables plus tard, la direction est avertie si rien n’a bougé.',
 true, now(), 'lead.ohne_kontakt', '[]', $j$[
  {"art": "aufgabe", "an": ["zustaendig", "standort:verkauf", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Lead wartet auf Kontakt: {Name}", "fr": "Lead en attente de contact : {Name}"},
   "text": {"de": "Seit 5 Arbeitstagen kein Kontakt. Bitte anrufen oder Wiedervorlage setzen.", "fr": "Aucun contact depuis 5 jours ouvrables. Merci d’appeler ou de fixer un rappel."}},
  {"art": "warten", "tage": 2, "arbeitstage": true},
  {"art": "pruefen", "bedingungen": [{"feld": "lead.stufe", "op": "in", "wert": ["neu", "offen"]}]},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["rolle:admin"],
   "titel": {"de": "Lead seit 7 Arbeitstagen ohne Kontakt: {Name}", "fr": "Lead sans contact depuis 7 jours ouvrables : {Name}"},
   "text": {"de": "{Ort} · Standort {Standort}", "fr": "{Ort} · site {Standort}"}}
 ]$j$),
('anlage_jahrestag', 75,
 'Ein Jahr Anlage: Jahresgruss, Wartung anbieten',
 'Un an d’installation : message annuel, proposer la maintenance',
 'Am Jahrestag der Inbetriebnahme liegt ein kurzer Gruss an den Kunden bereit (nicht bei Werbesperre). Hat er keinen Wartungsvertrag, bekommt der Verkauf die Aufgabe, einen anzubieten.',
 'À l’anniversaire de la mise en service, un court message au client est prêt (sauf blocage publicitaire). Sans contrat de maintenance, la vente reçoit la tâche d’en proposer un.',
 true, now(), 'anlage.jahrestag', '[]', $j$[
  {"art": "mail", "werbung": true, "absender": ["zustaendig", "rolle:admin"],
   "betreff": {"de": "Ein Jahr Sonnenstrom: Ihre Anlage {Projekt}", "fr": "Une année d’énergie solaire : votre installation {Projekt}"},
   "text": {"de": "{Anrede}\n\nVor einem Jahr haben wir Ihre Anlage in Betrieb genommen. Wir hoffen, sie bereitet Ihnen Freude! Falls Ihnen etwas auffällt oder Sie Fragen zum Ertrag haben, melden Sie sich gerne bei uns.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nIl y a un an, nous avons mis en service votre installation. Nous espérons qu’elle vous donne satisfaction ! Si vous remarquez quelque chose ou avez des questions sur la production, n’hésitez pas à nous contacter.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "pruefen", "bedingungen": [{"feld": "kontakt.hat_wartungsvertrag", "op": "=", "wert": false}]},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 5,
   "titel": {"de": "Wartungsvertrag anbieten (1 Jahr Anlage): {Name}", "fr": "Proposer un contrat de maintenance (1 an) : {Name}"}}
 ]$j$),
('rechnung_bezahlt', 95,
 'Rechnung bezahlt: Verkauf informieren',
 'Facture payée : informer la vente',
 'Ist eine Rechnung ganz bezahlt, bekommt die zuständige Person eine Meldung in der Glocke.',
 'Quand une facture est entièrement payée, la personne responsable reçoit un avis dans la cloche.',
 true, now(), 'rechnung.bezahlt', '[]', $j$[
  {"art": "benachrichtigung", "stufe": "ok", "an": ["zustaendig", "rolle:buchhaltung", "rolle:admin"],
   "titel": {"de": "Bezahlt: Rechnung {Rechnung}", "fr": "Payée : facture {Rechnung}"},
   "text": {"de": "{Name} · {Betrag}", "fr": "{Name} · {Betrag}"}}
 ]$j$),
('garantie_laeuft_ab', 85,
 'Garantie läuft ab: Kontrolle anbieten',
 'Garantie bientôt échue : proposer un contrôle',
 'Endet die Garantie einer Anlage in 60 Tagen, bekommt die Projektleitung eine Aufgabe: Anlage prüfen und dem Kunden eine Kontrolle vor Ablauf anbieten.',
 'Si la garantie d’une installation se termine dans 60 jours, la direction de projet reçoit une tâche : vérifier l’installation et proposer un contrôle avant l’échéance.',
 true, now(), 'garantie.laeuft_ab', '[]', $j$[
  {"art": "aufgabe", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 7,
   "titel": {"de": "Garantie läuft bald ab: {Projekt} ({Name})", "fr": "Garantie bientôt échue : {Projekt} ({Name})"},
   "text": {"de": "Monitoring prüfen und Kontrolle vor Ablauf anbieten.", "fr": "Vérifier le monitoring et proposer un contrôle avant l’échéance."}}
 ]$j$)
on conflict (vorlage) do nothing;
