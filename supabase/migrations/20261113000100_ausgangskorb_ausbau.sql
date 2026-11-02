-- Ausgangskorb vollständig (2.11.2026, Entscheid 0041): Werkbank «Für mich», Prüfungen vor dem Senden, Zusammenhang,
-- mehrere auf einmal freigeben, später senden, kurzes «Rückgängig», «Zurück an …» mit Notiz, Fehler mit Lösung,
-- Briefe als eigener Kanal und eine Glocke, wenn etwas zu lange wartet.
-- Wer welche Art freigeben darf, steht in einstellungen.ausgang_freigabe (Art → Recht). Erzwungen wird das vom Trigger
-- aus der Migration «rechte_nach_golive» (PR #45); hier wird es nur angezeigt, damit beide Schritte unabhängig bleiben.

alter table public.ausgangskorb
  add column if not exists rueckgaengig_bis timestamptz,
  add column if not exists zurueck_an       uuid references public.personen (id),
  add column if not exists zurueck_von      uuid references public.personen (id),
  add column if not exists zurueck_notiz    text,
  add column if not exists zurueck_am       timestamptz,
  add column if not exists verworfen_von    uuid references public.personen (id),
  add column if not exists erinnert_am      timestamptz,
  add column if not exists ruecklauf_am     timestamptz;

comment on column public.ausgangskorb.rueckgaengig_bis is 'Bis wann eine Freigabe noch zurückgeholt werden kann; vorher sendet der Server nicht.';
comment on column public.ausgangskorb.zurueck_an is '«Zurück an …»: wer den Eintrag nochmals ansehen soll (mit Notiz).';
comment on column public.ausgangskorb.ruecklauf_am is 'Nur Briefe: unterschriebene Antwort ist zurück.';

-- Arten, die ein bestimmtes Recht brauchen (gleich wie «rechte_nach_golive»). Bestehende Werte bleiben unverändert:
-- Serien-Mails sendet das Marketing, Bestellungen sind schon über das Recht «preise» in Einkauf geschützt.
insert into public.einstellungen (schluessel, wert)
values ('ausgang_freigabe', '{"newsletter": "admin", "mahnung": "finanzen", "zahlungserinnerung": "finanzen"}')
on conflict (schluessel) do nothing;

/** Name einer Person für die Anzeige. */
create or replace function intern.ausgang_name(p uuid) returns text
language sql stable security definer set search_path = '' as $$
  select name from public.personen where id = p
$$;

/** Person, die einen Eintrag vorbereitet hat (aus erstellt_von = Anmelde-ID), sonst der Absender. */
create or replace function intern.ausgang_vorbereitet(a public.ausgangskorb) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.id from public.personen p where p.auth_user_id = a.erstellt_von limit 1), a.absender_person_id)
$$;

/**
 * Darf die angemeldete Person diesen Eintrag freigeben? Gleiche Regel wie der Trigger aus PR #45: Administration immer;
 * Arten mit Recht (einstellungen.ausgang_freigabe) wer das Recht hat; sonst Absender, Stellvertretung oder ohne Absender alle.
 */
create or replace function intern.ausgang_darf(a public.ausgangskorb) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_recht text;
  v_ich uuid := intern.meine_person_id();
begin
  if intern.hat_recht('admin') then return true; end if;
  select e.wert ->> a.art into v_recht from public.einstellungen e where e.schluessel = 'ausgang_freigabe';
  if v_recht is not null then return intern.hat_recht(v_recht); end if;
  return a.absender_person_id is null or a.absender_person_id = v_ich
      or intern.pe_vertretung(a.absender_person_id,
                              (select e.wert from public.einstellungen e where e.schluessel = 'posteingang')) = v_ich;
end
$$;

/**
 * «Für mich»: wartet oder Fehler, und ich bin dran. Zurückgeschickte gehören der Person, an die sie zurückgingen;
 * sonst wer freigeben darf. Arten mit Recht zählen für alle mit dem Recht, ausser der Administration (sie sieht sie
 * unter «Ganzes Team»), damit die Liste der Administration nicht alles enthält.
 */
