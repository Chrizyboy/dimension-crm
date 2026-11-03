-- Empfehlung und Google-Bewertung (Modul-Prüfung 32A):
--  * Nach der IBN entsteht eine Bewertungsanfrage. Nach `bewertung_tage` schätzt die KI im Zeitplan aus Mail-Verlauf,
--    Notizen und Service-Fällen ein, ob der Kunde zufrieden ist (zufrieden / unklar / unzufrieden, mit Grund).
--  * Jede Anfrage gibt ein Mensch einzeln frei (Klick = Freigabe, nie mehrere auf einmal, nie automatisch). Die Mail
--    enthält den Google-Link und den persönlichen Empfehlungs-Link (nur wenn der Werkvertrag unterschrieben ist).
--  * Empfehlung: Lead mit Code oder «empfohlen von» → Eintrag in `empfehlungen`; unterschreibt der neue Kunde den
--    Werkvertrag, wird die Gutschrift vorgemerkt (Betrag in einstellungen.empfehlung), die Buchhaltung bekommt eine
--    Aufgabe und eine Dankes-Mail wartet im Ausgangskorb auf Freigabe.
--  * Die Bewertungs-Mail der Vorlage «ibn» fällt weg (sonst doppelt); Warten und Wartungsvertrag bleiben.

insert into public.einstellungen (schluessel, wert) values ('empfehlung', jsonb_build_object(
  'aktiv', true,
  'bewertung_tage', 14,
  'gutschrift_rappen', 20000,
  'link', 'https://www.dimension-solaire.ch/empfehlung?code={Code}',
  'mail', jsonb_build_object(
    'de', jsonb_build_object('betreff', 'Wie zufrieden sind Sie mit Ihrer Anlage?',
      'text', E'{Anrede}\n\nIhre Anlage läuft nun seit einigen Wochen. Wir hoffen, Sie sind zufrieden! Über eine kurze Bewertung auf Google freuen wir uns sehr: {Bewertungslink}\n\n{Empfehlung}Herzlichen Dank und freundliche Grüsse\n{Absender}\nDimension Solaire',
      'empfehlung', E'Kennen Sie jemanden, der auch über Solarstrom nachdenkt? Mit Ihrem persönlichen Link erhalten Sie eine Gutschrift von {Gutschrift}, sobald daraus ein Auftrag wird: {Empfehlungslink}\n\n'),
    'fr', jsonb_build_object('betreff', 'Êtes-vous satisfait de votre installation ?',
      'text', E'{Anrede}\n\nVotre installation fonctionne depuis quelques semaines. Nous espérons que vous en êtes satisfait ! Un court avis sur Google nous ferait très plaisir : {Bewertungslink}\n\n{Empfehlung}Un grand merci et meilleures salutations\n{Absender}\nDimension Solaire',
      'empfehlung', E'Vous connaissez quelqu’un qui pense aussi à l’énergie solaire ? Avec votre lien personnel, vous recevez un avoir de {Gutschrift} dès qu’une commande en résulte : {Empfehlungslink}\n\n')),
  'dank_mail', jsonb_build_object(
    'de', jsonb_build_object('betreff', 'Danke für Ihre Empfehlung',
      'text', E'{Anrede}\n\nDank Ihrer Empfehlung dürfen wir eine weitere Solaranlage bauen. Herzlichen Dank! Ihre Gutschrift von {Gutschrift} ist vorgemerkt; wir verrechnen sie mit Ihrer nächsten Wartung oder Rechnung.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire'),
    'fr', jsonb_build_object('betreff', 'Merci pour votre recommandation',
      'text', E'{Anrede}\n\nGrâce à votre recommandation, nous pouvons construire une nouvelle installation solaire. Un grand merci ! Votre avoir de {Gutschrift} est noté ; nous le déduirons de votre prochain entretien ou de votre prochaine facture.\n\nMeilleures salutations\n{Absender}\nDimension Solaire'))))
on conflict (schluessel) do nothing;

update public.einstellungen set wert = jsonb_set(wert, '{funktionen,zufriedenheit}', '"schnell"')
 where schluessel = 'ki' and not (wert -> 'funktionen' ? 'zufriedenheit');

alter table public.kontakte add column empfehlungs_code text unique;
alter table public.verkaufschancen add column empfohlen_von uuid references public.kontakte (id);

