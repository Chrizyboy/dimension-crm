-- Posteingang als Arbeitsplatz (Neuentwurf 2.11.2026, Chris: «jedes Modul muss seinen Zweck ganz erfüllen»).
-- Neu: Zurückstellen (Wiedervorlage), «Warten auf Kunde» mit Nachfassen, Verteilen von info@ mit Vorschlag,
-- interne Notizen mit @Erwähnung, Absender-Regeln, Team-Übersicht, gelesene Werte (Betrag, Fälligkeit,
-- Liefertermin) und daraus «Zahlung erfassen» und «Liefertermin übernehmen», Aufgabe aus einer Mail.
-- Alles nach aussen bleibt beim Ausgangskorb; hier entsteht nichts, was das Haus verlässt.

alter table public.posteingang
  add column zurueck_am   timestamptz,                                -- zurückgestellt bis
  add column warten_bis   timestamptz,                                -- wir warten auf den Kunden bis
  add column nachfassen   boolean not null default false,             -- kam zurück: Kunde hat nicht geantwortet
  add column verteilt_am  timestamptz,                                -- Team-Postfach: weitergegeben
  add column verteilt_von uuid references public.personen (id),
  add column vorschlag_id uuid references public.personen (id),       -- wer die Mail wohl bekommen sollte
  add column ki_werte     jsonb not null default '{}',                -- gelesen: betrag, faellig, rechnungsnummer …
  add column zahlung_id   uuid references public.kreditor_zahlungen (id);

create index posteingang_zurueck_idx on public.posteingang (zurueck_am) where zurueck_am is not null;
create index posteingang_warten_idx on public.posteingang (warten_bis) where warten_bis is not null;

-- Was schon da ist, gilt als verteilt (sonst stünden alle alten info@-Mails bei «Zu verteilen»).
update public.posteingang set verteilt_am = coalesce(erledigt_am, eingang_am) where postfach_person_id is null;

-- Einstellung: Warten auf Kunde (Chris P2) und Vorschlag je Art (Kürzel), z. B. {"rechnung": "nadine"}.
update public.einstellungen
   set wert = wert || jsonb_build_object(
         'warten', coalesce(wert -> 'warten', '{"auto": true, "tage": 3, "arten": ["anfrage"], "mit_offerte": true, "frist_min": 240}'::jsonb),
         'vorschlag', coalesce(wert -> 'vorschlag', '{}'::jsonb))
 where schluessel = 'posteingang';

-- ---------------------------------------------------------------------------------------------------------------
-- Interne Notizen auf einer Mail (nur im Team, nie nach aussen)
create table public.posteingang_notizen (
  id             uuid primary key default gen_random_uuid(),
  posteingang_id uuid not null references public.posteingang (id),
  person_id      uuid not null references public.personen (id),
  text           text not null check (length(text) between 1 and 2000),
  erwaehnt       uuid[] not null default '{}'
);
select intern.richte_fachtabelle_ein('posteingang_notizen');
create index posteingang_notizen_mail_idx on public.posteingang_notizen (posteingang_id, erstellt_am);
drop policy lesen on public.posteingang_notizen;
drop policy anlegen on public.posteingang_notizen;
drop policy aendern on public.posteingang_notizen;
-- Sehen darf, wer die Mail sieht (die Abfrage auf posteingang läuft mit dessen RLS).
create policy lesen on public.posteingang_notizen for select to authenticated using (
  exists (select 1 from public.posteingang p where p.id = posteingang_id)
);

-- Absender-Regeln: «immer ablegen», «immer an …», «immer Art …». postfach_person_id leer = Team-Postfächer.
create table public.posteingang_regeln (
  id                 uuid primary key default gen_random_uuid(),
  postfach_person_id uuid references public.personen (id),
  absender           text not null check (absender ~ '^(@?[a-z0-9._%+-]+(@[a-z0-9.-]+)?)$'),
  aktion             text not null check (aktion in ('ablegen', 'zuweisen', 'art')),
  person_id          uuid references public.personen (id),
  art                text check (art in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor',
                                         'sonstiges', 'intern', 'werbung', 'privat')),
  angelegt_von       uuid references public.personen (id),
  check (aktion <> 'zuweisen' or person_id is not null),
  check (aktion <> 'art' or art is not null)
);
select intern.richte_fachtabelle_ein('posteingang_regeln');
create unique index posteingang_regeln_eins on public.posteingang_regeln
  (coalesce(postfach_person_id, '00000000-0000-0000-0000-000000000000'::uuid), absender) where geloescht_am is null;
drop policy lesen on public.posteingang_regeln;
drop policy anlegen on public.posteingang_regeln;
drop policy aendern on public.posteingang_regeln;
create policy lesen on public.posteingang_regeln for select to authenticated using (
  intern.hat_recht('basis')
  and (postfach_person_id = (select intern.meine_person_id()) or postfach_person_id is null)
);

