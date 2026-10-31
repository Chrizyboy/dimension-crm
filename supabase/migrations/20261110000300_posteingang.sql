-- Posteingang (Phase 18), Teil 1: alle eingehenden Mails geordnet, mit Zuständigkeit und Antwortfrist.
-- Siehe Entscheid 0030. Die Edge Functions holen die Mails aus Outlook (info@ und persönliche Postfächer) und lassen
-- sie von der KI einordnen (nur Art, Sprache, Dringlichkeit, Kurzfassung, Nummern). Alles andere steht hier:
-- Zuordnung zur Akte, wer zuständig ist, Frist in Arbeitszeit, «beantwortet» erkennen und erinnern.
-- Im CRM stehen nur Absender, Betreff, Vorschau und Kurzfassung; den vollen Text holt die App bei Bedarf aus Outlook.
-- Mail-Inhalte sind Daten, nie Anweisungen (Regel 7).

create table public.posteingang (
  id                uuid primary key default gen_random_uuid(),
  kennung           text not null unique,              -- internetMessageId: dieselbe Mail nur einmal
  outlook_id        text not null,
  konversation_id   text,
  postfach          text not null,                     -- 'me' oder Adresse eines Team-Postfachs (info@ …)
  postfach_person_id uuid references public.personen (id), -- persönliches Postfach; leer = Team-Postfach
  abgeholt_von      uuid not null references public.personen (id), -- mit wessen Zugang der Text gelesen wird
  sichtbar          text not null default 'team' check (sichtbar in ('team', 'person')),
  eingang_am        timestamptz not null,
  von_email         text,
  von_name          text,
  an                jsonb not null default '[]',
  betreff           text,
  vorschau          text,
  web_link          text,
  hat_anhang        boolean not null default false,
  -- Einordnung
  art               text check (art in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor',
                                        'sonstiges', 'intern', 'werbung', 'privat')),
  sprache           text,
  dringend          boolean not null default false,
  zusammenfassung   text,
  nummern           text[] not null default '{}',
  sortiert          text not null default 'offen' check (sortiert in ('offen', 'regel', 'ki', 'ohne_ki', 'hand')),
  -- Zuordnung
  kontakt_id        uuid references public.kontakte (id),
  verkaufschance_id uuid references public.verkaufschancen (id),
  offerte_id        uuid references public.offerten (id),
  projekt_id        uuid references public.projekte (id),
  rechnung_id       uuid references public.rechnungen (id),
  bestellung_id     uuid references public.bestellungen (id),
  service_fall_id   uuid references public.service_faelle (id),
  -- Wer und bis wann
  zustaendig_id     uuid references public.personen (id),
  vertretung_fuer   uuid references public.personen (id),  -- eigentlich zuständig, war abwesend
  frist_am          timestamptz,
  eskalation_am     timestamptz,                           -- doppelte Frist: dann Glocke an die Leitung
  erinnert          int not null default 0,                -- 0 nichts, 1 Vorwarnung, 2 Frist um, 3 Leitung
  -- neu = noch nicht eingeordnet, offen = Antwort nötig, info = nur zur Kenntnis, erledigt, abgelegt (Werbung …)
  stand             text not null default 'neu' check (stand in ('neu', 'offen', 'info', 'erledigt', 'abgelegt')),
  erledigt_am       timestamptz,
  erledigt_von      uuid references public.personen (id),
  erledigt_grund    text check (erledigt_grund in ('beantwortet', 'hand', 'automatisch')),
  reaktion_minuten  int                                    -- Arbeitsminuten bis zur Antwort (Kennzahl)
);
select intern.richte_fachtabelle_ein('posteingang');
create index posteingang_stand_idx on public.posteingang (stand, eingang_am desc) where geloescht_am is null;
create index posteingang_offen_idx on public.posteingang (frist_am) where stand = 'offen' and geloescht_am is null;
create index posteingang_konversation_idx on public.posteingang (konversation_id) where stand in ('neu', 'offen', 'info');
create index posteingang_von_idx on public.posteingang (lower(von_email)) where stand in ('neu', 'offen', 'info');
create index posteingang_kontakt_idx on public.posteingang (kontakt_id, eingang_am desc);