create table public.bewertungsanfragen (
  id uuid primary key default gen_random_uuid(),
  kontakt_id uuid not null references public.kontakte (id),
  projekt_id uuid unique references public.projekte (id),
  faellig_am date not null,
  status text not null default 'pruefen' check (status in ('pruefen', 'bereit', 'gesendet', 'verworfen')),
  einschaetzung text check (einschaetzung in ('zufrieden', 'unklar', 'unzufrieden')),
  grund text,
  ohne_ki boolean not null default false,
  geprueft_am timestamptz,
  ausgang_id uuid references public.ausgangskorb (id),
  entschieden_von uuid references public.personen (id),
  entschieden_am timestamptz,
  verworfen_grund text
);
select intern.richte_fachtabelle_ein('bewertungsanfragen');

create table public.empfehlungen (
  id uuid primary key default gen_random_uuid(),
  empfehler_id uuid not null references public.kontakte (id),
  verkaufschance_id uuid unique references public.verkaufschancen (id),
  projekt_id uuid references public.projekte (id),
  status text not null default 'lead' check (status in ('lead', 'auftrag', 'ausbezahlt', 'verfallen')),
  gutschrift_rappen bigint,
  gutschrift_am date,
  ausbezahlt_am date,
  dank_ausgang_id uuid references public.ausgangskorb (id),
  notiz text
);
select intern.richte_fachtabelle_ein('empfehlungen');

-- Die Bewertungs-Mail der Vorlage «ibn» übernimmt jetzt die Bewertungsanfrage mit KI-Einschätzung und Freigabe.
update public.automationen
   set aktionen = (select jsonb_agg(x order by i) from jsonb_array_elements(aktionen) with ordinality t(x, i)
                    where not (x ->> 'art' = 'mail' and x::text like '%Bewertungslink%')),
       beschreibung_de = 'Nach der IBN: Schlussrechnung als Entwurf, Aufgabe Pronovo-Anmeldung und, wenn nach 14 Tagen noch kein Wartungsvertrag besteht, die Aufgabe «Wartungsvertrag anbieten». Die Bitte um Bewertung kommt aus Marketing › Empfehlungen (mit KI-Einschätzung und Freigabe).',
       beschreibung_fr = 'Après la MES : facture finale en brouillon, tâche inscription Pronovo et, sans contrat de maintenance après 14 jours, la tâche « Proposer un contrat de maintenance ». La demande d’avis vient de Marketing › Recommandations (avec estimation IA et validation).'
 where vorlage = 'ibn' and aktionen::text like '%Bewertungslink%';

/** Persönlicher Empfehlungs-Code eines Kontakts (EMP- und 6 Zeichen), beim ersten Mal erzeugt. */
create or replace function public.empfehlungs_code(p_kontakt uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v text;
begin
  if not intern.hat_recht('basis') and auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'empfehlung.kein_recht';
  end if;
  select empfehlungs_code into v from public.kontakte where id = p_kontakt;
  if v is not null then return v; end if;
  loop
    -- Ohne 0/O und 1/I, damit der Code am Telefon eindeutig ist.
    v := 'EMP-' || (select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
                      from generate_series(1, 6));
    exit when not exists (select 1 from public.kontakte where empfehlungs_code = v);
  end loop;
  update public.kontakte set empfehlungs_code = v where id = p_kontakt;
  return v;
end
$$;

/** Text mit Platzhaltern füllen (Anrede, Absender, Links, Gutschrift); unbekannte bleiben sichtbar stehen. */
create or replace function intern.empfehlung_text(p_text text, p_werte jsonb) returns text
language sql immutable set search_path = '' as $$
  select coalesce((select string_agg(case when m[1] ~ '^\{[A-Za-z]+\}$'
                                          then coalesce(p_werte ->> substring(m[1] from 2 for length(m[1]) - 2), m[1])
                                          else m[1] end, '' order by n)
                     from regexp_matches(p_text, '(\{[A-Za-z]+\}|[^{]+|\{)', 'g') with ordinality r(m, n)), '')
$$;

/** Nach der IBN (Anlage entsteht): Bewertungsanfrage, fällig nach `bewertung_tage`; nie für Übernommenes. */
create or replace function intern.bewertung_bei_anlage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'empfehlung'), '{}');
begin
  if coalesce((e ->> 'aktiv')::boolean, true) and new.projekt_id is not null and new.alt_id is null then
    insert into public.bewertungsanfragen (kontakt_id, projekt_id, faellig_am)
    select p.kontakt_id, p.id, coalesce(new.ibn_am, (now() at time zone 'Europe/Zurich')::date)
                               + coalesce((e ->> 'bewertung_tage')::int, 14)
      from public.projekte p where p.id = new.projekt_id and p.kontakt_id is not null and p.alt_id is null
    on conflict (projekt_id) do nothing;
  end if;
  return new;