-- ---------------------------------------------------------------------------------------------------------------
/** Darf ich Team-Postfächer verteilen (und ihre Regeln pflegen, das Team sehen)? Verteiler oder Administration. */
create or replace function intern.pe_verteile_ich() returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('admin') or intern.meine_person_id() = any (intern.pe_verteiler(intern.pe_einstellung()))
$$;

/** Passende Absender-Regel für eine Mail (genaue Adresse vor Domain). */
create or replace function intern.pe_regel(p_von text, p_postfach_person uuid) returns public.posteingang_regeln
language sql stable security definer set search_path = '' as $$
  select g.* from public.posteingang_regeln g
   where g.geloescht_am is null
     and g.postfach_person_id is not distinct from p_postfach_person
     and (g.absender = lower(p_von)
          or (left(g.absender, 1) = '@' and split_part(lower(p_von), '@', 2) = substr(g.absender, 2)))
   order by (g.absender = lower(p_von)) desc
   limit 1
$$;

/**
 * Wer sollte eine Mail aus einem Team-Postfach bekommen? Regel «immer an», dann wer die Akte betreut (Service-Fall,
 * Projekt, Offerte, Lead), dann Störung → Service-Verantwortung, Anfrage → Zuständigkeiten im Verkauf, sonst der
 * Vorschlag je Art aus der Einstellung. Abwesende werden durch ihre Stellvertretung ersetzt.
 */
create or replace function intern.pe_vorschlag(r public.posteingang, p_cfg jsonb) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  g public.posteingang_regeln := intern.pe_regel(r.von_email, r.postfach_person_id);
  wer uuid;
begin
  if g.aktion = 'zuweisen' then wer := g.person_id; end if;
  wer := coalesce(wer,
    (select p.verantwortlich_id from public.projekte p where p.id = r.projekt_id),
    (select o.verantwortlich_id from public.offerten o where o.id = r.offerte_id),
    (select v.tour_person_id from public.verkaufschancen v where v.id = r.verkaufschance_id),
    case when r.art = 'stoerung' then
      (select nullif(e.wert ->> 'verantwortlich_id', '')::uuid from public.einstellungen e where e.schluessel = 'service') end,
    case when r.art = 'anfrage' then
      intern.verkauf_zustaendig(case when r.sprache = 'fr' then 'fr' else 'de' end, null, null, null) end,
    intern.pe_person(p_cfg -> 'vorschlag' ->> coalesce(r.art, 'sonstiges')));
  if wer is not null and not exists (select 1 from public.personen x where x.id = wer and x.aktiv and x.geloescht_am is null) then
    wer := null;
  end if;
  return intern.pe_vertretung(wer, p_cfg);
end
$$;

/**
 * Einordnen wie bisher (20261110001100), ergänzt um die Absender-Regeln (Art, «immer an») und den Vorschlag beim
 * Verteilen. «Immer an» im Team-Postfach gilt als verteilt: die Person ist gleich zuständig.
 */
