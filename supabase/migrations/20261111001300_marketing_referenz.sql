-- Marketing Stufe 1 (Modul-Prüfung 34B):
--  * Rapport: Häkchen «Fotos für Werbung erlaubt» (rapporte.fotos_werbung), gesetzt beim Abschluss.
--  * Referenz-Post: Nach der IBN entsteht, wenn der Kunde Fotos erlaubt hat und es Fotos gibt, ein Entwurf für
--    Instagram, Facebook und LinkedIn (DE/FR, nur Ort und Anlage, nie Name oder Adresse). Veröffentlicht wird erst
--    nach der Freigabe im Marketing (Regel 6).
--  * Nachrüst-Mail: fertige Mail-Entwürfe je Merkmal in einstellungen.marketing.nachruest (Serien-Mail).

alter table public.rapporte add column fotos_werbung boolean not null default false;

update public.einstellungen set wert = jsonb_build_object(
  'referenz_post', jsonb_build_object(
    'de', 'Neue Referenzanlage in {Ort}: {Anlage} ist am Netz. Danke für das Vertrauen! ☀️ #Photovoltaik #Solarenergie #DimensionSolaire',
    'fr', 'Nouvelle installation de référence à {Ort} : {Anlage} est en service. Merci pour votre confiance ! ☀️ #Photovoltaïque #ÉnergieSolaire #DimensionSolaire'),
  'nachruest', jsonb_build_object(
    'ohne_batterie', jsonb_build_object(
      'de', jsonb_build_object('betreff', 'Ihre Solaranlage: Sonnenstrom auch am Abend nutzen',
        'text', E'{Anrede}\n\nIhre Solaranlage produziert tagsüber oft mehr Strom, als Sie gerade brauchen. Mit einem Batteriespeicher nutzen Sie diesen Strom auch am Abend und in der Nacht und kaufen deutlich weniger Strom vom Netz.\n\nGerne prüfen wir kostenlos, welcher Speicher zu Ihrer Anlage passt, und machen Ihnen ein unverbindliches Angebot. Antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}'),
      'fr', jsonb_build_object('betreff', 'Votre installation solaire : profiter du soleil aussi le soir',
        'text', E'{Anrede}\n\nVotre installation solaire produit souvent plus d’électricité que vous n’en consommez pendant la journée. Avec une batterie, vous utilisez cette électricité le soir et la nuit et achetez nettement moins au réseau.\n\nNous vérifions volontiers gratuitement quelle batterie convient à votre installation et vous faisons une offre sans engagement. Il suffit de répondre à cet e-mail.\n\nMeilleures salutations\n{Absender}')),
    'ohne_wallbox', jsonb_build_object(
      'de', jsonb_build_object('betreff', 'Mit Ihrem Sonnenstrom Auto fahren',
        'text', E'{Anrede}\n\nFahren Sie elektrisch oder denken Sie darüber nach? Mit einer Ladestation laden Sie Ihr Auto direkt mit dem Strom Ihrer Solaranlage, günstig und sauber.\n\nGerne zeigen wir Ihnen, welche Ladestation zu Ihrer Anlage passt, und machen Ihnen ein unverbindliches Angebot. Antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}'),
      'fr', jsonb_build_object('betreff', 'Rouler avec votre électricité solaire',
        'text', E'{Anrede}\n\nVous roulez à l’électrique ou y pensez ? Avec une borne de recharge, vous rechargez votre voiture directement avec l’électricité de votre installation solaire, à bas prix et proprement.\n\nNous vous montrons volontiers quelle borne convient à votre installation et vous faisons une offre sans engagement. Il suffit de répondre à cet e-mail.\n\nMeilleures salutations\n{Absender}')),
    'ohne_waermepumpe', jsonb_build_object(
      'de', jsonb_build_object('betreff', 'Heizen mit Ihrem Sonnenstrom',
        'text', E'{Anrede}\n\nEine Wärmepumpe passt ideal zu Ihrer Solaranlage: Sie heizen und machen Warmwasser zu einem grossen Teil mit eigenem Strom und unabhängig von Öl und Gas. Für den Ersatz der Heizung gibt es oft Fördergelder.\n\nGerne beraten wir Sie kostenlos und machen Ihnen ein unverbindliches Angebot. Antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}'),
      'fr', jsonb_build_object('betreff', 'Se chauffer avec votre électricité solaire',
        'text', E'{Anrede}\n\nUne pompe à chaleur s’accorde parfaitement avec votre installation solaire : vous chauffez et produisez l’eau chaude en grande partie avec votre propre électricité, sans dépendre du mazout ni du gaz. Le remplacement du chauffage est souvent subventionné.\n\nNous vous conseillons volontiers gratuitement et vous faisons une offre sans engagement. Il suffit de répondre à cet e-mail.\n\nMeilleures salutations\n{Absender}')),
    'alt', jsonb_build_object(
      'de', jsonb_build_object('betreff', 'Ihre Solaranlage: Zeit für einen Check',
        'text', E'{Anrede}\n\nIhre Solaranlage läuft nun schon einige Jahre. Mit einer Kontrolle stellen wir sicher, dass sie weiterhin den vollen Ertrag bringt, und prüfen, ob sich ein Speicher oder eine Ladestation für Sie lohnt.\n\nGerne vereinbaren wir einen Termin. Antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n{Absender}'),
      'fr', jsonb_build_object('betreff', 'Votre installation solaire : le moment d’un contrôle',
        'text', E'{Anrede}\n\nVotre installation solaire fonctionne depuis quelques années. Un contrôle permet de s’assurer qu’elle produit toujours au maximum et de voir si une batterie ou une borne de recharge vous serait utile.\n\nNous convenons volontiers d’un rendez-vous. Il suffit de répondre à cet e-mail.\n\nMeilleures salutations\n{Absender}'))))
  || wert
 where schluessel = 'marketing';