end
$$;
create trigger bewertung after insert on public.anlagen
  for each row execute function intern.bewertung_bei_anlage();

/** Lead mit Empfehlungs-Code im Kommentar oder in der Notiz: «empfohlen von» und Quelle «Empfehlung» setzen. */
create or replace function intern.lead_empfehlung_erkennen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_von uuid;
begin
  if new.empfohlen_von is null then
    v_code := upper(substring(concat_ws(' ', new.kommentar_kunde, new.notiz_intern) from '(?i)EMP-[2-9A-HJ-NP-Z]{6}'));
    if v_code is not null then
      select id into v_von from public.kontakte where empfehlungs_code = v_code and geloescht_am is null;
      if v_von is not null and v_von is distinct from new.kontakt_id then
        new.empfohlen_von := v_von;
        new.quelle := 'empfehlung';
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger empfehlung_erkennen before insert or update of kommentar_kunde, notiz_intern, empfohlen_von
  on public.verkaufschancen for each row execute function intern.lead_empfehlung_erkennen();

/** Lead mit «empfohlen von»: Eintrag in `empfehlungen` (einmal je Lead). */
create or replace function intern.empfehlung_anlegen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.empfohlen_von is not null and new.geloescht_am is null then
    insert into public.empfehlungen (empfehler_id, verkaufschance_id) values (new.empfohlen_von, new.id)
    on conflict (verkaufschance_id) do update set empfehler_id = excluded.empfehler_id
      where public.empfehlungen.status = 'lead';
  end if;
  return new;
end
$$;
create trigger empfehlung_anlegen after insert or update of empfohlen_von on public.verkaufschancen
  for each row execute function intern.empfehlung_anlegen();

/**
 * Werkvertrag des empfohlenen Kunden unterschrieben: Gutschrift vormerken (Betrag aus den Einstellungen), Aufgabe an
 * die Buchhaltung, Dankes-Mail an den Empfehler in den Ausgangskorb (wartet auf Freigabe, nicht bei Werbesperre).
 */
create or replace function intern.empfehlung_bei_vertrag() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'empfehlung'), '{}');
  emp public.empfehlungen;
  k public.kontakte;
  betrag bigint := coalesce((e ->> 'gutschrift_rappen')::bigint, 0);
  spr text;
  v_ausgang uuid;
  v_wer uuid[] := intern.automation_empfaenger('["rolle:buchhaltung", "rolle:admin"]'::jsonb, '{}'::jsonb);
  v_vorher text;
begin
  if new.unterzeichnet_am is null or old.unterzeichnet_am is not null or new.verkaufschance_id is null then return new; end if;
  select * into emp from public.empfehlungen where verkaufschance_id = new.verkaufschance_id and status = 'lead'
     and geloescht_am is null;
  if not found then return new; end if;
  select * into k from public.kontakte where id = emp.empfehler_id;
  spr := coalesce(k.sprache, 'de');
  if k.email is not null and not coalesce(k.werbesperre, false) then
    -- Absender ist die verantwortliche Person, nicht wer gerade unterschreibt: wie bei Automationen erlaubt.
    v_vorher := current_setting('intern.automation', true);
    perform set_config('intern.automation', 'an', true);
    v_ausgang := public.ausgang_anlegen(jsonb_build_object(
      'art', 'empfehlung_dank', 'an', k.email, 'sprache', spr, 'kontakt_id', k.id,
      'absender_person_id', coalesce(new.verantwortlich_id, v_wer[1]),
      'bezug_tabelle', 'empfehlungen', 'bezug_id', emp.id, 'schluessel', 'empfehlung_dank:' || emp.id,
      'betreff', e #>> array['dank_mail', spr, 'betreff'],
      'text', intern.empfehlung_text(e #>> array['dank_mail', spr, 'text'], jsonb_build_object(
        'Anrede', intern.anrede_text(k.vorname, k.nachname, spr), 'Gutschrift', intern.chf_text(betrag),
        'Absender', coalesce((select name from public.personen where id = coalesce(new.verantwortlich_id, v_wer[1])), '')))));
    perform set_config('intern.automation', coalesce(v_vorher, ''), true);
  end if;
  update public.empfehlungen set status = 'auftrag', projekt_id = new.id, gutschrift_rappen = betrag,
         gutschrift_am = new.unterzeichnet_am, dank_ausgang_id = v_ausgang
   where id = emp.id;
  insert into public.aufgaben (titel, text, faellig_am, person_id, bezug_tabelle, bezug_id)
  select 'Gutschrift Empfehlung vormerken: ' || intern.kontaktname(k), intern.chf_text(betrag) || ' für die Empfehlung von '
           || coalesce(new.nummer, '') || '. Mit der nächsten Wartung oder Rechnung verrechnen, dann unter Marketing › Empfehlungen als ausbezahlt markieren.',
         (now() at time zone 'Europe/Zurich')::date + 7, x, 'kontakte', k.id
    from unnest(v_wer) x;
  return new;