create or replace function intern.pe_einordnen(p_id uuid, p_antwort boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  r public.posteingang;
  g public.posteingang_regeln;
  a jsonb;
  min int;
  wer uuid;
  vertreten uuid;
  verteilt boolean := false;
begin
  select * into r from public.posteingang where id = p_id for update;
  if r.stand in ('erledigt') then return; end if;
  g := intern.pe_regel(r.von_email, r.postfach_person_id);
  if g.aktion = 'art' and r.sortiert <> 'hand' then r.art := g.art; end if;
  if g.aktion = 'ablegen' and r.sortiert <> 'hand' then r.art := coalesce(r.art, 'werbung'); end if;
  a := coalesce(cfg -> 'arten' -> coalesce(r.art, 'sonstiges'), '{}');

  r.sichtbar := case when r.postfach_person_id is null
                       or r.art in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor')
                       or r.kontakt_id is not null then 'team' else 'person' end;

  if coalesce((a ->> 'ablegen')::boolean, false) or (g.aktion = 'ablegen' and r.sortiert <> 'hand') then
    update public.posteingang
       set stand = 'abgelegt', art = r.art, sichtbar = r.sichtbar, frist_am = null, eskalation_am = null,
           zustaendig_id = coalesce(zustaendig_id, postfach_person_id), verteilt_am = coalesce(verteilt_am, now())
     where id = p_id;
    return;
  end if;

  if r.postfach_person_id is null and g.aktion = 'zuweisen' then
    wer := g.person_id;
    verteilt := true;
  else
    wer := intern.pe_zustaendig(r, cfg);
  end if;
  vertreten := intern.pe_vertretung(wer, cfg);
  min := nullif(a ->> 'frist_min', '')::int;
  if r.dringend and min is not null then
    min := least(min, coalesce(nullif(cfg -> 'arten' -> 'stoerung' ->> 'frist_min', '')::int, min));
  end if;
  if not p_antwort and r.art not in ('anfrage', 'stoerung') then min := null; end if;

  update public.posteingang
     set stand = case when min is null then 'info' else 'offen' end,
         art = r.art,
         sichtbar = r.sichtbar,
         zustaendig_id = vertreten,
         vertretung_fuer = case when vertreten is distinct from wer then wer end,
         frist_am = intern.pe_arbeitszeit_plus(r.eingang_am, min, cfg),
         eskalation_am = intern.pe_arbeitszeit_plus(r.eingang_am, min * 2, cfg),
         erinnert = 0,
         verteilt_am = case when verteilt or r.postfach_person_id is not null then coalesce(verteilt_am, now()) else verteilt_am end,
         vorschlag_id = case when r.postfach_person_id is null and not verteilt then intern.pe_vorschlag(r, cfg) end
   where id = p_id
  returning * into r;

  if r.stand = 'offen' and r.art in ('anfrage', 'stoerung') and r.sortiert <> 'hand' then
    perform intern.pe_glocke(
      case when r.postfach_person_id is null and not verteilt and cardinality(intern.pe_verteiler(cfg)) > 0
           then intern.pe_verteiler(cfg) || r.zustaendig_id else array[r.zustaendig_id] end,
      case when r.art = 'stoerung' then 'warnung' else 'info' end,
      case when r.art = 'stoerung' then 'Störung gemeldet' else 'Neue Anfrage per Mail' end,
      case when r.art = 'stoerung' then 'Panne signalée' else 'Nouvelle demande par e-mail' end, r);
  elsif verteilt and r.zustaendig_id is not null then
    perform intern.pe_glocke(array[r.zustaendig_id], 'info', 'Mail an dich (Regel)', 'E-mail pour toi (règle)', r);
  end if;
end
$$;

/**
 * Ergebnis der Einordnung übernehmen (nur Server), wie 20261110000400; neu werden die gelesenen Werte gespeichert
 * (betrag in Franken, faellig und liefertermin als Datum, rechnungsnummer, firma), nur wenn sie plausibel sind.
 */
create or replace function public.posteingang_sortieren(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_art text := coalesce(p ->> 'art', 'sonstiges');
  v_stand text;
  w jsonb := coalesce(p -> 'werte', '{}');
  v_werte jsonb := '{}';
begin
  if v_art not in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor', 'sonstiges', 'intern',
                   'werbung', 'privat') then
    v_art := 'sonstiges';
  end if;
  if coalesce(w ->> 'betrag', '') ~ '^\d{1,9}([.]\d{1,2})?$' then
    v_werte := v_werte || jsonb_build_object('betrag_rappen', round((w ->> 'betrag')::numeric * 100)::bigint);
  end if;
  if coalesce(w ->> 'faellig', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_werte := v_werte || jsonb_build_object('faellig', w ->> 'faellig');
  end if;
  if coalesce(w ->> 'rechnungsdatum', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_werte := v_werte || jsonb_build_object('rechnungsdatum', w ->> 'rechnungsdatum');
  end if;
  if coalesce(w ->> 'liefertermin', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    v_werte := v_werte || jsonb_build_object('liefertermin', w ->> 'liefertermin');
  end if;
  if nullif(trim(w ->> 'rechnungsnummer'), '') is not null then
    v_werte := v_werte || jsonb_build_object('rechnungsnummer', left(trim(w ->> 'rechnungsnummer'), 60));
  end if;
  if nullif(trim(w ->> 'firma'), '') is not null then
    v_werte := v_werte || jsonb_build_object('firma', left(trim(w ->> 'firma'), 120));
  end if;
  update public.posteingang
     set art = v_art,
         sprache = case when p ->> 'sprache' in ('de', 'fr', 'en', 'it') then p ->> 'sprache' end,
         dringend = coalesce((p ->> 'dringend')::boolean, false),
         zusammenfassung = nullif(left(trim(p ->> 'zusammenfassung'), 600), ''),
         nummern = coalesce((select array_agg(distinct left(trim(x), 40))
                               from (select x from jsonb_array_elements_text(coalesce(p -> 'nummern', '[]')) x limit 10) n
                              where trim(x) <> ''), '{}'),
         ki_werte = v_werte,
         sortiert = case when coalesce((p ->> 'ohne_ki')::boolean, false) then 'ohne_ki' else 'ki' end
   where id = p_id and sortiert = 'offen'
  returning stand into v_stand;
  if not found then return; end if;
  perform intern.pe_zuordnen(p_id);
  if v_stand = 'neu' then
    perform intern.pe_einordnen(p_id, coalesce((p ->> 'antwort_noetig')::boolean, true));
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Trigger: Regel «ablegen» schon beim Aufnehmen (spart die KI); eine neue Mail des Kunden beendet das Warten.
create or replace function intern.pe_vor_aufnahme() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  g public.posteingang_regeln;
begin
  if new.stand = 'neu' and new.von_email is not null then
    g := intern.pe_regel(new.von_email, new.postfach_person_id);
    if g.aktion = 'ablegen' then
      new.stand := 'abgelegt';
      new.sortiert := 'regel';
      new.art := coalesce(new.art, 'werbung');
      new.verteilt_am := now();
    end if;
  end if;
  if new.von_email is not null then
    update public.posteingang p
       set warten_bis = null
     where p.warten_bis is not null and p.geloescht_am is null and p.erledigt_am < new.eingang_am
       and ((new.konversation_id is not null and p.konversation_id = new.konversation_id)
            or lower(p.von_email) = lower(new.von_email));
  end if;
  return new;
end
$$;
create trigger pe_vor_aufnahme before insert on public.posteingang
  for each row execute function intern.pe_vor_aufnahme();

/**
 * Beantwortet → je nach Einstellung auf den Kunden warten (Anfragen, Mails mit Offerte), automatisch nur einmal (nach
 * dem Nachfassen nicht nochmals, sonst käme die Mail alle paar Tage zurück); beim Nachfassen bleibt die erste
 * Reaktionszeit stehen, damit die Auswertung nicht verfälscht wird.
 */
create or replace function intern.pe_nach_antwort() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  w jsonb := coalesce(intern.pe_einstellung() -> 'warten', '{}');
begin
  if old.nachfassen and new.reaktion_minuten is distinct from old.reaktion_minuten then
    new.reaktion_minuten := old.reaktion_minuten;
  end if;
  if new.stand = 'erledigt' and old.stand is distinct from 'erledigt' and new.erledigt_grund = 'beantwortet'
     and new.warten_bis is null and not new.nachfassen and coalesce((w ->> 'auto')::boolean, false)
     and (coalesce(new.art, '') in (select jsonb_array_elements_text(coalesce(w -> 'arten', '[]')))
          or (coalesce((w ->> 'mit_offerte')::boolean, false) and new.offerte_id is not null
              and new.projekt_id is null)) then
    new.warten_bis := intern.pe_arbeitszeit_plus(coalesce(new.erledigt_am, now()),
                                                 greatest(1, coalesce((w ->> 'tage')::int, 3)) * 600,
                                                 intern.pe_einstellung());
  end if;
  return new;
end
$$;
create trigger pe_nach_antwort before update on public.posteingang
  for each row execute function intern.pe_nach_antwort();

-- ---------------------------------------------------------------------------------------------------------------
/**
 * Wiedervorlage und Nachfassen (vom Zeitplan über posteingang_erinnern): Zurückgestellte kommen mit neuer Frist
 * zurück; wo der Kunde bis «warten_bis» nicht geantwortet hat, ist die Mail wieder offen mit «nachfassen».
 */
create or replace function intern.pe_wiedervorlage() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  min int := coalesce(nullif(cfg -> 'warten' ->> 'frist_min', '')::int, 240);
  r public.posteingang;
  n int := 0;
begin
  for r in select * from public.posteingang
            where zurueck_am is not null and zurueck_am <= now() and geloescht_am is null for update skip locked loop
    update public.posteingang
       set zurueck_am = null, erinnert = 0,
           frist_am = case when frist_am is not null then greatest(frist_am, intern.pe_arbeitszeit_plus(now(), 60, cfg)) end,
           eskalation_am = case when frist_am is not null then greatest(eskalation_am, intern.pe_arbeitszeit_plus(now(), 120, cfg)) end
     where id = r.id returning * into r;
    if r.stand in ('neu', 'offen', 'info') then
      perform intern.pe_glocke(array[r.zustaendig_id], 'info', 'Zurückgestellte Mail ist wieder da',
                               'L’e-mail mis de côté est de retour', r);
    end if;
    n := n + 1;
  end loop;
  for r in select * from public.posteingang
            where warten_bis is not null and warten_bis <= now() and stand = 'erledigt' and geloescht_am is null
              for update skip locked loop
    update public.posteingang
       set stand = 'offen', nachfassen = true, warten_bis = null, erinnert = 0,
           zustaendig_id = coalesce(zustaendig_id, erledigt_von),
           erledigt_am = null, erledigt_grund = null,
           frist_am = intern.pe_arbeitszeit_plus(now(), min, cfg),
           eskalation_am = intern.pe_arbeitszeit_plus(now(), min * 2, cfg)
     where id = r.id returning * into r;
    perform intern.pe_glocke(array[r.zustaendig_id], 'warnung', 'Keine Antwort vom Kunden: nachfassen',
                             'Pas de réponse du client : relancer', r);
    n := n + 1;
  end loop;
  return n;
end
$$;

/** Erinnern wie bisher (20261110000400), zuerst Wiedervorlage; Zurückgestellte erinnern nicht. */
create or replace function public.posteingang_erinnern() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  vor int := coalesce(nullif(cfg ->> 'vorwarnung_min', '')::int, 30);
  r public.posteingang;
  wer uuid[];
  n int := intern.pe_wiedervorlage();
begin
  for r in select * from public.posteingang
            where stand = 'offen' and geloescht_am is null and frist_am is not null and erinnert < 3
              and zurueck_am is null
              and frist_am - make_interval(mins => vor) <= now()
            order by frist_am
  loop
    wer := case when r.zustaendig_id is null then intern.pe_leitung(cfg) else array[r.zustaendig_id] end;
    if r.eskalation_am is not null and now() >= r.eskalation_am then
      perform intern.pe_glocke(intern.pe_leitung(cfg), 'kritisch', 'Kunde wartet doppelt so lange wie vorgesehen',
                               'Un client attend deux fois plus longtemps que prévu', r);
      update public.posteingang set erinnert = 3 where id = r.id;
    elsif now() >= r.frist_am and r.erinnert < 2 then
      perform intern.pe_glocke(wer, 'kritisch', 'Antwortfrist überschritten', 'Délai de réponse dépassé', r);
      update public.posteingang set erinnert = 2 where id = r.id;
    elsif r.erinnert < 1 and now() < r.frist_am then
      perform intern.pe_glocke(wer, 'warnung', 'Antwortfrist läuft bald ab', 'Le délai de réponse expire bientôt', r);
      update public.posteingang set erinnert = 1 where id = r.id;
    else
      continue;
    end if;
    n := n + 1;
  end loop;
  return n;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
/**
 * Änderungen aus der App wie bisher (erledigt, ablegen, oeffnen, zuweisen, art, verknuepfen); neu: zurueck {bis},
 * zurueck_holen, warten {tage}, warten_ende, nummer {nummer} (Akte über Nummer zuordnen). Zuweisen gilt als verteilt.
 */
create or replace function public.posteingang_setzen(p_id uuid, p_aktion text, p jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  ich uuid := intern.meine_person_id();
  r public.posteingang;
  v_person uuid;
  v_art text;
  v_bis timestamptz;
  v_tage int;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  select * into r from public.posteingang x
   where x.id = p_id and x.geloescht_am is null
     and (x.sichtbar = 'team' or x.postfach_person_id = ich or x.zustaendig_id = ich)
   for update;
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;

  if p_aktion = 'erledigt' then
    update public.posteingang
       set stand = 'erledigt', erledigt_am = now(), erledigt_von = ich, erledigt_grund = 'hand', zurueck_am = null,
           verteilt_am = coalesce(verteilt_am, now()),
           reaktion_minuten = case when r.stand = 'offen' then intern.pe_arbeitsminuten(r.eingang_am, now(), cfg) end
     where id = p_id;
  elsif p_aktion = 'ablegen' then
    update public.posteingang set stand = 'abgelegt', erledigt_von = ich, erledigt_am = now(), zurueck_am = null,
           verteilt_am = coalesce(verteilt_am, now())
     where id = p_id;
  elsif p_aktion = 'oeffnen' then
    update public.posteingang
       set stand = case when r.frist_am is not null then 'offen' when r.sortiert = 'offen' then 'neu' else 'info' end,
           art = case when r.stand = 'abgelegt' and r.art in ('werbung', 'intern', 'privat') then 'sonstiges' else r.art end,
           erledigt_am = null, erledigt_von = null, erledigt_grund = null, reaktion_minuten = null, warten_bis = null
     where id = p_id;
  elsif p_aktion = 'zuweisen' then
    v_person := nullif(p ->> 'person_id', '')::uuid;
    if not exists (select 1 from public.personen x where x.id = v_person and x.aktiv and x.geloescht_am is null) then
      raise exception using message = 'posteingang.person_fehlt';
    end if;
    update public.posteingang
       set zustaendig_id = v_person, vertretung_fuer = null, erinnert = least(erinnert, 1),
           verteilt_am = now(), verteilt_von = ich
     where id = p_id returning * into r;
    if v_person <> ich then
      perform intern.pe_glocke(array[v_person], 'info', 'Mail an dich weitergegeben', 'E-mail qui t’a été transmis', r);
    end if;
  elsif p_aktion = 'art' then
    v_art := p ->> 'art';
    if v_art is null or v_art not in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor',
                                       'sonstiges', 'intern', 'werbung', 'privat') then
      raise exception using message = 'posteingang.art_unbekannt';
    end if;
    update public.posteingang
       set art = v_art, sortiert = 'hand',
           stand = case when r.stand = 'erledigt' then 'erledigt' else 'neu' end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
    if r.stand <> 'erledigt' then perform intern.pe_einordnen(p_id, true); end if;
  elsif p_aktion = 'verknuepfen' then
    update public.posteingang
       set kontakt_id = coalesce(nullif(p ->> 'kontakt_id', '')::uuid, kontakt_id),
           verkaufschance_id = coalesce(nullif(p ->> 'verkaufschance_id', '')::uuid, verkaufschance_id),
           service_fall_id = coalesce(nullif(p ->> 'service_fall_id', '')::uuid, service_fall_id),
           projekt_id = coalesce(nullif(p ->> 'projekt_id', '')::uuid, projekt_id),
           sichtbar = case when nullif(p ->> 'kontakt_id', '') is not null then 'team' else sichtbar end
     where id = p_id;
    perform intern.pe_zuordnen(p_id);
  elsif p_aktion = 'nummer' then
    if length(trim(coalesce(p ->> 'nummer', ''))) < 3 then raise exception using message = 'posteingang.nummer_fehlt'; end if;
    update public.posteingang set nummern = array_append(nummern, left(trim(p ->> 'nummer'), 40)) where id = p_id;
    perform intern.pe_zuordnen(p_id);
    update public.posteingang set sichtbar = 'team' where id = p_id and kontakt_id is not null;
  elsif p_aktion = 'zurueck' then
    v_bis := nullif(p ->> 'bis', '')::timestamptz;
    if v_bis is null or v_bis <= now() or v_bis > now() + interval '90 days' then
      raise exception using message = 'posteingang.zeit_ungueltig';
    end if;
    update public.posteingang set zurueck_am = v_bis, verteilt_am = coalesce(verteilt_am, now()) where id = p_id;
  elsif p_aktion = 'zurueck_holen' then
    update public.posteingang set zurueck_am = null where id = p_id;
  elsif p_aktion = 'warten' then
    v_tage := greatest(1, least(30, coalesce(nullif(p ->> 'tage', '')::int,
                                             nullif(cfg -> 'warten' ->> 'tage', '')::int, 3)));
    update public.posteingang
       set warten_bis = intern.pe_arbeitszeit_plus(now(), v_tage * 600, cfg),
           stand = 'erledigt', zurueck_am = null, verteilt_am = coalesce(verteilt_am, now()),
           erledigt_am = coalesce(r.erledigt_am, now()), erledigt_von = coalesce(r.erledigt_von, ich),
           erledigt_grund = coalesce(r.erledigt_grund, 'hand'),
           reaktion_minuten = case when r.stand = 'offen' then intern.pe_arbeitsminuten(r.eingang_am, now(), cfg)
                                   else r.reaktion_minuten end
     where id = p_id;
  elsif p_aktion = 'warten_ende' then
    update public.posteingang set warten_bis = null where id = p_id;
  else
    raise exception using message = 'posteingang.aktion_unbekannt';
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
/** Notiz zu einer Mail; @Kurzzeichen (LP), @Kürzel oder @Vorname gibt der erwähnten Person eine Glocke. Gibt die ID zurück. */
create or replace function public.posteingang_notiz(p_id uuid, p_text text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  r public.posteingang;
  v_text text := left(trim(coalesce(p_text, '')), 2000);
  v_erw uuid[];
  v_id uuid;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  if v_text = '' then raise exception using message = 'posteingang.notiz_leer'; end if;
  select * into r from public.posteingang x
   where x.id = p_id and x.geloescht_am is null
     and (x.sichtbar = 'team' or x.postfach_person_id = ich or x.zustaendig_id = ich);
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;
  select coalesce(array_agg(distinct p.id), '{}') into v_erw
    from regexp_matches(v_text, '@([[:alnum:]_.-]+)', 'g') m(t)
    join public.personen p on p.aktiv and p.geloescht_am is null
     and (lower(p.kuerzel) = lower(m.t[1]) or lower(p.kurzzeichen) = lower(m.t[1])
          or lower(split_part(p.name, ' ', 1)) = lower(m.t[1]))
   where p.id <> ich;
  insert into public.posteingang_notizen (posteingang_id, person_id, text, erwaehnt)
  values (p_id, ich, v_text, v_erw) returning id into v_id;
  -- Wer erwähnt wird, soll die Mail auch sehen können: persönliche Mail mit Erwähnung wird Team-Mail.
  if cardinality(v_erw) > 0 then
    update public.posteingang set sichtbar = 'team' where id = p_id and sichtbar = 'person';
    perform intern.pe_glocke(v_erw, 'info',
      (select p.name from public.personen p where p.id = ich) || ' hat dich erwähnt',
      (select p.name from public.personen p where p.id = ich) || ' t’a mentionné', r);
  end if;
  return v_id;
end
$$;

/** Notizen einer Mail mit Namen (älteste zuerst). */
create or replace function public.posteingang_notizen_von(p_id uuid)
returns table (id uuid, person text, kuerzel text, text text, am timestamptz)
language sql stable security invoker set search_path = '' as $$
  select n.id, p.name, p.kuerzel, n.text, n.erstellt_am
    from public.posteingang_notizen n join public.personen p on p.id = n.person_id
   where n.posteingang_id = p_id and n.geloescht_am is null
   order by n.erstellt_am
$$;

/**
 * Absender-Regel anlegen oder ändern. p: {absender, aktion, person_id, art, team}. Eigene Regeln für das eigene
 * Postfach darf jede Person; Regeln für Team-Postfächer nur wer verteilt oder die Administration.
 */
create or replace function public.posteingang_regel_speichern(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  v_team boolean := coalesce((p ->> 'team')::boolean, false);
  v_postfach uuid := case when v_team then null else ich end;
  v_abs text := lower(trim(coalesce(p ->> 'absender', '')));
  v_id uuid;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  if v_team and not intern.pe_verteile_ich() then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  if v_abs !~ '^(@?[a-z0-9._%+-]+(@[a-z0-9.-]+)?)$' or v_abs !~ '@' then
    raise exception using message = 'posteingang.absender_ungueltig';
  end if;
  update public.posteingang_regeln set geloescht_am = now()
   where geloescht_am is null and postfach_person_id is not distinct from v_postfach and absender = v_abs;
  insert into public.posteingang_regeln (postfach_person_id, absender, aktion, person_id, art, angelegt_von)
  values (v_postfach, v_abs, p ->> 'aktion', nullif(p ->> 'person_id', '')::uuid, nullif(p ->> 'art', ''), ich)
  returning id into v_id;
  return v_id;
end
$$;

/** Regel löschen (Papierkorb); dieselben Rechte wie beim Anlegen. */
create or replace function public.posteingang_regel_loeschen(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  g public.posteingang_regeln;
begin
  select * into g from public.posteingang_regeln where id = p_id and geloescht_am is null;
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;
  if not (g.postfach_person_id = ich or (g.postfach_person_id is null and intern.pe_verteile_ich())) then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  update public.posteingang_regeln set geloescht_am = now() where id = p_id;
end
$$;

/**
 * Team-Übersicht: pro Person offen, überfällig, zurückgestellt, wartet auf Kunde, Reaktionszeit (Mitte, 7 Tage),
 * abwesend und Stellvertretung. Nur Zahlen, keine Inhalte. Alle sieht nur die Geschäftsleitung (Recht «gl», Chris
 * 3.11.2026, Frage P5) und die Administration, sonst jede Person nur sich.
 */
create or replace function public.posteingang_team() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  alle boolean := intern.hat_recht('admin') or intern.hat_recht('gl');
  cfg jsonb := intern.pe_einstellung();
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  return coalesce((
    select jsonb_agg(z order by z ->> 'name')
      from (
        select jsonb_build_object(
          'person_id', p.id, 'name', p.name, 'kuerzel', p.kuerzel,
          'offen', count(*) filter (where m.stand in ('neu', 'offen', 'info') and m.zurueck_am is null),
          'ueber', count(*) filter (where m.stand = 'offen' and m.zurueck_am is null and m.frist_am < now()),
          'zurueck', count(*) filter (where m.stand in ('neu', 'offen', 'info') and m.zurueck_am is not null),
          'warten', count(*) filter (where m.warten_bis is not null and m.stand = 'erledigt'),
          'mitte_min', percentile_cont(0.5) within group (order by m.reaktion_minuten)
                         filter (where m.erledigt_grund = 'beantwortet' and m.erledigt_am > now() - interval '7 days'),
          'abwesend', intern.abwesend(p.id),
          'vertretung', (select v.name from public.personen v
                          where v.id = intern.pe_vertretung(p.id, cfg) and v.id <> p.id)) z
          from public.personen p
          left join public.posteingang m on m.zustaendig_id = p.id and m.geloescht_am is null
         where p.aktiv and p.geloescht_am is null and p.auth_user_id is not null and (alle or p.id = ich)
         group by p.id
        having alle is false or count(m.id) > 0 or p.id = ich) x(z)), '[]');
end
$$;

/** Aufgabe aus einer Mail (verknüpft mit der Mail, Link in der Aufgabe). Gibt die ID der Aufgabe zurück. */
create or replace function public.posteingang_aufgabe(p_id uuid, p_titel text, p_faellig date, p_person uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  v_id uuid;
begin
  if ich is null or not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  if not exists (select 1 from public.posteingang x where x.id = p_id and x.geloescht_am is null
                  and (x.sichtbar = 'team' or x.postfach_person_id = ich or x.zustaendig_id = ich)) then
    raise exception using message = 'posteingang.nicht_gefunden';
  end if;
  if length(trim(coalesce(p_titel, ''))) = 0 then raise exception using message = 'posteingang.titel_fehlt'; end if;
  insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id, quelle)
  values (left(trim(p_titel), 300), p_faellig, coalesce(p_person, ich), 'posteingang', p_id, 'posteingang')
  returning id into v_id;
  if coalesce(p_person, ich) <> ich then
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    values (p_person, 'info', 'Neue Aufgabe aus einer Mail', 'Nouvelle tâche issue d’un e-mail',
            left(trim(p_titel), 200), left(trim(p_titel), 200), '/inbox?mail=' || p_id);
  end if;
  return v_id;
end
$$;

/**
 * Lieferantenrechnung aus der Mail als Zahlung erfassen (Finanzen › Zahlungen, nur mit Recht «finanzen»).
 * p: {firma, rechnung_nr, rechnung_am, betrag_rappen, faellig_am, text}. Die Mail wird erledigt und verknüpft.
 */
create or replace function public.posteingang_zahlung_erfassen(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
  r public.posteingang;
  v_id uuid;
begin
  if ich is null or not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht_finanzen';
  end if;
  select * into r from public.posteingang where id = p_id and geloescht_am is null for update;
  if not found then raise exception using message = 'posteingang.nicht_gefunden'; end if;
  if r.zahlung_id is not null then return r.zahlung_id; end if;
  if nullif(trim(p ->> 'firma'), '') is null or coalesce((p ->> 'betrag_rappen')::bigint, 0) <= 0 then
    raise exception using message = 'posteingang.zahlung_unvollstaendig';
  end if;
  insert into public.kreditor_zahlungen (firma, text, rechnung_nr, rechnung_am, betrag_rappen, faellig_am, status, quelle)
  values (left(trim(p ->> 'firma'), 200), nullif(left(trim(p ->> 'text'), 500), ''),
          nullif(left(trim(p ->> 'rechnung_nr'), 60), ''), nullif(p ->> 'rechnung_am', '')::date,
          (p ->> 'betrag_rappen')::bigint, nullif(p ->> 'faellig_am', '')::date, 'offen', 'posteingang')
  returning id into v_id;
  update public.posteingang
     set zahlung_id = v_id, stand = case when stand in ('neu', 'offen', 'info') then 'erledigt' else stand end,
         erledigt_am = coalesce(erledigt_am, now()), erledigt_von = coalesce(erledigt_von, ich),
         erledigt_grund = coalesce(erledigt_grund, 'hand'), verteilt_am = coalesce(verteilt_am, now())
   where id = p_id;
  return v_id;
end
$$;

/** Liefertermin aus einer Auftragsbestätigung in die Bestellung übernehmen (nur mit Recht «preise»). */
create or replace function public.posteingang_liefertermin(p_id uuid, p_bestellung uuid, p_datum date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := intern.meine_person_id();
begin
  if ich is null or not intern.hat_recht('preise') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht_preise';
  end if;
  if p_datum is null or p_datum < current_date - 30 or p_datum > current_date + 365 then
    raise exception using message = 'posteingang.zeit_ungueltig';
  end if;
  if not exists (select 1 from public.posteingang where id = p_id and geloescht_am is null) then
    raise exception using message = 'posteingang.nicht_gefunden';
  end if;
  update public.bestellungen set liefertermin = p_datum
   where id = p_bestellung and geloescht_am is null and status in ('freigegeben', 'bestellt', 'teilgeliefert');
  if not found then raise exception using message = 'posteingang.bestellung_falsch'; end if;
  update public.posteingang
     set bestellung_id = p_bestellung,
         stand = case when stand in ('neu', 'offen', 'info') then 'erledigt' else stand end,
         erledigt_am = coalesce(erledigt_am, now()), erledigt_von = coalesce(erledigt_von, ich),
         erledigt_grund = coalesce(erledigt_grund, 'hand'), verteilt_am = coalesce(verteilt_am, now())
   where id = p_id;
end
$$;

revoke execute on function public.posteingang_notiz(uuid, text) from public, anon;
grant execute on function public.posteingang_notiz(uuid, text) to authenticated;
revoke execute on function public.posteingang_notizen_von(uuid) from public, anon;
grant execute on function public.posteingang_notizen_von(uuid) to authenticated;
revoke execute on function public.posteingang_regel_speichern(jsonb) from public, anon;
grant execute on function public.posteingang_regel_speichern(jsonb) to authenticated;
revoke execute on function public.posteingang_regel_loeschen(uuid) from public, anon;
grant execute on function public.posteingang_regel_loeschen(uuid) to authenticated;
revoke execute on function public.posteingang_team() from public, anon;
grant execute on function public.posteingang_team() to authenticated;
revoke execute on function public.posteingang_aufgabe(uuid, text, date, uuid) from public, anon;
grant execute on function public.posteingang_aufgabe(uuid, text, date, uuid) to authenticated;
revoke execute on function public.posteingang_zahlung_erfassen(uuid, jsonb) from public, anon;
grant execute on function public.posteingang_zahlung_erfassen(uuid, jsonb) to authenticated;
revoke execute on function public.posteingang_liefertermin(uuid, uuid, date) from public, anon;
grant execute on function public.posteingang_liefertermin(uuid, uuid, date) to authenticated;
revoke execute on function public.posteingang_sortieren(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.posteingang_sortieren(uuid, jsonb) to service_role;
revoke execute on function public.posteingang_erinnern() from public, anon, authenticated;
grant execute on function public.posteingang_erinnern() to service_role;
revoke execute on function intern.pe_wiedervorlage() from public;
revoke execute on function intern.pe_vorschlag(public.posteingang, jsonb) from public;