/**
 * Referenz-Post nach der IBN als Entwurf: nur wenn ein Rapport des Projekts «Fotos für Werbung» hat und es Fotos
 * gibt (Dach zuerst, höchstens 4), je Projekt einmal. Text aus einstellungen.marketing.referenz_post mit {Ort}
 * (Gemeinde) und {Anlage} (Leistung, Speicher), nie Name oder Adresse. Glocke an die Administration.
 */
create or replace function intern.referenz_post_entwurf(p_projekt uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  vorlage jsonb := (select wert -> 'referenz_post' from public.einstellungen where schluessel = 'marketing');
  v_bilder jsonb;
  v_ort text;
  v_kwp numeric;
  v_batterie boolean;
  v_anlage uuid;
  v_de text;
  v_fr text;
  v_id uuid;
begin
  if p_projekt is null or vorlage is null
     or not exists (select 1 from public.rapporte where projekt_id = p_projekt and fotos_werbung and geloescht_am is null)
     or exists (select 1 from public.social_posts where details ->> 'projekt_id' = p_projekt::text and geloescht_am is null) then
    return null;
  end if;
  select coalesce(jsonb_agg(x.id), '[]') into v_bilder from (
    select d.id from public.dokumente d join public.rapporte r on r.id = d.bezug_id
     where d.bezug_tabelle = 'rapporte' and r.projekt_id = p_projekt and d.ordner = 'fotos' and d.geloescht_am is null
       and r.geloescht_am is null
     order by case d.kategorie when 'dach' then 0 when 'wechselrichter' then 2 when 'zaehler' then 3 else 1 end, d.erstellt_am
     limit 4) x;
  if jsonb_array_length(v_bilder) = 0 then return null; end if;

  select a.id, a.leistung_kwp, coalesce(a.komponenten @> '[{"art": "batterie"}]', false), coalesce(nullif(o.gemeinde, ''), o.ort)
    into v_anlage, v_kwp, v_batterie, v_ort
    from public.projekte p left join public.objekte o on o.id = p.objekt_id
    left join public.anlagen a on a.projekt_id = p.id and a.geloescht_am is null
   where p.id = p_projekt limit 1;
  v_de := replace(replace(vorlage ->> 'de', '{Ort}', coalesce(v_ort, 'der Region')), '{Anlage}',
            concat_ws(' ', 'eine', case when v_kwp is not null then trim(to_char(v_kwp, 'FM999990.0')) || '-kWp-' end || 'Photovoltaik-Anlage')
            || case when v_batterie then ' mit Batteriespeicher' else '' end);
  v_fr := replace(replace(vorlage ->> 'fr', '{Ort}', coalesce(v_ort, 'la région')), '{Anlage}',
            'une installation photovoltaïque' || case when v_kwp is not null then ' de ' || trim(to_char(v_kwp, 'FM999990.0')) || ' kWc' else '' end
            || case when v_batterie then ' avec batterie' else '' end);
  insert into public.social_posts (thema, idee, netzwerke, format, sprache, texte, bilder, status, verfasst_von, details)
  values ('Referenzanlage', concat_ws(' · ', v_ort, case when v_kwp is not null then trim(to_char(v_kwp, 'FM999990.0')) || ' kWp' end,
                                       case when v_batterie then 'Batterie' end),
          array['instagram', 'facebook', 'linkedin'], 'quadrat', 'de_fr',
          jsonb_build_object('instagram', jsonb_build_object('de', v_de, 'fr', v_fr),
                             'facebook', jsonb_build_object('de', v_de, 'fr', v_fr),
                             'linkedin', jsonb_build_object('de', v_de, 'fr', v_fr)),
          v_bilder, 'entwurf', 'crm',
          jsonb_strip_nulls(jsonb_build_object('quelle', 'anlage', 'anlage_id', v_anlage, 'projekt_id', p_projekt)))
  returning id into v_id;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x, 'info', 'Referenz-Post bereit: ' || coalesce(v_ort, 'neue Anlage'), 'Post de référence prêt : ' || coalesce(v_ort, 'nouvelle installation'),
         'Der Kunde hat Fotos erlaubt. Entwurf mit Fotos aus dem Rapport prüfen und freigeben.',
         'Le client a autorisé les photos. Vérifier et valider le brouillon avec les photos du rapport.', '/marketing?ansicht=social'
    from unnest(intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb)) x;
  return v_id;