end
$$;
create trigger empfehlung_vertrag after update of unterzeichnet_am on public.projekte
  for each row execute function intern.empfehlung_bei_vertrag();

/** Daten für die KI-Einschätzung: Mails, Notizen, Anrufe, Posteingang und Service-Fälle des Kunden (ohne Adresse). */
create or replace function intern.zufriedenheit_kontext(p_kontakt uuid, p_projekt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'projekt', (select jsonb_build_object('nummer', p.nummer, 'titel', p.titel, 'unterzeichnet', p.unterzeichnet_am,
                                          'baubeginn', p.baubeginn) from public.projekte p where p.id = p_projekt),
    'verlauf', coalesce((select jsonb_agg(jsonb_build_object('am', a.zeitpunkt::date, 'art', a.art, 'richtung', a.richtung,
                                                             'text', left(a.text, 400), 'ergebnis', a.ergebnis) order by a.zeitpunkt desc)
                           from (select * from public.aktivitaeten where kontakt_id = p_kontakt and geloescht_am is null
                                    and art in ('mail', 'anruf', 'notiz') order by zeitpunkt desc limit 25) a), '[]'),
    'posteingang', coalesce((select jsonb_agg(jsonb_build_object('am', m.eingang_am::date, 'betreff', m.betreff,
                                                                 'inhalt', left(coalesce(m.zusammenfassung, m.vorschau), 400)) order by m.eingang_am desc)
                               from (select * from public.posteingang where kontakt_id = p_kontakt and geloescht_am is null
                                        order by eingang_am desc limit 15) m), '[]'),
    'service', coalesce((select jsonb_agg(jsonb_build_object('eroeffnet', f.erstellt_am::date, 'titel', f.titel, 'status', f.status,
                                                             'prioritaet', f.prioritaet, 'garantie', f.garantie, 'erledigt', f.erledigt_am)
                                          order by f.erstellt_am desc)
                           from public.service_faelle f where f.kontakt_id = p_kontakt and f.geloescht_am is null), '[]'),
    'nachtraege_abgelehnt', (select count(*) from public.nachtraege n join public.rapporte r on r.id = n.rapport_id
                              where r.projekt_id = p_projekt and n.status = 'abgelehnt'))
$$;

/** Fällige Anfragen für die KI-Einschätzung im Zeitplan (nur Dienst-Rolle). */
create or replace function public.bewertungen_offen(p_limit int default 10)
returns table (id uuid, sprache text, kontext jsonb)
language sql stable security definer set search_path = '' as $$
  select b.id, coalesce(k.sprache, 'de'), intern.zufriedenheit_kontext(b.kontakt_id, b.projekt_id)
    from public.bewertungsanfragen b join public.kontakte k on k.id = b.kontakt_id
   where b.status = 'pruefen' and b.geloescht_am is null and b.faellig_am <= (now() at time zone 'Europe/Zurich')::date
   order by b.faellig_am limit p_limit
$$;