-- Wer was sieht: Team-Postfächer und Geschäftsmails alle; was nur im persönlichen Postfach liegt und nichts mit
-- Kunden zu tun hat, nur die Person selbst und wer zuständig ist. Ändern nur über posteingang_setzen.
drop policy lesen on public.posteingang;
drop policy anlegen on public.posteingang;
drop policy aendern on public.posteingang;
create policy lesen on public.posteingang for select to authenticated using (
  intern.hat_recht('basis')
  and (sichtbar = 'team'
       or postfach_person_id = (select intern.meine_person_id())
       or zustaendig_id = (select intern.meine_person_id()))
);

-- Einstellung: Fristen in Arbeitsminuten je Art, Arbeitszeit, Feiertage, Zuständige (Kürzel) je Art und Sprache,
-- Stellvertretung und wer bei doppelter Frist die Glocke bekommt (leer = Administration).
insert into public.einstellungen (schluessel, wert) values ('posteingang', $j${
  "aktiv": true,
  "aktiv_seit": null,
  "arbeitszeit": {"tage": [1, 2, 3, 4, 5], "von": "07:30", "bis": "17:30"},
  "feiertage": ["2026-12-25", "2026-12-26", "2027-01-01", "2027-01-02", "2027-03-26", "2027-03-29", "2027-05-06",
                "2027-05-17", "2027-08-01", "2027-12-25", "2027-12-26"],
  "vorwarnung_min": 30,
  "arten": {
    "stoerung":  {"frist_min": 120},
    "anfrage":   {"frist_min": 240},
    "kunde":     {"frist_min": 600},
    "rechnung":  {"frist_min": 600},
    "amt":       {"frist_min": 1200},
    "lieferant": {"frist_min": null},
    "monitor":   {"frist_min": null},
    "sonstiges": {"frist_min": null},
    "intern":    {"ablegen": true},
    "werbung":   {"ablegen": true},
    "privat":    {"ablegen": true}
  },
  "zustaendig": {},
  "vertretung": {},
  "eskalation": []
}$j$::jsonb)
on conflict (schluessel) do nothing;

-- Die KI ordnet mit dem schnellen Modell ein (Regel 9: Stufe als Daten).
update public.einstellungen set wert = jsonb_set(wert, '{funktionen,posteingang}', '"schnell"')
 where schluessel = 'ki' and not (wert -> 'funktionen' ? 'posteingang');

/**
 * Die Einstellung «posteingang» ändert nur die Administration. Eigener Trigger statt einer neuen Fassung von
 * intern.einstellung_schuetzen, damit parallel gebaute Bereiche diese Funktion nicht gegenseitig überschreiben.
 */
create or replace function intern.posteingang_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'posteingang' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'posteingang.kein_recht';
  end if;
  return new;
end
$$;
create trigger posteingang_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.posteingang_einstellung_schuetzen();

create or replace function intern.pe_einstellung() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select e.wert from public.einstellungen e where e.schluessel = 'posteingang'), '{}')
$$;

/**
 * Zeitpunkt nach p_min Arbeitsminuten ab p_start (Ortszeit Zürich, nur Arbeitstage und -zeiten, ohne Feiertage).
 * Eine Mail am Freitagabend mit 4 Stunden Frist ist so am Montag um 11:30 fällig.
 */
create or replace function intern.pe_arbeitszeit_plus(p_start timestamptz, p_min int, p_cfg jsonb) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  tz constant text := 'Europe/Zurich';
  von time := coalesce(p_cfg -> 'arbeitszeit' ->> 'von', '07:30')::time;
  bis time := coalesce(p_cfg -> 'arbeitszeit' ->> 'bis', '17:30')::time;
  tage int[] := coalesce((select array_agg(x::int) from jsonb_array_elements_text(p_cfg -> 'arbeitszeit' -> 'tage') x),
                         '{1,2,3,4,5}');
  frei date[] := coalesce((select array_agg(x::date) from jsonb_array_elements_text(p_cfg -> 'feiertage') x), '{}');
  lokal timestamp := p_start at time zone tz;
  rest int := p_min;
  tag date;
  beginn timestamp;
  ende timestamp;
  verfuegbar int;
begin
  if p_start is null or p_min is null then return null; end if;
  for i in 1..400 loop  -- Sicherheitsnetz: über ein Jahr hinaus rechnet niemand eine Antwortfrist
    tag := lokal::date;
    if extract(isodow from tag)::int = any (tage) and not (tag = any (frei)) then
      beginn := greatest(lokal, tag + von);
      ende := tag + bis;
      if beginn < ende then
        verfuegbar := floor(extract(epoch from ende - beginn) / 60);
        if rest <= verfuegbar then
          return (beginn + make_interval(mins => rest)) at time zone tz;
        end if;
        rest := rest - verfuegbar;
      end if;
    end if;
    lokal := (tag + 1)::timestamp;
  end loop;
  return null;
