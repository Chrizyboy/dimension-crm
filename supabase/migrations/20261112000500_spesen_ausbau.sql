-- Spesen vollständig (Entscheid 0039, Chris 2.11.2026): jede Spese geht den ganzen Weg. Erfassen (Beleg oder
-- Kilometer, Projekt, MWST, eigenes Geld oder Firmenkarte), prüfen durch die Buchhaltung mit Hinweisen, Rückfrage
-- oder Ablehnen, Auszahlung als Lauf (mit dem Lohn oder per Überweisung). Kosten mit Projekt gehen in die
-- Nachkalkulation. Regeln (Kategorien mit Konto, MWST, Richtwert, Belegpflicht; Kilometer-Ansatz) sind Daten in
-- `einstellungen.finanzen`.

-- Spalten -------------------------------------------------------------------------------------------------------
alter table public.spesen
  add column if not exists art text not null default 'beleg',
  add column if not exists bezahlt_mit text not null default 'eigen',
  add column if not exists projekt_id uuid references public.projekte (id),
  add column if not exists mwst_satz numeric(4, 2),
  add column if not exists mwst_rappen bigint,
  add column if not exists km numeric(7, 1),
  add column if not exists km_satz_rappen int,
  add column if not exists strecke text,
  add column if not exists personen int,
  add column if not exists waehrung text not null default 'CHF',
  add column if not exists geprueft_am timestamptz,
  add column if not exists geprueft_von text,
  add column if not exists rueckfrage text,
  add column if not exists rueckfrage_am timestamptz,
  add column if not exists abgelehnt_grund text,
  add column if not exists auszahlung_id uuid,
  add column if not exists ausbezahlt_mit text,
  add column if not exists verlauf jsonb not null default '[]';

alter table public.spesen drop constraint if exists spesen_status_check;
alter table public.spesen add constraint spesen_status_check
  check (status in ('eingereicht', 'rueckfrage', 'geprueft', 'abgelehnt', 'ausbezahlt', 'storniert'));
alter table public.spesen add constraint spesen_art_check check (art in ('beleg', 'kilometer'));
alter table public.spesen add constraint spesen_bezahlt_mit_check check (bezahlt_mit in ('eigen', 'firmenkarte'));
alter table public.spesen add constraint spesen_personen_check check (personen is null or personen between 1 and 50);
alter table public.spesen add constraint spesen_km_check check (art <> 'kilometer' or (km > 0 and km <= 5000));
alter table public.spesen add constraint spesen_ausbezahlt_mit_check
  check (ausbezahlt_mit is null or ausbezahlt_mit in ('lohn', 'ueberweisung'));
create index if not exists spesen_projekt_idx on public.spesen (projekt_id) where projekt_id is not null;
create index if not exists spesen_status_idx on public.spesen (status) where geloescht_am is null;

comment on column public.spesen.bezahlt_mit is
  '«eigen»: Person hat bezahlt, wird ausbezahlt. «firmenkarte»: nur Beleg für die Buchhaltung, keine Auszahlung.';
comment on column public.spesen.art is '«beleg»: Betrag vom Beleg. «kilometer»: Privatauto, Betrag = km × Ansatz, ohne Beleg.';

-- Auszahlungslauf: eine Auszahlung an viele Personen mit Datum und Art -----------------------------------------
create table public.spesen_auszahlungen (
  id            uuid primary key default gen_random_uuid(),
  datum         date not null,
  art           text not null check (art in ('lohn', 'ueberweisung')),
  titel         text not null,
  total_rappen  bigint not null default 0,
  anzahl        int not null default 0,
  personen      int not null default 0,
  notiz         text
);
select intern.richte_fachtabelle_ein('spesen_auszahlungen', 'finanzen');
alter table public.spesen add constraint spesen_auszahlung_fk foreign key (auszahlung_id) references public.spesen_auszahlungen (id);