/** Einschätzung speichern (p: einschaetzung, grund, ohne_ki) und den Zuständigen per Glocke melden. */
create or replace function public.bewertung_einschaetzen(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.bewertungsanfragen;
  v_e text := case when p ->> 'einschaetzung' in ('zufrieden', 'unklar', 'unzufrieden') then p ->> 'einschaetzung' else 'unklar' end;
  v_name text;
  v_wer uuid[];
begin
  update public.bewertungsanfragen set einschaetzung = v_e, grund = left(p ->> 'grund', 500),
         ohne_ki = coalesce((p ->> 'ohne_ki')::boolean, false), status = 'bereit', geprueft_am = now()
   where id = p_id and status = 'pruefen'
  returning * into b;
  if not found then return; end if;
  select intern.kontaktname(k) into v_name from public.kontakte k where k.id = b.kontakt_id;
  select coalesce(array_agg(p2.verantwortlich_id) filter (where p2.verantwortlich_id is not null), '{}') into v_wer
    from public.projekte p2 where p2.id = b.projekt_id;
  if cardinality(v_wer) = 0 then v_wer := intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb); end if;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select x, case v_e when 'unzufrieden' then 'warnung' else 'info' end,
         'Bewertungsanfrage prüfen: ' || v_name, 'Demande d’avis à vérifier : ' || v_name,
         case v_e when 'zufrieden' then 'KI: wirkt zufrieden.' when 'unzufrieden' then 'KI: wirkt unzufrieden, besser zuerst anrufen.'
                  else 'KI: unklar.' end || coalesce(' ' || left(b.grund, 200), ''),
         case v_e when 'zufrieden' then 'IA : semble satisfait.' when 'unzufrieden' then 'IA : semble insatisfait, mieux vaut appeler d’abord.'
                  else 'IA : incertain.' end || coalesce(' ' || left(b.grund, 200), ''),
         '/marketing?ansicht=empfehlungen'
    from unnest(v_wer) x;
end
$$;

/**
 * Eine Anfrage senden: Klick = Freigabe dieser einen Mail (Regel 6). Mit Google-Link (automationen.bewertung_link)
 * und, wenn der Werkvertrag unterschrieben ist, dem persönlichen Empfehlungs-Link. Nicht bei Werbesperre.
 */
create or replace function public.bewertung_senden(p_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bewertungsanfragen;
  k public.kontakte;
  e jsonb := coalesce((select wert from public.einstellungen where schluessel = 'empfehlung'), '{}');
  link text := (select wert ->> 'bewertung_link' from public.einstellungen where schluessel = 'automationen');
  spr text;
  v_empf text := '';
  v_id uuid;
  ich uuid := intern.meine_person_id();
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'empfehlung.kein_recht'; end if;
  select * into b from public.bewertungsanfragen where id = p_id and geloescht_am is null for update;
  if not found or b.status <> 'bereit' then raise exception using errcode = 'P0001', message = 'empfehlung.nicht_bereit'; end if;
  if nullif(trim(coalesce(link, '')), '') is null then raise exception using errcode = 'P0001', message = 'empfehlung.kein_bewertungslink'; end if;
  select * into k from public.kontakte where id = b.kontakt_id;
  if coalesce(k.werbesperre, false) then raise exception using errcode = 'P0001', message = 'empfehlung.werbesperre'; end if;
  if k.email is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  spr := coalesce(k.sprache, 'de');
  if exists (select 1 from public.projekte where id = b.projekt_id and unterzeichnet_am is not null) then
    v_empf := intern.empfehlung_text(e #>> array['mail', spr, 'empfehlung'], jsonb_build_object(
      'Gutschrift', intern.chf_text(coalesce((e ->> 'gutschrift_rappen')::bigint, 0)),
      'Empfehlungslink', replace(coalesce(e ->> 'link', ''), '{Code}', public.empfehlungs_code(k.id))));
  end if;
  v_id := public.ausgang_anlegen(jsonb_build_object(
    'art', 'bewertung', 'an', k.email, 'sprache', spr, 'kontakt_id', k.id, 'projekt_id', b.projekt_id,
    'bezug_tabelle', 'bewertungsanfragen', 'bezug_id', b.id, 'schluessel', 'bewertung:' || b.id, 'freigeben', true,
    'betreff', e #>> array['mail', spr, 'betreff'],
    'text', intern.empfehlung_text(e #>> array['mail', spr, 'text'], jsonb_build_object(
      'Anrede', intern.anrede_text(k.vorname, k.nachname, spr), 'Bewertungslink', link, 'Empfehlung', v_empf,
      'Absender', coalesce((select name from public.personen where id = ich), '')))));
  update public.bewertungsanfragen set status = 'gesendet', ausgang_id = v_id, entschieden_von = ich, entschieden_am = now()
   where id = p_id;
  return v_id;