create or replace function intern.ausgang_fuer_mich(a public.ausgangskorb) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_recht text;
  v_ich uuid := intern.meine_person_id();
begin
  if a.status not in ('wartet', 'fehler') then return false; end if;
  if a.zurueck_an is not null then return a.zurueck_an = v_ich; end if;
  select e.wert ->> a.art into v_recht from public.einstellungen e where e.schluessel = 'ausgang_freigabe';
  if v_recht is not null and v_recht <> 'admin' then
    return exists (select 1 from public.personen p left join public.rollen r on r.schluessel = p.rolle
                    where p.id = v_ich and (v_recht = any (p.rechte) or v_recht = any (coalesce(r.rechte, '{}'))));
  end if;
  if v_recht = 'admin' then return intern.hat_recht('admin'); end if;
  return a.absender_person_id = v_ich
      or intern.pe_vertretung(a.absender_person_id,
                              (select e.wert from public.einstellungen e where e.schluessel = 'posteingang')) = v_ich
      or (a.absender_person_id is null and intern.ausgang_vorbereitet(a) = v_ich);
end
$$;

/** Liste des Ausgangskorbs mit allem, was die Werkbank zeigt (Rechte über die Tabelle, security_invoker). */
create or replace view public.ausgang_ansicht with (security_invoker = true) as
select a.id, a.kanal, a.art, a.an, a.cc, a.betreff, a.text, a.html, a.status, a.automatisch, a.ki_status, a.ki_auftrag,
       a.fehler, a.verworfen_grund, a.anhaenge, a.erstellt_am, a.freigegeben_am, a.gesendet_am, a.sende_ab,
       a.rueckgaengig_bis, a.sprache, a.kontakt_id, a.verkaufschance_id, a.offerte_id, a.projekt_id,
       a.bezug_tabelle, a.bezug_id, a.absender_person_id, a.zurueck_notiz, a.zurueck_am, a.ruecklauf_am,
       intern.ausgang_name(a.absender_person_id) as absender,
       intern.ausgang_name(a.freigegeben_von) as freigegeben_durch,
       intern.ausgang_name(intern.ausgang_vorbereitet(a)) as vorbereitet_von,
       intern.ausgang_name(a.zurueck_an) as zurueck_an,
       intern.ausgang_name(a.zurueck_von) as zurueck_von,
       intern.ausgang_name(a.verworfen_von) as verworfen_von,
       case when k.art = 'firma' then coalesce(k.firma, concat_ws(' ', k.vorname, k.nachname))
            else coalesce(nullif(concat_ws(' ', k.vorname, k.nachname), ''), k.firma) end as kunde,
       intern.ausgang_darf(a) as darf_freigeben,
       intern.ausgang_fuer_mich(a) as fuer_mich,
       case when a.kanal = 'mail' and a.status = 'gesendet' and a.kontakt_id is not null then
         (select min(x.zeitpunkt) from public.aktivitaeten x
           where x.kontakt_id = a.kontakt_id and x.richtung = 'ein' and x.art = 'mail'
             and x.geloescht_am is null and x.zeitpunkt > a.gesendet_am)
       end as antwort_am
  from public.ausgangskorb a
  left join public.kontakte k on k.id = a.kontakt_id
 where a.geloescht_am is null;
grant select on public.ausgang_ansicht to authenticated;

/**
 * Neuer Eintrag (wie bisher) und neu auch Briefe: «an» ist die Postadresse, «text» was beiliegt, die Datei als Anhang.
 * Ein Brief wird nie vom Server gesendet; nach der Freigabe druckt ihn jemand und markiert ihn als «versendet».
 */