-- Regeln als Daten: Kategorien bekommen Konto, MWST, Richtwert, Belegpflicht; dazu Kilometer-Ansatz ------------
-- Bestehende Kategorien behalten Schlüssel und Texte (die Buchhaltung hat sie vielleicht schon angepasst), nur
-- fehlende Felder kommen dazu; neue Kategorien nur, wenn der Schlüssel noch fehlt.
do $$
declare
  v jsonb := coalesce((select wert from public.einstellungen where schluessel = 'finanzen'), '{}');
  v_alt jsonb := coalesce(v -> 'spesen_kategorien', '[]');
  v_vorgabe jsonb := $j$[
    {"schluessel": "Kilometer Privatauto", "de": "Kilometer Privatauto", "fr": "Kilomètres voiture privée", "art": "kilometer", "konto": "5820", "mwst_satz": null, "richtwert_rappen": null, "richtwert_je": null, "beleg_ab_rappen": null},
    {"schluessel": "Fahrt / Kilometer", "de": "Fahrt, Laden, Treibstoff", "fr": "Déplacement, recharge, carburant", "art": "beleg", "konto": "6210", "mwst_satz": 8.1, "richtwert_rappen": null, "richtwert_je": null, "beleg_ab_rappen": 0},
    {"schluessel": "Verpflegung", "de": "Verpflegung", "fr": "Repas", "art": "beleg", "konto": "5820", "mwst_satz": 8.1, "richtwert_rappen": 3500, "richtwert_je": "person", "beleg_ab_rappen": 2000},
    {"schluessel": "Kundenessen", "de": "Kundenessen", "fr": "Repas client", "art": "beleg", "konto": "6640", "mwst_satz": 8.1, "richtwert_rappen": 6000, "richtwert_je": "person", "beleg_ab_rappen": 0},
    {"schluessel": "Übernachtung", "de": "Übernachtung", "fr": "Nuitée", "art": "beleg", "konto": "5820", "mwst_satz": 3.8, "richtwert_rappen": 18000, "richtwert_je": "beleg", "beleg_ab_rappen": 0},
    {"schluessel": "Material", "de": "Material", "fr": "Matériel", "art": "beleg", "konto": "4000", "mwst_satz": 8.1, "richtwert_rappen": null, "richtwert_je": null, "beleg_ab_rappen": 0},
    {"schluessel": "Parkieren", "de": "Parkieren", "fr": "Parking", "art": "beleg", "konto": "6200", "mwst_satz": 8.1, "richtwert_rappen": null, "richtwert_je": null, "beleg_ab_rappen": 2000},
    {"schluessel": "Sonstiges", "de": "Sonstiges", "fr": "Divers", "art": "beleg", "konto": "6500", "mwst_satz": 8.1, "richtwert_rappen": null, "richtwert_je": null, "beleg_ab_rappen": 0}
  ]$j$;
  v_neu jsonb;
begin
  -- Bestehende: Vorgabe-Felder unter die vorhandenen legen (vorhandene Werte gewinnen).
  select coalesce(jsonb_agg(
           coalesce((select d - 'de' - 'fr' from jsonb_array_elements(v_vorgabe) d where d ->> 'schluessel' = k ->> 'schluessel'),
                    '{"art": "beleg", "konto": "6500", "mwst_satz": 8.1, "beleg_ab_rappen": 0}'::jsonb) || k
           order by o), '[]')
    into v_neu
    from jsonb_array_elements(v_alt) with ordinality as a(k, o);
  -- Fehlende Vorgaben anhängen.
  select v_neu || coalesce(jsonb_agg(d), '[]') into v_neu
    from jsonb_array_elements(v_vorgabe) d
   where not exists (select 1 from jsonb_array_elements(v_neu) k where k ->> 'schluessel' = d ->> 'schluessel');
  v := v || jsonb_build_object('spesen_kategorien', v_neu,
    'spesen', jsonb_build_object('km_satz_rappen', 70, 'einreichen_tage', 60, 'auszahlung', 'lohn')
              || coalesce(v -> 'spesen', '{}'));
  insert into public.einstellungen (schluessel, wert) values ('finanzen', v)
  on conflict (schluessel) do update set wert = excluded.wert;