end
$$;

/** Anfrage nicht senden (mit Grund, z. B. «Kunde hat reklamiert»). */
create or replace function public.bewertung_verwerfen(p_id uuid, p_grund text default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'empfehlung.kein_recht'; end if;
  update public.bewertungsanfragen set status = 'verworfen', verworfen_grund = nullif(trim(p_grund), ''),
         entschieden_von = intern.meine_person_id(), entschieden_am = now()
   where id = p_id and status in ('pruefen', 'bereit') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'empfehlung.nicht_bereit'; end if;
end
$$;

/** Gutschrift ausbezahlt bzw. verrechnet (nur Recht «finanzen»). */
create or replace function public.empfehlung_ausbezahlt(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = '42501', message = 'finanzen.kein_recht'; end if;
  update public.empfehlungen set status = 'ausbezahlt', ausbezahlt_am = (now() at time zone 'Europe/Zurich')::date
   where id = p_id and status = 'auftrag' and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'empfehlung.nicht_bereit'; end if;
end
$$;

/** Liste für Marketing › Empfehlungen: Anfragen und Empfehlungen mit Namen (Rechte der lesenden Person). */
create or replace view public.bewertungsanfragen_liste with (security_invoker = true) as
  select b.id, b.status, b.faellig_am, b.einschaetzung, b.grund, b.ohne_ki, b.geprueft_am, b.entschieden_am,
         b.verworfen_grund, b.kontakt_id, b.projekt_id, intern.kontaktname(k) as kunde, k.email, k.werbesperre,
         coalesce(k.sprache, 'de') as sprache, p.nummer as projekt_nummer, o.ort, pe.name as entschieden_von
    from public.bewertungsanfragen b join public.kontakte k on k.id = b.kontakt_id
    left join public.projekte p on p.id = b.projekt_id left join public.objekte o on o.id = p.objekt_id
    left join public.personen pe on pe.id = b.entschieden_von
   where b.geloescht_am is null;

create or replace view public.empfehlungen_liste with (security_invoker = true) as
  select e.id, e.status, e.gutschrift_rappen, e.gutschrift_am, e.ausbezahlt_am, e.erstellt_am, e.empfehler_id,
         intern.kontaktname(k) as empfehler, e.verkaufschance_id, v.nummer as lead_nummer, intern.kontaktname(kn) as neukunde,
         e.projekt_id, p.nummer as projekt_nummer
    from public.empfehlungen e join public.kontakte k on k.id = e.empfehler_id
    left join public.verkaufschancen v on v.id = e.verkaufschance_id left join public.kontakte kn on kn.id = v.kontakt_id
    left join public.projekte p on p.id = e.projekt_id
   where e.geloescht_am is null;

revoke execute on function intern.empfehlung_text(text, jsonb) from public, anon;
grant execute on function intern.empfehlung_text(text, jsonb) to authenticated;
revoke execute on function intern.bewertung_bei_anlage() from public, anon, authenticated;
revoke execute on function intern.lead_empfehlung_erkennen() from public, anon, authenticated;
revoke execute on function intern.empfehlung_anlegen() from public, anon, authenticated;
revoke execute on function intern.empfehlung_bei_vertrag() from public, anon, authenticated;
revoke execute on function intern.zufriedenheit_kontext(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.empfehlungs_code(uuid) from public, anon;
grant execute on function public.empfehlungs_code(uuid) to authenticated, service_role;
revoke execute on function public.bewertungen_offen(int) from public, anon, authenticated;
grant execute on function public.bewertungen_offen(int) to service_role;
revoke execute on function public.bewertung_einschaetzen(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.bewertung_einschaetzen(uuid, jsonb) to service_role;
revoke execute on function public.bewertung_senden(uuid) from public, anon;
grant execute on function public.bewertung_senden(uuid) to authenticated;
revoke execute on function public.bewertung_verwerfen(uuid, text) from public, anon;
grant execute on function public.bewertung_verwerfen(uuid, text) to authenticated;
revoke execute on function public.empfehlung_ausbezahlt(uuid) from public, anon;
grant execute on function public.empfehlung_ausbezahlt(uuid) to authenticated;
grant select on public.bewertungsanfragen_liste, public.empfehlungen_liste to authenticated;