create or replace function public.ausgang_anlegen(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_kanal text := coalesce(p ->> 'kanal', 'mail');
  v_an text := nullif(trim(p ->> 'an'), '');
  v_ich uuid := intern.meine_person_id();
  v_frei boolean := coalesce((p ->> 'freigeben')::boolean, false);
  v_id uuid;
begin
  if v_kanal not in ('mail', 'sms', 'brief') then raise exception using errcode = 'P0001', message = 'ausgang.kanal'; end if;
  if v_an is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  if v_kanal = 'sms' then
    v_an := intern.sms_nummer(v_an);
    if v_an is null then raise exception using errcode = 'P0001', message = 'ausgang.nummer_ungueltig'; end if;
    if nullif(trim(p ->> 'text'), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.text_fehlt'; end if;
  elsif v_kanal = 'brief' then
    if nullif(trim(p ->> 'betreff'), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.betreff_fehlt'; end if;
  else
    if v_an !~ '^[^@\s]+@[^@\s]+\.[^@\s]+(\s*[,;]\s*[^@\s]+@[^@\s]+\.[^@\s]+)*$' then
      raise exception using errcode = 'P0001', message = 'ausgang.adresse_ungueltig';
    end if;
    if nullif(trim(p ->> 'betreff'), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.betreff_fehlt'; end if;
    if nullif(trim(coalesce(p ->> 'text', p ->> 'html')), '') is null then
      raise exception using errcode = 'P0001', message = 'ausgang.text_fehlt';
    end if;
  end if;
  if p ->> 'schluessel' is not null and exists (
    select 1 from public.ausgangskorb where schluessel = p ->> 'schluessel' and status <> 'verworfen' and geloescht_am is null
  ) then
    raise exception using errcode = 'P0001', message = 'ausgang.doppelt';
  end if;

  insert into public.ausgangskorb (kanal, art, an, cc, betreff, text, html, anhaenge, absender_person_id, sprache,
    kontakt_id, verkaufschance_id, offerte_id, projekt_id, bezug_tabelle, bezug_id, schluessel, sende_ab,
    status, freigegeben_von, freigegeben_am)
  values (v_kanal, coalesce(p ->> 'art', 'frei'), v_an, nullif(trim(p ->> 'cc'), ''), p ->> 'betreff', p ->> 'text',
    p ->> 'html', coalesce(p -> 'anhaenge', '[]'),
    coalesce((p ->> 'absender_person_id')::uuid, v_ich), coalesce(p ->> 'sprache', 'de'),
    (p ->> 'kontakt_id')::uuid, (p ->> 'verkaufschance_id')::uuid, (p ->> 'offerte_id')::uuid, (p ->> 'projekt_id')::uuid,
    p ->> 'bezug_tabelle', (p ->> 'bezug_id')::uuid, p ->> 'schluessel', (p ->> 'sende_ab')::timestamptz,
    case when v_frei then 'freigegeben' else 'wartet' end,
    case when v_frei then v_ich end, case when v_frei then now() end)
  returning id into v_id;
  return v_id;
end
$$;

/**
 * Freigeben, auf Wunsch zu einer späteren Zeit (p_sende_ab) und mit kurzer Frist zum Zurückholen (p_warten_s, höchstens
 * 60 Sekunden). Gibt die Zahl der freigegebenen Einträge zurück.
 */
drop function if exists public.ausgang_freigeben(uuid[]);
create or replace function public.ausgang_freigeben(p_ids uuid[], p_sende_ab timestamptz default null,
                                                    p_warten_s int default 0) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_n int;
begin
  update public.ausgangskorb
     set status = 'freigegeben', freigegeben_von = intern.meine_person_id(), freigegeben_am = now(), fehler = null,
         sende_ab = coalesce(p_sende_ab, sende_ab),
         rueckgaengig_bis = case when coalesce(p_warten_s, 0) > 0
                                 then now() + make_interval(secs => least(p_warten_s, 60)) end,
         zurueck_an = null
   where id = any (p_ids) and status in ('wartet', 'fehler') and geloescht_am is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

/** «Rückgängig» oder «doch nicht»: freigegebene, noch nicht gesendete Einträge warten wieder. */
create or replace function public.ausgang_zurueckholen(p_ids uuid[]) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_n int;
begin
  update public.ausgangskorb
     set status = 'wartet', freigegeben_von = null, freigegeben_am = null, rueckgaengig_bis = null
   where id = any (p_ids) and status = 'freigegeben' and kanal <> 'brief' and geloescht_am is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception using errcode = 'P0001', message = 'ausgang.schon_unterwegs'; end if;
  return v_n;
end
$$;

/** Sendezeit setzen oder ändern (null = sofort nach der Freigabe). */
create or replace function public.ausgang_planen(p_ids uuid[], p_sende_ab timestamptz) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_n int;
begin
  update public.ausgangskorb set sende_ab = p_sende_ab
   where id = any (p_ids) and status in ('wartet', 'freigegeben', 'fehler') and geloescht_am is null;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;

/** Nicht senden, mit Grund; mehrere auf einmal. Gesendete bleiben, wie sie sind. */
create or replace function public.ausgang_verwerfen(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.ausgangskorb
     set status = 'verworfen', verworfen_grund = nullif(trim(p_grund), ''), verworfen_von = intern.meine_person_id(),
         zurueck_an = null
   where id = p_id and status in ('wartet', 'freigegeben', 'fehler') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar'; end if;
end
$$;

/**
 * «Zurück an …»: ein wartender Eintrag geht mit einer Notiz an eine Person (Standard: wer ihn vorbereitet hat), statt
 * still geändert oder verworfen zu werden. Die Person bekommt eine Glocke.
 */
create or replace function public.ausgang_zurueck(p_id uuid, p_notiz text, p_an uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
  v_an uuid;
  v_ich uuid := intern.meine_person_id();
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausgang.kein_recht'; end if;
  if nullif(trim(p_notiz), '') is null then raise exception using errcode = 'P0001', message = 'ausgang.notiz_fehlt'; end if;
  select * into a from public.ausgangskorb where id = p_id and geloescht_am is null for update;
  if not found or a.status not in ('wartet', 'fehler') then
    raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar';
  end if;
  v_an := coalesce(p_an, intern.ausgang_vorbereitet(a), a.absender_person_id);
  if v_an is null then raise exception using errcode = 'P0001', message = 'ausgang.empfaenger_fehlt'; end if;
  update public.ausgangskorb
     set zurueck_an = v_an, zurueck_von = v_ich, zurueck_notiz = trim(p_notiz), zurueck_am = now()
   where id = p_id;
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  values (v_an, 'info', 'Zurück an dich: ' || left(coalesce(a.betreff, a.text, ''), 80),
          'Renvoyé à toi : ' || left(coalesce(a.betreff, a.text, ''), 80),
          coalesce(intern.ausgang_name(v_ich), '') || ': ' || left(trim(p_notiz), 200),
          coalesce(intern.ausgang_name(v_ich), '') || ' : ' || left(trim(p_notiz), 200),
          '/outbox?eintrag=' || p_id);
  return v_an;
end
$$;

/**
 * Von Hand als gesendet festhalten: ein Brief ist gedruckt und verschickt, oder bei «unklar, ob angekommen» liegt die
 * Mail in Outlook unter «Gesendete Elemente». Schreibt wie der Server den Kundenverlauf.
 */
create or replace function public.ausgang_als_gesendet(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  if not intern.hat_recht('basis') then raise exception using errcode = '42501', message = 'ausgang.kein_recht'; end if;
  select * into a from public.ausgangskorb where id = p_id and geloescht_am is null for update;
  if not found or not ((a.kanal = 'brief' and a.status = 'freigegeben')
                       or (a.status = 'fehler' and a.fehler = 'ausgang.unklar')) then
    raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar';
  end if;
  update public.ausgangskorb set status = 'wird_gesendet',
         freigegeben_von = coalesce(freigegeben_von, intern.meine_person_id()), freigegeben_am = coalesce(freigegeben_am, now())
   where id = p_id;
  perform public.ausgang_ergebnis(p_id, true, null, a.extern_id);
end
$$;

/** Brief: unterschriebene Antwort ist zurück (oder doch nicht: p_zurueck = false). */
create or replace function public.ausgang_ruecklauf(p_id uuid, p_zurueck boolean default true) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.ausgangskorb set ruecklauf_am = case when p_zurueck then now() end
   where id = p_id and kanal = 'brief' and status = 'gesendet' and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar'; end if;
end
$$;

/** Absender auf mich wechseln (z. B. Microsoft-Verbindung der Kollegin abgelaufen): geht dann aus meinem Outlook. */
create or replace function public.ausgang_absender_ich(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.ausgangskorb set absender_person_id = intern.meine_person_id()
   where id = p_id and kanal = 'mail' and status in ('wartet', 'fehler') and geloescht_am is null;
  if not found then raise exception using errcode = 'P0001', message = 'ausgang.nicht_aenderbar'; end if;
end
$$;

/**
 * Prüfungen vor dem Senden, als Liste {code, stufe ok|warnung|fehler, wert}. Die App übersetzt die Codes.
 * Nur Hinweise: gesperrt wird nichts, ausser was die Datenbank sowieso verbietet.
 */
create or replace function public.ausgang_pruefen(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a public.ausgangskorb;
  k public.kontakte;
  r jsonb := '[]';
  v_n int;
  v_t timestamptz;
  v_ms boolean;
begin
  select * into a from public.ausgangskorb where id = p_id and geloescht_am is null;
  if not found or not intern.hat_recht('basis') then return r; end if;
  if a.kontakt_id is not null then select * into k from public.kontakte where id = a.kontakt_id; end if;

  -- Absender: Outlook verbunden und nicht abgelaufen
  if a.kanal = 'mail' then
    select v.token is not null and v.fehler is null into v_ms
      from intern.microsoft_verbindungen v where v.person_id = coalesce(a.absender_person_id, a.freigegeben_von);
    r := r || jsonb_build_object('code', case when coalesce(v_ms, false) then 'outlook_ok' else 'outlook_fehlt' end,
                                 'stufe', case when coalesce(v_ms, false) then 'ok' else 'fehler' end,
                                 'wert', intern.ausgang_name(coalesce(a.absender_person_id, a.freigegeben_von)));
  end if;
  -- Werbung nur ohne Werbesperre
  if a.art in ('newsletter', 'serienmail') and k.id is not null then
    r := r || jsonb_build_object('code', case when k.werbesperre then 'werbesperre' else 'werbung_ok' end,
                                 'stufe', case when k.werbesperre then 'fehler' else 'ok' end);
  end if;
  -- Sprache passt zum Kunden
  if k.id is not null and k.sprache is not null then
    r := r || jsonb_build_object('code', case when k.sprache = a.sprache then 'sprache_ok' else 'sprache_anders' end,
                                 'stufe', case when k.sprache = a.sprache then 'ok' else 'warnung' end, 'wert', k.sprache);
  end if;
  -- Anhänge vorhanden
  if jsonb_array_length(a.anhaenge) > 0 then
    select count(*) into v_n from jsonb_array_elements(a.anhaenge) x
     where not exists (select 1 from public.dokumente d where d.id = (x ->> 'dokument_id')::uuid and d.geloescht_am is null);
    r := r || jsonb_build_object('code', case when v_n = 0 then 'anhaenge_ok' else 'anhang_fehlt' end,
                                 'stufe', case when v_n = 0 then 'ok' else 'fehler' end, 'wert', jsonb_array_length(a.anhaenge));
  end if;
  -- Gleiche Art in den letzten 7 Tagen schon an diese Adresse gesendet
  select max(gesendet_am) into v_t from public.ausgangskorb x
   where x.id <> a.id and lower(x.an) = lower(a.an) and x.art = a.art and x.status = 'gesendet'
     and x.gesendet_am > now() - interval '7 days' and x.geloescht_am is null;
  if v_t is not null then
    r := r || jsonb_build_object('code', 'kuerzlich', 'stufe', 'warnung', 'wert', v_t);
  end if;
  -- SMS länger als eine SMS
  if a.kanal = 'sms' and length(coalesce(a.text, '')) > 160 then
    r := r || jsonb_build_object('code', 'sms_lang', 'stufe', 'warnung', 'wert', ceil(length(a.text) / 153.0));
  end if;
  -- Geplante Zeit schon vorbei (z. B. Erinnerung für einen Termin, der war)
  if a.sende_ab is not null and a.sende_ab < now() - interval '12 hours' and a.status in ('wartet', 'fehler') then
    r := r || jsonb_build_object('code', 'veraltet', 'stufe', 'warnung', 'wert', a.sende_ab);
  end if;
  -- Wer freigeben darf
  if not intern.ausgang_darf(a) then
    r := r || jsonb_build_object('code', 'kein_recht', 'stufe', 'warnung',
                                 'wert', (select e.wert ->> a.art from public.einstellungen e where e.schluessel = 'ausgang_freigabe'));
  end if;
  return r;
end
$$;

/**
 * Zusammenhang eines Eintrags für die Werkbank: Kunde, Lead, Offerte, Projekt, Rechnung und die letzten Nachrichten
 * mit dieser Person (Kundenverlauf). Eine Abfrage statt vieler.
 */
create or replace function public.ausgang_kontext(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  a public.ausgangskorb;
begin
  select * into a from public.ausgangskorb where id = p_id and geloescht_am is null;
  if not found then return null; end if;
  return jsonb_build_object(
    'kunde', (select jsonb_build_object('id', k.id, 'nummer', k.kundennummer, 'sprache', k.sprache, 'telefon', k.telefon,
                     'email', k.email, 'name', case when k.art = 'firma' then k.firma
                                                   else concat_ws(' ', k.vorname, k.nachname) end)
                from public.kontakte k where k.id = a.kontakt_id),
    'lead', (select jsonb_build_object('id', v.id, 'nummer', v.nummer, 'stufe', v.stufe)
               from public.verkaufschancen v where v.id = a.verkaufschance_id),
    'offerte', (select jsonb_build_object('id', o.id, 'nummer', o.nummer, 'titel', o.titel, 'betrag_rappen', o.betrag_rappen,
                       'status', o.status)
                  from public.offerten o where o.id = coalesce(a.offerte_id,
                       case when a.bezug_tabelle = 'offerten' then a.bezug_id end)),
    'projekt', (select jsonb_build_object('id', p.id, 'nummer', p.nummer, 'titel', p.titel)
                  from public.projekte p where p.id = coalesce(a.projekt_id,
                       case when a.bezug_tabelle = 'projekte' then a.bezug_id end)),
    'rechnung', (select jsonb_build_object('id', r.id, 'nummer', r.nummer, 'total_rappen', r.total_rappen,
                        'faellig_am', r.faellig_am, 'mahnstufe', r.mahnstufe)
                   from public.rechnungen r where a.bezug_tabelle = 'rechnungen' and r.id = a.bezug_id),
    'verlauf', coalesce((select jsonb_agg(x order by x.zeitpunkt desc) from (
                  select v.art, v.richtung, v.zeitpunkt, left(split_part(coalesce(v.text, ''), E'\n', 1), 120) as text,
                         intern.ausgang_name(v.person_id) as person
                    from public.aktivitaeten v
                   where a.kontakt_id is not null and v.kontakt_id = a.kontakt_id and v.geloescht_am is null
                   order by v.zeitpunkt desc limit 6) x), '[]'));
end
$$;

/**
 * Zeitplan (mit dem Versand jede Minute, wirkt höchstens einmal pro Eintrag und Stufe): Einträge, die länger als vier
 * Arbeitsstunden auf Freigabe warten, melden sich mit der Glocke bei den Zuständigen; nach einem Arbeitstag auch bei der
 * Stellvertretung. Fehler melden sich sofort beim Absender.
 */
create or replace function public.ausgang_erinnern() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  a public.ausgangskorb;
  v_min int;
  v_wer uuid[];
  v_n int := 0;
begin
  for a in select * from public.ausgangskorb
            where geloescht_am is null and status in ('wartet', 'fehler') and not automatisch
              and (erinnert_am is null or (status = 'wartet' and erinnert_am < now() - interval '20 hours'))
            for update skip locked loop
    v_min := intern.pe_arbeitsminuten(coalesce(a.zurueck_am, a.erstellt_am), now(), cfg);
    if a.status = 'fehler' and a.erinnert_am is null then
      v_wer := array[coalesce(a.absender_person_id, intern.ausgang_vorbereitet(a))];
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
      select distinct x, 'kritisch', 'Nicht gesendet: ' || left(coalesce(a.betreff, a.text, ''), 80),
             'Non envoyé : ' || left(coalesce(a.betreff, a.text, ''), 80), a.an, a.an, '/outbox?eintrag=' || a.id
        from unnest(v_wer) x where x is not null;
    elsif a.status = 'wartet' and v_min >= 240 then
      v_wer := case when a.zurueck_an is not null then array[a.zurueck_an]
                    else array[coalesce(a.absender_person_id, intern.ausgang_vorbereitet(a))] end;
      if v_min >= 480 then
        v_wer := v_wer || intern.pe_vertretung(v_wer[1], cfg);
      end if;
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
      select distinct x, 'warnung', 'Wartet auf Freigabe: ' || left(coalesce(a.betreff, a.text, ''), 80),
             'En attente de validation : ' || left(coalesce(a.betreff, a.text, ''), 80), a.an, a.an,
             '/outbox?eintrag=' || a.id
        from unnest(v_wer) x where x is not null;
    else
      continue;
    end if;
    update public.ausgangskorb set erinnert_am = now() where id = a.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;

/**
 * Für den Versand (nur Server): wie bisher, dazu: Briefe nie, und Freigaben in der «Rückgängig»-Frist noch nicht.
 */
create or replace function public.ausgang_holen(p_limit int default 20) returns setof public.ausgangskorb
language plpgsql security definer set search_path = '' as $$
begin
  update public.ausgangskorb
     set status = 'fehler', fehler = 'ausgang.unklar'
   where status = 'wird_gesendet' and geaendert_am < now() - interval '10 minutes';
  return query
  update public.ausgangskorb a set status = 'wird_gesendet', versuche = a.versuche + 1
   where a.id in (
     select id from public.ausgangskorb
      where status = 'freigegeben' and geloescht_am is null and kanal in ('mail', 'sms')
        and (sende_ab is null or sende_ab <= now())
        and (rueckgaengig_bis is null or rueckgaengig_bis <= now())
      order by freigegeben_am nulls last
      limit p_limit
      for update skip locked)
  returning a.*;
end
$$;

-- Fehler nach einem Versand: erinnert_am leeren, damit sich der neue Fehler einmal meldet.
create or replace function intern.ausgang_fehler_neu() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'fehler' and old.status is distinct from 'fehler' then new.erinnert_am := null; end if;
  return new;
end
$$;
create trigger fehler_neu before update of status on public.ausgangskorb
  for each row execute function intern.ausgang_fehler_neu();

revoke execute on function intern.ausgang_name(uuid) from public;
revoke execute on function intern.ausgang_vorbereitet(public.ausgangskorb) from public;
revoke execute on function intern.ausgang_darf(public.ausgangskorb) from public;
revoke execute on function intern.ausgang_fuer_mich(public.ausgangskorb) from public;
grant execute on function intern.ausgang_name(uuid) to authenticated;
grant execute on function intern.ausgang_vorbereitet(public.ausgangskorb) to authenticated;
grant execute on function intern.ausgang_darf(public.ausgangskorb) to authenticated;
grant execute on function intern.ausgang_fuer_mich(public.ausgangskorb) to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['ausgang_freigeben(uuid[], timestamptz, int)', 'ausgang_zurueckholen(uuid[])',
    'ausgang_planen(uuid[], timestamptz)', 'ausgang_zurueck(uuid, text, uuid)', 'ausgang_als_gesendet(uuid)',
    'ausgang_ruecklauf(uuid, boolean)', 'ausgang_absender_ich(uuid)', 'ausgang_pruefen(uuid)', 'ausgang_kontext(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
revoke execute on function public.ausgang_erinnern() from public, anon, authenticated;
grant execute on function public.ausgang_erinnern() to service_role;
revoke execute on function public.ausgang_holen(int) from public, anon, authenticated;
grant execute on function public.ausgang_holen(int) to service_role;