end
$$;
-- Läuft aus rapport_abschliessen (Rechte der Person am Handy); legt nur unter den Bedingungen oben einen Entwurf an.
revoke execute on function intern.referenz_post_entwurf(uuid) from public, anon;
grant execute on function intern.referenz_post_entwurf(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.rapport_abschliessen(p_id uuid, p jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  r public.rapporte;
  v_unterschrift jsonb;
  v_stopp timestamptz := coalesce(nullif(p ->> 'stopp', '')::timestamptz, now());
  v_text text;
begin
  select * into r from public.rapporte where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'baustelle.rapport_nicht_gefunden'; end if;
  if r.abgeschlossen_am is not null then return; end if;  -- Wiederholung nach Funkloch
  if nullif(trim(coalesce(p -> 'unterschrift' ->> 'name', '')), '') is not null and nullif(p -> 'unterschrift' ->> 'dokument_id', '') is not null then
    v_unterschrift := jsonb_build_object('name', trim(p -> 'unterschrift' ->> 'name'), 'dokument_id', p -> 'unterschrift' ->> 'dokument_id',
                                         'am', coalesce(p -> 'unterschrift' ->> 'am', now()::text));
  elsif nullif(trim(coalesce(p ->> 'ohne_unterschrift', '')), '') is not null then
    v_unterschrift := jsonb_build_object('ohne', trim(p ->> 'ohne_unterschrift'), 'am', now());
  else
    raise exception using errcode = 'P0001', message = 'baustelle.unterschrift_fehlt';
  end if;
  if nullif(trim(coalesce(r.arbeiten, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'baustelle.arbeiten_fehlen';
  end if;
  if r.art in ('service', 'wartung') and coalesce(nullif(p ->> 'verrechnung', ''), r.verrechnung) is null then
    raise exception using errcode = 'P0001', message = 'baustelle.verrechnung_fehlt';
  end if;

  update public.zeiten set stopp = greatest(v_stopp, start + interval '1 minute')
   where rapport_id = p_id and stopp is null and geloescht_am is null;
  update public.rapporte set unterschrift_kunde = v_unterschrift, abgeschlossen_am = now(),
         montage_fertig = coalesce((p ->> 'montage_fertig')::boolean, montage_fertig),
         verrechnung = coalesce(nullif(p ->> 'verrechnung', ''), verrechnung),
         fotos_werbung = coalesce((p ->> 'fotos_werbung')::boolean, fotos_werbung)
   where id = p_id
  returning * into r;

  if v_unterschrift ? 'dokument_id' then
    update public.nachtraege set status = 'vom_kunden_bestaetigt', bestaetigt_am = now(), unterschrift_kunde = v_unterschrift
     where rapport_id = p_id and status = 'offen' and geloescht_am is null;
  end if;

  v_text := r.nummer || ': ' || left(coalesce(r.arbeiten, ''), 300);
  if r.art = 'montage' and r.montage_fertig and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), bau_status = 'ibn'
     where id = r.projekt_id and coalesce(bau_status, 'ausstehend') in ('ausstehend', 'terminiert');
  elsif r.art = 'ibn' and r.projekt_id is not null then
    update public.projekte set bau_vorher = intern.bau_merken(id), status = 'abgeschlossen', bau_status = 'fertig'
     where id = r.projekt_id and coalesce(bau_status, '') <> 'fertig';
    perform intern.anlage_zum_projekt(r.projekt_id, r.datum);
    perform intern.referenz_post_entwurf(r.projekt_id);
  elsif r.art = 'service' and r.service_fall_id is not null then
    update public.service_faelle
       set verlauf = verlauf || jsonb_build_array(jsonb_build_object('am', now(), 'person_id', intern.meine_person_id(),
                                                                    'text', v_text, 'rapport_id', r.id)),
           status = case when coalesce((p ->> 'fall_erledigt')::boolean, false) then 'erledigt' else status end
     where id = r.service_fall_id;
  elsif r.art = 'wartung' and r.wartungsvertrag_id is not null then
    perform public.wartung_erledigt(r.wartungsvertrag_id, r.datum, v_text);
  end if;
end
$function$

;