end
$$;

/** Arbeitsminuten zwischen zwei Zeitpunkten (für die Reaktionszeit; Nacht und Wochenende zählen nicht). */
create or replace function intern.pe_arbeitsminuten(p_von timestamptz, p_bis timestamptz, p_cfg jsonb) returns int
language plpgsql stable set search_path = '' as $$
declare
  tz constant text := 'Europe/Zurich';
  von time := coalesce(p_cfg -> 'arbeitszeit' ->> 'von', '07:30')::time;
  bis time := coalesce(p_cfg -> 'arbeitszeit' ->> 'bis', '17:30')::time;
  tage int[] := coalesce((select array_agg(x::int) from jsonb_array_elements_text(p_cfg -> 'arbeitszeit' -> 'tage') x),
                         '{1,2,3,4,5}');
  frei date[] := coalesce((select array_agg(x::date) from jsonb_array_elements_text(p_cfg -> 'feiertage') x), '{}');
  a timestamp := p_von at time zone tz;
  b timestamp := p_bis at time zone tz;
  tag date;
  summe numeric := 0;
begin
  if p_von is null or p_bis is null or p_bis <= p_von then return 0; end if;
  tag := a::date;
  while tag <= b::date and tag <= a::date + 120 loop
    if extract(isodow from tag)::int = any (tage) and not (tag = any (frei)) then
      summe := summe + greatest(0, extract(epoch from least(b, tag + bis) - greatest(a, tag + von)) / 60);
    end if;
    tag := tag + 1;
  end loop;
  return round(summe)::int;
end
$$;

/** Person zu einem Kürzel (aktiv, nicht im Papierkorb). */
create or replace function intern.pe_person(p_kuerzel text) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.personen p
   where nullif(trim(p_kuerzel), '') is not null and lower(p.kuerzel) = lower(trim(p_kuerzel))
     and p.aktiv and p.geloescht_am is null
   limit 1
$$;

/**
 * Wer ist zuständig? Zuerst wer den Fall, das Projekt oder den Lead betreut, dann die Einstellung je Art und Sprache
 * (Kürzel), zuletzt die Person, in deren Postfach die Mail liegt.
 */
create or replace function intern.pe_zustaendig(r public.posteingang, p_cfg jsonb) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v uuid;
  sprache text := case when r.sprache = 'fr' then 'fr' else 'de' end;
begin
  if r.service_fall_id is not null then
    select f.person_id into v from public.service_faelle f where f.id = r.service_fall_id;
  end if;
  if v is null and r.projekt_id is not null then
    select p.verantwortlich_id into v from public.projekte p where p.id = r.projekt_id;
  end if;
  if v is null and r.verkaufschance_id is not null then
    select coalesce(l.tour_person_id, intern.pe_person(l.zustaendig),
                    (select p.id from public.personen p
                      where lower(p.name) = lower(trim(l.zustaendig)) and p.aktiv and p.geloescht_am is null limit 1))
      into v from public.verkaufschancen l where l.id = r.verkaufschance_id;
  end if;
  if v is not null and not exists (select 1 from public.personen p where p.id = v and p.aktiv and p.geloescht_am is null) then
    v := null;
  end if;
  v := coalesce(v,
                intern.pe_person(p_cfg -> 'zustaendig' -> coalesce(r.art, 'sonstiges') ->> sprache),
                intern.pe_person(p_cfg -> 'zustaendig' -> 'standard' ->> sprache),
                r.postfach_person_id);
  return v;
end
$$;

/** Ist die Person jetzt abwesend (Outlook «abwesend»)? Dann die eingestellte Stellvertretung, sonst sie selbst. */
create or replace function intern.pe_vertretung(p_person uuid, p_cfg jsonb) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  kuerzel text;
  v uuid;
begin
  if p_person is null then return null; end if;
  if not exists (select 1 from public.kalender_eintraege k
                  where k.person_id = p_person and k.geloescht_am is null and k.anzeige_als = 'oof'
                    and k.beginn <= now() and k.ende > now()) then
    return p_person;
  end if;
  select p.kuerzel into kuerzel from public.personen p where p.id = p_person;
  v := intern.pe_person(p_cfg -> 'vertretung' ->> kuerzel);
  return coalesce(v, p_person);