end
$$;

-- Hilfen ------------------------------------------------------------------------------------------------------
/** Kategorie aus den Einstellungen (oder leer). */
create or replace function intern.spesen_kategorie(p_schluessel text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select k from jsonb_array_elements(intern.fin_cfg() -> 'spesen_kategorien') k
                    where k ->> 'schluessel' = p_schluessel limit 1), '{}')
$$;

/** Ein Eintrag im Verlauf der Spese (wer, wann, was). */
create or replace function intern.spesen_eintrag(p_text text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('am', now(), 'von', intern.mein_vorname(), 'text', p_text)
$$;

/** Glocke an die Person der Spese (Rückfrage, Ablehnen, Auszahlung). */
create or replace function intern.spesen_glocke(p_person uuid, p_art text, p_titel_de text, p_titel_fr text,
  p_text_de text, p_text_fr text) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p_person, p_art, p_titel_de, p_titel_fr, p_text_de, p_text_fr, '/expenses'
   where p_person is not null
$$;
revoke execute on function intern.spesen_glocke(uuid, text, text, text, text, text) from public, anon, authenticated;

/** Betrag als «CHF 1'234.50» für Glocke und Verlauf. */
create or replace function intern.spesen_chf(p_rappen bigint) returns text
language sql immutable set search_path = '' as $$
  select 'CHF ' || replace(to_char(p_rappen / 100.0, 'FM999G999G990D00'), ',', '''')
$$;

-- Regeln beim Speichern ------------------------------------------------------------------------------------------
/**
 * Spesen: die Person ändert ihre Spese nur, solange sie eingereicht ist oder eine Rückfrage hat (danach wieder
 * eingereicht). Prüfen, Ablehnen, Auszahlen nur mit Recht «finanzen». Ausbezahlte, stornierte und abgelehnte sind
 * fest. Kilometer: Betrag = km × Ansatz aus den Einstellungen, ohne MWST.
 */
create or replace function intern.spesen_pruefen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_bh boolean := intern.hat_recht('finanzen');
  v_satz int;
begin
  -- Import der Vorlage und Wiederherstellen (ohne Anmeldung) übernehmen Stand und Werte unverändert.
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'eingereicht';
    new.verlauf := jsonb_build_array(intern.spesen_eintrag('eingereicht'));
  else
    -- Nur der Vermerk «per Mail an die Buchhaltung» oder der Papierkorb: immer erlaubt.
    if (to_jsonb(new) - 'mail' - 'geaendert_am' - 'geloescht_am') = (to_jsonb(old) - 'mail' - 'geaendert_am' - 'geloescht_am') then
      return new;
    end if;
    if old.status in ('ausbezahlt', 'storniert', 'abgelehnt') then
      raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest';
    end if;
    if new.status is distinct from old.status and new.status in ('geprueft', 'abgelehnt', 'ausbezahlt') and not v_bh then
      raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
    end if;
    if not v_bh and old.status not in ('eingereicht', 'rueckfrage') then
      raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest';
    end if;
    -- Die Person beantwortet eine Rückfrage, indem sie die Spese ändert: zurück zur Buchhaltung.
    if not v_bh and old.status = 'rueckfrage' and new.status = 'rueckfrage' then
      new.status := 'eingereicht';
      new.verlauf := new.verlauf || intern.spesen_eintrag('beantwortet');
    end if;
    if new.betrag_rappen is distinct from old.betrag_rappen and new.art = 'beleg' then
      new.verlauf := new.verlauf || intern.spesen_eintrag('betrag ' || intern.spesen_chf(old.betrag_rappen) || ' → '
                                                          || intern.spesen_chf(new.betrag_rappen));
    end if;
  end if;

  if new.art = 'kilometer' then
    v_satz := coalesce(case when tg_op = 'UPDATE' then old.km_satz_rappen end,
                       (intern.fin_cfg() -> 'spesen' ->> 'km_satz_rappen')::int, 70);
    new.km_satz_rappen := v_satz;
    new.betrag_rappen := round(new.km * v_satz);
    new.bezahlt_mit := 'eigen';
    new.mwst_satz := null;
    new.mwst_rappen := null;
  elsif new.mwst_satz is not null and (tg_op = 'INSERT' or new.mwst_rappen is null
        or new.mwst_satz is distinct from old.mwst_satz or new.betrag_rappen is distinct from old.betrag_rappen) then
    -- MWST im Betrag (inkl.): Betrag × Satz / (100 + Satz), wenn nicht vom Beleg gelesen.
    if tg_op = 'INSERT' and new.mwst_rappen is not null then
      null;
    else
      new.mwst_rappen := round(new.betrag_rappen * new.mwst_satz / (100 + new.mwst_satz));
    end if;
  end if;
  if new.betrag_rappen <= 0 then
    raise exception using errcode = 'P0001', message = 'finanzen.betrag_ungueltig';
  end if;
  return new;
end
$$;
drop trigger if exists pruefen on public.spesen;
create trigger pruefen before insert or update on public.spesen for each row execute function intern.spesen_pruefen();

-- Abläufe der Buchhaltung ----------------------------------------------------------------------------------------
/** Geprüft (nur Buchhaltung): eingereichte Spesen, gibt die Anzahl zurück. */
create or replace function public.spesen_geprueft(p_ids uuid[]) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  n int;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.spesen set status = 'geprueft', geprueft_am = now(), geprueft_von = intern.mein_vorname(),
         verlauf = verlauf || intern.spesen_eintrag('geprueft')
   where id = any (p_ids) and geloescht_am is null and status = 'eingereicht';
  get diagnostics n = row_count;
  return n;
end
$$;

/** Rückfrage an die Person (nur Buchhaltung), mit Glocke (security definer wegen der Glocke, Recht geprüft). Die Person antwortet, indem sie die Spese ändert. */
create or replace function public.spesen_rueckfrage(p_id uuid, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.spesen;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if nullif(trim(p_text), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  update public.spesen set status = 'rueckfrage', rueckfrage = trim(p_text), rueckfrage_am = now(),
         geprueft_am = null, geprueft_von = null, verlauf = verlauf || intern.spesen_eintrag('rueckfrage: ' || trim(p_text))
   where id = p_id and geloescht_am is null and status in ('eingereicht', 'geprueft')
  returning * into s;
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest'; end if;
  perform intern.spesen_glocke(s.person_id, 'warnung',
    'Rückfrage zu deiner Spese: ' || coalesce(s.zweck, s.kategorie), 'Question sur tes frais : ' || coalesce(s.zweck, s.kategorie),
    trim(p_text), trim(p_text));
end
$$;

/** Ablehnen mit Grund (nur Buchhaltung), mit Glocke; bleibt sichtbar. */
create or replace function public.spesen_ablehnen(p_id uuid, p_grund text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.spesen;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  update public.spesen set status = 'abgelehnt', abgelehnt_grund = trim(p_grund),
         verlauf = verlauf || intern.spesen_eintrag('abgelehnt: ' || trim(p_grund))
   where id = p_id and geloescht_am is null and status in ('eingereicht', 'rueckfrage', 'geprueft')
  returning * into s;
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest'; end if;
  perform intern.spesen_glocke(s.person_id, 'warnung',
    'Spese abgelehnt: ' || coalesce(s.zweck, s.kategorie), 'Frais refusés : ' || coalesce(s.zweck, s.kategorie),
    trim(p_grund), trim(p_grund));
end
$$;

/**
 * Auszahlungslauf (nur Buchhaltung): eingereichte oder geprüfte Spesen mit eigenem Geld werden ausbezahlt (mit dem
 * Lohn oder per Überweisung). Firmenkarte wird nie ausbezahlt. Jede Person bekommt eine Glocke mit ihrem Total.
 * Gibt die ID des Laufs zurück (null, wenn nichts auszuzahlen war).
 */
create or replace function public.spesen_auszahlung(p_ids uuid[], p_datum date default null, p_art text default null,
  p_titel text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_datum date := coalesce(p_datum, (now() at time zone 'Europe/Zurich')::date);
  v_art text := coalesce(p_art, intern.fin_cfg() -> 'spesen' ->> 'auszahlung', 'lohn');
  v_titel text;
  v_id uuid;
  r record;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if v_art not in ('lohn', 'ueberweisung') then raise exception using errcode = 'P0001', message = 'finanzen.art_ungueltig'; end if;
  v_titel := coalesce(nullif(trim(p_titel), ''),
    case v_art when 'lohn' then 'Lohn ' else 'Überweisung ' end
    || (array['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'])[extract(month from v_datum)::int]
    || ' ' || extract(year from v_datum)::int);
  insert into public.spesen_auszahlungen (datum, art, titel) values (v_datum, v_art, v_titel) returning id into v_id;
  update public.spesen set status = 'ausbezahlt', ausbezahlt_am = v_datum, ausbezahlt_von = intern.mein_vorname(),
         ausbezahlt_mit = v_art, auszahlung_id = v_id,
         geprueft_am = coalesce(geprueft_am, now()), geprueft_von = coalesce(geprueft_von, intern.mein_vorname()),
         verlauf = verlauf || intern.spesen_eintrag('ausbezahlt: ' || v_titel)
   where id = any (p_ids) and geloescht_am is null and status in ('eingereicht', 'geprueft') and bezahlt_mit = 'eigen';
  update public.spesen_auszahlungen a set
         total_rappen = x.total, anzahl = x.anzahl, personen = x.personen
    from (select coalesce(sum(betrag_rappen), 0) as total, count(*)::int as anzahl, count(distinct person_id)::int as personen
            from public.spesen where auszahlung_id = v_id) x
   where a.id = v_id;
  if not exists (select 1 from public.spesen where auszahlung_id = v_id) then
    update public.spesen_auszahlungen set geloescht_am = now() where id = v_id;
    return null;
  end if;
  for r in select person_id, sum(betrag_rappen) as total, count(*) as n from public.spesen
            where auszahlung_id = v_id group by person_id loop
    perform intern.spesen_glocke(r.person_id, 'ok',
      'Spesen ausbezahlt: ' || intern.spesen_chf(r.total::bigint), 'Frais versés : ' || intern.spesen_chf(r.total::bigint),
      r.n || ' Spesen · ' || v_titel, r.n || ' frais · ' || v_titel);
  end loop;
  return v_id;
end
$$;

/** Bisheriger Ablauf «ausbezahlt» (V233): ein Lauf mit der Standard-Art aus den Einstellungen. Gibt die Anzahl zurück. */
create or replace function public.spesen_auszahlen(p_ids uuid[], p_datum date default null) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  v_id := public.spesen_auszahlung(p_ids, p_datum, null, null);
  return coalesce((select anzahl from public.spesen_auszahlungen where id = v_id), 0);
end
$$;

/** Zurückziehen (Storno) durch die Person: auch bei offener Rückfrage. */
create or replace function public.spesen_stornieren(p_id uuid, p_grund text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if nullif(trim(p_grund), '') is null then raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt'; end if;
  update public.spesen set status = 'storniert', storniert_am = (now() at time zone 'Europe/Zurich')::date,
         storniert_von = intern.mein_vorname(), storniert_grund = trim(p_grund),
         verlauf = verlauf || intern.spesen_eintrag('storniert: ' || trim(p_grund))
   where id = p_id and geloescht_am is null and status in ('eingereicht', 'rueckfrage');
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.spesen_fest'; end if;
end
$$;

-- Liste mit Projekt, Konto und Hinweisen -------------------------------------------------------------------------
drop view if exists public.spesen_liste;
/**
 * Spesen mit Person, Projekt, Konto und Hinweisen für die Prüfung (RLS der Spesen gilt: eigene, mit «finanzen»
 * alle). Hinweise: doppelt (gleiche Person, Datum, Betrag), ohne_beleg (ab Grenze der Kategorie), alt (später
 * eingereicht als erlaubt), richtwert (über dem Richtwert der Kategorie), waehrung (nicht CHF).
 */
create view public.spesen_liste with (security_invoker = true) as
select s.id, s.person_id, pe.name as person, pe.kuerzel, s.datum, s.betrag_rappen, s.kategorie, s.zweck, s.notiz,
       s.beleg_id, d.name as beleg_name, d.mime_typ as beleg_typ, s.status, s.ausbezahlt_am, s.ausbezahlt_von,
       s.ausbezahlt_mit, s.auszahlung_id, s.storniert_am, s.storniert_von, s.storniert_grund, s.erstellt_am,
       s.art, s.bezahlt_mit, s.projekt_id, p.nummer as projekt_nummer,
       coalesce(p.titel, (select intern.kontaktname(k) from public.kontakte k where k.id = p.kontakt_id)) as projekt_titel,
       s.mwst_satz, s.mwst_rappen, s.km, s.km_satz_rappen, s.strecke, s.personen, s.waehrung,
       s.geprueft_am, s.geprueft_von, s.rueckfrage, s.rueckfrage_am, s.abgelehnt_grund, s.verlauf,
       kat ->> 'konto' as konto,
       array_remove(array[
         case when s.status in ('eingereicht', 'rueckfrage', 'geprueft') and exists (
                select 1 from public.spesen x where x.id <> s.id and x.person_id = s.person_id and x.datum = s.datum
                   and x.betrag_rappen = s.betrag_rappen and x.geloescht_am is null
                   and x.status not in ('storniert', 'abgelehnt')) then 'doppelt' end,
         case when s.art = 'beleg' and s.beleg_id is null
               and s.betrag_rappen >= coalesce((kat ->> 'beleg_ab_rappen')::bigint, 0) then 'ohne_beleg' end,
         case when s.erstellt_am::date - s.datum > coalesce((intern.fin_cfg() -> 'spesen' ->> 'einreichen_tage')::int, 60)
              then 'alt' end,
         case when (kat ->> 'richtwert_rappen') is not null and s.betrag_rappen > (kat ->> 'richtwert_rappen')::bigint
                * case when kat ->> 'richtwert_je' = 'person' then coalesce(s.personen, 1) else 1 end then 'richtwert' end,
         case when s.waehrung <> 'CHF' then 'waehrung' end
       ], null) as hinweise
  from public.spesen s
  left join public.personen pe on pe.id = s.person_id
  left join public.dokumente d on d.id = s.beleg_id
  left join public.projekte p on p.id = s.projekt_id
  cross join lateral (select intern.spesen_kategorie(s.kategorie) as kat) k
 where s.geloescht_am is null;

/** Auszahlungsläufe (nur Buchhaltung, RLS der Tabelle). */
create or replace view public.spesen_auszahlungen_liste with (security_invoker = true) as
select a.id, a.datum, a.art, a.titel, a.total_rappen, a.anzahl, a.personen, a.notiz, a.erstellt_am
  from public.spesen_auszahlungen a
 where a.geloescht_am is null;

/** Projekte zur Auswahl beim Erfassen (alle Personen dürfen Spesen einem Projekt zuordnen). */
create or replace function public.spesen_projekte() returns table (id uuid, nummer text, titel text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nummer, coalesce(p.titel, (select intern.kontaktname(k) from public.kontakte k where k.id = p.kontakt_id))
    from public.projekte p
   where p.geloescht_am is null and intern.hat_recht('basis')
     and (p.status not in ('abgeschlossen', 'storniert') or p.geaendert_am > now() - interval '120 days')
   order by p.nummer desc
   limit 500
$$;

grant select on public.spesen_liste, public.spesen_auszahlungen_liste to authenticated;
grant execute on function public.spesen_geprueft(uuid[]), public.spesen_rueckfrage(uuid, text),
  public.spesen_ablehnen(uuid, text), public.spesen_auszahlung(uuid[], date, text, text),
  public.spesen_auszahlen(uuid[], date), public.spesen_stornieren(uuid, text), public.spesen_projekte() to authenticated;

-- Nachkalkulation: Spesen mit Projekt (geprüft oder ausbezahlt, exkl. MWST) sind Projektkosten -------------------
create or replace function public.nachkalkulation(p_projekt uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  pr public.projekte;
  v_satz numeric := public.mwst_satz();
  v_kal public.kalkulationen;
  v_lief bigint; v_best bigint; v_mat bigint; v_material bigint; v_quelle text;
  v_stunden numeric; v_arbeit bigint; v_spesen bigint;
  v_nachtraege bigint; v_erloes bigint; v_vertrag bigint;
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  select * into pr from public.projekte where id = p_projekt and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  select * into v_kal from public.kalkulationen where offerte_id = pr.offerte_id and geloescht_am is null
   order by geaendert_am desc nulls last limit 1;

  select sum(round(betrag_rappen / (1 + v_satz / 100))) into v_lief from public.kreditor_zahlungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(total_rappen) into v_best from public.bestellungen
   where projekt_id = p_projekt and geloescht_am is null and status <> 'storniert';
  select sum(round(coalesce(nullif(x ->> 'ek', '')::numeric, 0) * 100
                   / case when (x ->> 'exkl')::boolean then 1 else 1 + v_satz / 100 end))
    into v_mat from public.material_zahlungen m, jsonb_array_elements(m.positionen) x
   where m.projekt_id = p_projekt and m.geloescht_am is null;
  v_material := coalesce(v_lief, v_best, v_mat, 0);
  v_quelle := case when v_lief is not null then 'lieferantenrechnungen' when v_best is not null then 'bestellungen'
                   when v_mat is not null then 'material_zahlungen' else 'keine' end;

  select coalesce(sum(extract(epoch from (stopp - start)) / 3600 - coalesce(pause_min, 0) / 60.0), 0) into v_stunden
    from public.zeiten where projekt_id = p_projekt and stopp is not null and geloescht_am is null;
  v_arbeit := round(v_stunden * coalesce((intern.fin_cfg() ->> 'intern_stundensatz_rappen')::bigint, 6500));

  -- Spesen sieht die Buchhaltung ganz; mit «preise» allein zählen die über RLS sichtbaren.
  select coalesce(sum(betrag_rappen - coalesce(mwst_rappen, 0)), 0) into v_spesen from public.spesen
   where projekt_id = p_projekt and geloescht_am is null and status in ('geprueft', 'ausbezahlt');

  select coalesce(sum(betrag_rappen), 0) into v_nachtraege from public.nachtraege
   where projekt_id = p_projekt and geloescht_am is null and status in ('vom_kunden_bestaetigt', 'verrechnet');
  select coalesce(sum(netto_rappen), 0) into v_erloes from public.rechnungen
   where projekt_id = p_projekt and geloescht_am is null and status not in ('entwurf', 'storniert');
  v_vertrag := round(coalesce(pr.vertragswert_rappen, 0) / (1 + v_satz / 100));

  return jsonb_build_object(
    'projekt_id', pr.id, 'nummer', pr.nummer,
    'soll', jsonb_build_object('verkauf_rappen', coalesce(v_kal.verkauf_rappen, v_vertrag), 'einkauf_rappen', v_kal.einkauf_rappen,
                               'werktage', pr.werktage, 'stunden', pr.werktage * 8 * 2),
    'ist', jsonb_build_object('vertrag_rappen', v_vertrag, 'nachtraege_rappen', v_nachtraege,
                              'umsatz_rappen', v_vertrag + v_nachtraege, 'verrechnet_rappen', v_erloes,
                              'material_rappen', v_material, 'material_quelle', v_quelle,
                              'stunden', round(v_stunden, 2), 'arbeit_rappen', v_arbeit, 'spesen_rappen', v_spesen,
                              'marge_rappen', v_vertrag + v_nachtraege - v_material - v_arbeit - v_spesen));
end
$$;