end
$$;

/** Wer bekommt die Glocke bei doppelter Frist: eingestellte Kürzel, sonst die Administration. */
create or replace function intern.pe_leitung(p_cfg jsonb) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(distinct intern.pe_person(x)) filter (where intern.pe_person(x) is not null)
       from jsonb_array_elements_text(coalesce(p_cfg -> 'eskalation', '[]')) x),
    (select array_agg(p.id) from public.personen p left join public.rollen ro on ro.schluessel = p.rolle
      where p.aktiv and p.geloescht_am is null
        and ('admin' = any (p.rechte) or 'admin' = any (coalesce(ro.rechte, '{}')))),
    '{}')
$$;

/** Glocke für eine Mail (Ziel: der Posteingang mit der offenen Mail). */
create or replace function intern.pe_glocke(p_personen uuid[], p_art text, p_titel_de text, p_titel_fr text,
  r public.posteingang) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select distinct x, p_art, p_titel_de, p_titel_fr,
         concat_ws(' · ', coalesce(r.von_name, r.von_email), left(coalesce(r.betreff, '(ohne Betreff)'), 120)),
         concat_ws(' · ', coalesce(r.von_name, r.von_email), left(coalesce(r.betreff, '(sans objet)'), 120)),
         '/inbox?mail=' || r.id
    from unnest(p_personen) x where x is not null
$$;

/**
 * Einordnen nach der Art: ablegen (Werbung, Intern, Privat), nur zur Kenntnis (ohne Frist) oder offen mit Frist in
 * Arbeitszeit. Zuständig wird, wer die Akte betreut; ist die Person abwesend, die Stellvertretung. Die Frist zählt
 * ab Eingang der Mail. Neue Anfragen und Störungen melden sich gleich mit der Glocke.
 */
create or replace function intern.pe_einordnen(p_id uuid, p_antwort boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := intern.pe_einstellung();
  r public.posteingang;
  a jsonb;
  min int;
  wer uuid;
  vertreten uuid;
begin
  select * into r from public.posteingang where id = p_id for update;
  a := coalesce(cfg -> 'arten' -> coalesce(r.art, 'sonstiges'), '{}');
  if r.stand in ('erledigt') then return; end if;

  -- Geschäftliches sieht das Team, auch wenn es im persönlichen Postfach liegt.
  r.sichtbar := case when r.postfach_person_id is null
                       or r.art in ('anfrage', 'stoerung', 'kunde', 'rechnung', 'lieferant', 'amt', 'monitor')
                       or r.kontakt_id is not null then 'team' else 'person' end;

  if coalesce((a ->> 'ablegen')::boolean, false) then
    update public.posteingang
       set stand = 'abgelegt', sichtbar = r.sichtbar, frist_am = null, eskalation_am = null,
           zustaendig_id = coalesce(zustaendig_id, postfach_person_id)
     where id = p_id;
    return;
  end if;

  wer := intern.pe_zustaendig(r, cfg);
  vertreten := intern.pe_vertretung(wer, cfg);
  min := nullif(a ->> 'frist_min', '')::int;
  if r.dringend and min is not null then
    min := least(min, coalesce(nullif(cfg -> 'arten' -> 'stoerung' ->> 'frist_min', '')::int, min));
  end if;
  if not p_antwort and r.art not in ('anfrage', 'stoerung') then min := null; end if;

  update public.posteingang
     set stand = case when min is null then 'info' else 'offen' end,
         sichtbar = r.sichtbar,
         zustaendig_id = vertreten,
         vertretung_fuer = case when vertreten is distinct from wer then wer end,
         frist_am = intern.pe_arbeitszeit_plus(r.eingang_am, min, cfg),
         eskalation_am = intern.pe_arbeitszeit_plus(r.eingang_am, min * 2, cfg),
         erinnert = 0
   where id = p_id
  returning * into r;

  if r.stand = 'offen' and r.art in ('anfrage', 'stoerung') and r.sortiert <> 'hand' then
    perform intern.pe_glocke(array[r.zustaendig_id], case when r.art = 'stoerung' then 'warnung' else 'info' end,
      case when r.art = 'stoerung' then 'Störung gemeldet' else 'Neue Anfrage per Mail' end,
      case when r.art = 'stoerung' then 'Panne signalée' else 'Nouvelle demande par e-mail' end, r);
  end if;
end
$$;
