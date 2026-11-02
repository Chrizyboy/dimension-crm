-- Personal-Akte vollständig (Chris 2.11.2026, Antworten 1B, 2B, 3A, 4A):
--   * Anstellung: Vorgesetzt, Funktion, Vertragsart, befristet bis, Probezeit, Kündigungsfrist, Wochenstunden,
--     Ferientage, Vertrag unterschrieben, Austrittsgrund, nächstes Gespräch.
--   * Persönlich: Mail privat, Nationalität, Bewilligung mit Ablauf, Zivilstand, AHV-Nummer, IBAN, Beziehung
--     des Notfallkontakts, Hosengrösse.
--   * Lohn zur Info (abgerechnet wird in AbaNinja): eigene Tabelle mit Verlauf, nur Recht «personal».
--   * Mitarbeitergespräche und Dokumente je Person.
--   * Fristen (Probezeit, Befristung, Bewilligung, Gespräch) als Aufgabe und Glocke.
-- Wer was sieht: Recht «personal» alles (heute: Administration, weil «admin» jedes Recht einschliesst; der
-- Rollen-Schritt gibt es GL und Buchhaltung). Die Person selbst alles ausser Lohn und Notiz. Vorgesetzte sehen
-- Anstellung (ohne Lohn), Gespräche, nicht vertrauliche Dokumente und den Notfallkontakt, nichts Privates.

-- ---------- Auswahllisten (Konfiguration statt Code) ----------

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, eigenschaften) values
  ('personal_vertragsart', 'unbefristet', 'Unbefristet', 'Durée indéterminée', 10, '{}'),
  ('personal_vertragsart', 'befristet', 'Befristet', 'Durée déterminée', 20, '{"befristet": true}'),
  ('personal_vertragsart', 'lehre', 'Lehre', 'Apprentissage', 30, '{"befristet": true}'),
  ('personal_vertragsart', 'praktikum', 'Praktikum', 'Stage', 40, '{"befristet": true}'),
  ('personal_vertragsart', 'stundenlohn', 'Im Stundenlohn', 'À l’heure', 50, '{}'),
  ('personal_vertragsart', 'temporaer', 'Temporär (Personalverleih)', 'Temporaire (location de services)', 60,
   '{"befristet": true}'),
  ('personal_bewilligung', 'ch', 'Schweizer Bürger/in', 'Citoyen/ne suisse', 10, '{"ablauf": false}'),
  ('personal_bewilligung', 'c', 'C (Niederlassung)', 'C (établissement)', 20, '{"ablauf": true}'),
  ('personal_bewilligung', 'b', 'B (Aufenthalt)', 'B (séjour)', 30, '{"ablauf": true}'),
  ('personal_bewilligung', 'g', 'G (Grenzgänger)', 'G (frontalier)', 40, '{"ablauf": true}'),
  ('personal_bewilligung', 'l', 'L (Kurzaufenthalt)', 'L (courte durée)', 50, '{"ablauf": true}'),
  ('personal_bewilligung', 'f', 'F (vorläufig aufgenommen)', 'F (admission provisoire)', 60, '{"ablauf": true}'),
  ('personal_bewilligung', 'n', 'N (Asylsuchende)', 'N (requérant d’asile)', 70, '{"ablauf": true}'),
  ('personal_bewilligung', 's', 'S (Schutzstatus)', 'S (protection)', 80, '{"ablauf": true}'),
  ('personal_zivilstand', 'ledig', 'Ledig', 'Célibataire', 10, '{}'),
  ('personal_zivilstand', 'verheiratet', 'Verheiratet', 'Marié/e', 20, '{}'),
  ('personal_zivilstand', 'eingetragen', 'Eingetragene Partnerschaft', 'Partenariat enregistré', 30, '{}'),
  ('personal_zivilstand', 'getrennt', 'Getrennt', 'Séparé/e', 40, '{}'),
  ('personal_zivilstand', 'geschieden', 'Geschieden', 'Divorcé/e', 50, '{}'),
  ('personal_zivilstand', 'verwitwet', 'Verwitwet', 'Veuf/veuve', 60, '{}'),
  ('personal_gespraech', 'probezeit', 'Ende Probezeit', 'Fin du temps d’essai', 10, '{}'),
  ('personal_gespraech', 'jahr', 'Jahresgespräch', 'Entretien annuel', 20, '{}'),
  ('personal_gespraech', 'zwischen', 'Zwischengespräch', 'Entretien intermédiaire', 30, '{}'),
  ('personal_gespraech', 'austritt', 'Austrittsgespräch', 'Entretien de départ', 40, '{}'),
  ('personal_gespraech', 'anderes', 'Anderes', 'Autre', 90, '{}'),
  -- «vertraulich»: sehen nur Recht «personal» und die Person selbst, nicht die/der Vorgesetzte (Lohn steht drin).
  ('personal_dokument', 'vertrag', 'Arbeitsvertrag', 'Contrat de travail', 10, '{"vertraulich": true}'),
  ('personal_dokument', 'nachtrag', 'Vertragsnachtrag', 'Avenant au contrat', 20, '{"vertraulich": true}'),
  ('personal_dokument', 'lohn', 'Lohn', 'Salaire', 30, '{"vertraulich": true}'),
  ('personal_dokument', 'bewilligung', 'Bewilligung / Ausweis', 'Permis / pièce d’identité', 40, '{}'),
  ('personal_dokument', 'zeugnis', 'Zeugnis', 'Certificat de travail', 50, '{}'),
  ('personal_dokument', 'diplom', 'Diplom / Lebenslauf', 'Diplôme / CV', 60, '{}'),
  ('personal_dokument', 'anderes', 'Anderes', 'Autre', 90, '{}')
on conflict (liste, schluessel) do nothing;

/** Eigenschaft eines Auswahlwerts als Wahrheitswert (z. B. ob ein Dokument vertraulich ist). */
create or replace function intern.auswahl_merkmal(p_liste text, p_schluessel text, p_merkmal text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (a.eigenschaften ->> p_merkmal)::boolean from public.auswahlwerte a
                    where a.liste = p_liste and a.schluessel = p_schluessel), false)
$$;
grant execute on function intern.auswahl_merkmal(text, text, text) to authenticated;

-- ---------- Neue Felder der Akte ----------

alter table public.personal_akten
  add column vorgesetzt_id uuid references public.personen (id),
  add column funktion text,
  add column vertragsart text,
  add column befristet_bis date,
  add column probezeit_bis date,
  add column kuendigungsfrist_monate int check (kuendigungsfrist_monate between 0 and 12),
  add column wochenstunden numeric(4, 1) check (wochenstunden > 0 and wochenstunden <= 60),
  add column ferientage numeric(4, 1) check (ferientage >= 0 and ferientage <= 60),
  add column vertrag_unterschrieben_am date,
  add column austrittsgrund text,
  add column naechstes_gespraech date,
  add column mail_privat text check (mail_privat ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column nationalitaet text,
  add column bewilligung text,
  add column bewilligung_bis date,
  add column zivilstand text,
  add column ahv_nr text check (ahv_nr ~ '^756\.\d{4}\.\d{4}\.\d{2}$'),
  add column iban text check (iban ~ '^[A-Z]{2}\d{2}[0-9A-Z]{11,30}$'),
  add column notfall_beziehung text,
  add column hosengroesse text,
  add constraint personal_akten_nicht_selbst_vorgesetzt check (vorgesetzt_id is null or vorgesetzt_id <> person_id);
create index personal_akten_vorgesetzt on public.personal_akten (vorgesetzt_id) where geloescht_am is null;
comment on column public.personal_akten.vorgesetzt_id is
  'Direkte/r Vorgesetzte/r: sieht Anstellung, Gespräche und Notfallkontakt, im Rollen-Schritt auch Arbeitszeiten und Abwesenheiten (intern.ist_vorgesetzt).';
comment on column public.personal_akten.kleidergroesse is 'Grösse Oberteil (Arbeitskleider).';
comment on column public.personal_akten.iban is 'Ohne Leerzeichen, Grossbuchstaben. Zur Info; ausbezahlt wird über AbaNinja.';

-- IBAN und AHV-Nummer einheitlich speichern, damit Eingaben mit Leerzeichen nicht an der Prüfung scheitern.
create or replace function intern.personal_akte_normalisieren() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.iban := nullif(upper(regexp_replace(coalesce(new.iban, ''), '\s', '', 'g')), '');
  if new.ahv_nr ~ '^\s*756\D?\d{4}\D?\d{4}\D?\d{2}\s*$' then
    new.ahv_nr := regexp_replace(regexp_replace(new.ahv_nr, '\D', '', 'g'), '^(\d{3})(\d{4})(\d{4})(\d{2})$', '\1.\2.\3.\4');
  end if;
  new.mail_privat := nullif(lower(trim(coalesce(new.mail_privat, ''))), '');
  return new;
end
$$;
create trigger normalisieren before insert or update on public.personal_akten
  for each row execute function intern.personal_akte_normalisieren();

-- ---------- Wer darf was ----------

/**
 * Ist die angemeldete Person direkte/r Vorgesetzte/r von p_person? Grundlage für Arbeitszeiten, Abwesenheiten und
 * die Sicht auf die Anstellung (Rollen-Schritt nutzt dieselbe Funktion).
 */
create or replace function intern.ist_vorgesetzt(p_person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.personal_akten a
                  where a.person_id = p_person and a.geloescht_am is null
                    and a.vorgesetzt_id = intern.meine_person_id())
$$;
grant execute on function intern.ist_vorgesetzt(uuid) to authenticated;

/** Alle aktiven Personen mit Recht «personal» (heute die Administration): Empfänger der Personal-Fristen. */
create or replace function intern.personal_berechtigte() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from public.personen p
    left join public.rollen r on r.schluessel = p.rolle and r.aktiv and r.geloescht_am is null
   where p.aktiv and p.geloescht_am is null
     and (p.rechte || coalesce(r.rechte, '{}')) && array['personal', 'admin']
$$;

-- Die Akte selbst: Recht «personal» statt fest «admin» (heute gleich, weil «admin» jedes Recht einschliesst).
alter policy lesen on public.personal_akten using ((select intern.hat_recht('personal')));
alter policy anlegen on public.personal_akten with check ((select intern.hat_recht('personal')));
alter policy aendern on public.personal_akten
  using ((select intern.hat_recht('personal'))) with check ((select intern.hat_recht('personal')));
update intern.tabellen_leserecht set recht = 'personal' where tabelle = 'personal_akten';

-- Die Person selbst ändert nur Persönliches; Anstellung, Vorgesetzt und Notiz bleiben dem Recht «personal».
create or replace function intern.personal_akte_selbst() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- personal_gespraech_speichern setzt das nächste Gespräch auch für Vorgesetzte (Flag nur für diese Transaktion).
  if intern.hat_recht('personal') or coalesce(auth.role(), '') = 'service_role' or auth.uid() is null
     or current_setting('intern.personal_funktion', true) = 'ja' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.notiz := null; new.eintritt := null; new.austritt := null; new.pensum := null;
    new.vorgesetzt_id := null; new.funktion := null; new.vertragsart := null; new.befristet_bis := null;
    new.probezeit_bis := null; new.kuendigungsfrist_monate := null; new.wochenstunden := null;
    new.ferientage := null; new.vertrag_unterschrieben_am := null; new.austrittsgrund := null;
    new.naechstes_gespraech := null;
  else
    new.notiz := old.notiz; new.eintritt := old.eintritt; new.austritt := old.austritt; new.pensum := old.pensum;
    new.vorgesetzt_id := old.vorgesetzt_id; new.funktion := old.funktion; new.vertragsart := old.vertragsart;
    new.befristet_bis := old.befristet_bis; new.probezeit_bis := old.probezeit_bis;
    new.kuendigungsfrist_monate := old.kuendigungsfrist_monate; new.wochenstunden := old.wochenstunden;
    new.ferientage := old.ferientage; new.vertrag_unterschrieben_am := old.vertrag_unterschrieben_am;
    new.austrittsgrund := old.austrittsgrund; new.naechstes_gespraech := old.naechstes_gespraech;
    new.geloescht_am := old.geloescht_am;
  end if;
  return new;
end
$$;

-- Sicht wie bisher (Tagesroute, Wächter lesen sie), Notiz nur mit Recht «personal».
drop view public.personal_akten_sicht;
create view public.personal_akten_sicht with (security_invoker = true) as
select a.id, a.person_id, a.eintritt, a.austritt, a.pensum, a.geburtsdatum, a.telefon_privat, a.notfall_name,
       a.notfall_telefon, a.kleidergroesse, a.schuhgroesse,
       case when intern.hat_recht('personal') then a.notiz end as notiz, a.geaendert_am, a.strasse, a.plz, a.ort,
       a.vorgesetzt_id, a.funktion, a.vertragsart, a.befristet_bis, a.probezeit_bis, a.kuendigungsfrist_monate,
       a.wochenstunden, a.ferientage, a.vertrag_unterschrieben_am, a.austrittsgrund, a.naechstes_gespraech,
       a.mail_privat, a.nationalitaet, a.bewilligung, a.bewilligung_bis, a.zivilstand, a.ahv_nr, a.iban,
       a.notfall_beziehung, a.hosengroesse
  from public.personal_akten a
 where a.geloescht_am is null;
grant select on public.personal_akten_sicht to authenticated;

-- ---------- Lohn zur Info (Antwort 1B) ----------

create table public.personal_loehne (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.personen (id),
  gueltig_ab     date not null,
  lohnart        text not null check (lohnart in ('monat', 'stunde')),
  betrag_rappen  bigint not null check (betrag_rappen >= 0),
  anzahl_loehne  int check (anzahl_loehne in (12, 13)),          -- nur Monatslohn: 13. Monatslohn ja/nein
  notiz          text
);
select intern.richte_fachtabelle_ein('personal_loehne', 'personal');
create index personal_loehne_person on public.personal_loehne (person_id, gueltig_ab desc) where geloescht_am is null;
comment on table public.personal_loehne is
  'Lohn zur Info für GL und Buchhaltung (Recht «personal»), mit Verlauf. Abgerechnet wird in AbaNinja.';

-- ---------- Mitarbeitergespräche (Antwort 4A) ----------

create table public.personal_gespraeche (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.personen (id),
  datum      date not null,
  art        text not null,
  notiz      text,
  gefuehrt_von uuid references public.personen (id) default intern.meine_person_id()
);
select intern.richte_fachtabelle_ein('personal_gespraeche', 'personal');
create index personal_gespraeche_person on public.personal_gespraeche (person_id, datum desc) where geloescht_am is null;
create policy "selbst und vorgesetzt lesen" on public.personal_gespraeche for select to authenticated
  using (person_id = (select intern.meine_person_id()) or intern.ist_vorgesetzt(person_id));
comment on table public.personal_gespraeche is
  'Mitarbeitergespräche: führen Recht «personal» oder die/der Vorgesetzte, lesen auch die Person selbst.';

/**
 * Gespräch erfassen oder ändern (Recht «personal» oder Vorgesetzte/r) und dabei das nächste Gespräch in der
 * Akte setzen, das als Frist in die Glocke kommt. Gibt die ID zurück.
 */
create or replace function public.personal_gespraech_speichern(
  p_person uuid, p_datum date, p_art text, p_notiz text default null, p_naechstes date default null,
  p_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not (intern.hat_recht('personal') or intern.ist_vorgesetzt(p_person)) then
    raise exception using errcode = '42501', message = 'team.kein_recht';
  end if;
  if p_naechstes is not null and p_naechstes <= p_datum then
    raise exception using errcode = 'P0001', message = 'team.gespraech_naechstes';
  end if;
  insert into public.personal_gespraeche (id, person_id, datum, art, notiz)
  values (v_id, p_person, p_datum, p_art, nullif(trim(coalesce(p_notiz, '')), ''))
  on conflict (id) do update set datum = excluded.datum, art = excluded.art, notiz = excluded.notiz
    where personal_gespraeche.person_id = p_person;
  perform set_config('intern.personal_funktion', 'ja', true);
  insert into public.personal_akten as a (person_id, naechstes_gespraech) values (p_person, p_naechstes)
  on conflict (person_id) where geloescht_am is null
  do update set naechstes_gespraech = excluded.naechstes_gespraech;
  perform set_config('intern.personal_funktion', '', true);
  return v_id;
end
$$;
revoke execute on function public.personal_gespraech_speichern(uuid, date, text, text, date, uuid) from public, anon;
grant execute on function public.personal_gespraech_speichern(uuid, date, text, text, date, uuid) to authenticated;

-- ---------- Dokumente ----------

create table public.personal_dokumente (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.personen (id),
  art        text not null,
  titel      text not null,
  datum      date,
  datei_pfad text not null
);
select intern.richte_fachtabelle_ein('personal_dokumente', 'personal');
create index personal_dokumente_person on public.personal_dokumente (person_id) where geloescht_am is null;
create policy "selbst lesen" on public.personal_dokumente for select to authenticated
  using (person_id = (select intern.meine_person_id()));
create policy "selbst anlegen" on public.personal_dokumente for insert to authenticated
  with check (person_id = (select intern.meine_person_id()) and not intern.auswahl_merkmal('personal_dokument', art, 'vertraulich'));
create policy "vorgesetzt lesen" on public.personal_dokumente for select to authenticated
  using (intern.ist_vorgesetzt(person_id) and not intern.auswahl_merkmal('personal_dokument', art, 'vertraulich'));
comment on table public.personal_dokumente is
  'Dokumente der Personal-Akte (Speicher «personal», Ordner = Person). Vertrauliche Arten (Vertrag, Lohn) sieht die/der Vorgesetzte nicht.';

-- Speicher: Recht «personal» liest alles, Vorgesetzte die nicht vertraulichen Dokumente ihrer Leute.
drop policy "personal lesen" on storage.objects;
create policy "personal lesen" on storage.objects for select to authenticated
  using (bucket_id = 'personal' and (intern.hat_recht('personal')
         or (storage.foldername(name))[1] = intern.meine_person_id()::text
         or exists (select 1 from public.personal_dokumente d
                     where d.datei_pfad = name and d.geloescht_am is null
                       and intern.ist_vorgesetzt(d.person_id)
                       and not intern.auswahl_merkmal('personal_dokument', d.art, 'vertraulich'))));
drop policy "personal hochladen" on storage.objects;
create policy "personal hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'personal' and (intern.hat_recht('personal')
              or (storage.foldername(name))[1] = intern.meine_person_id()::text));

-- ---------- Lesen je nach Rolle ----------

/**
 * Akte einer Person, so viel die angemeldete Person sehen darf: Recht «personal» alles mit Lohn und Notiz, die
 * Person selbst alles ausser Lohn und Notiz, Vorgesetzte nur Anstellung und Notfallkontakt. Sonst null.
 * `sicht` sagt der App, welche Abschnitte sie zeigt: 'personal' | 'selbst' | 'vorgesetzt'.
 */
create or replace function public.personal_akte(p_person uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_sicht text;
  a public.personal_akten;
  r jsonb;
begin
  v_sicht := case when intern.hat_recht('personal') then 'personal'
                  when p_person = intern.meine_person_id() then 'selbst'
                  when intern.ist_vorgesetzt(p_person) then 'vorgesetzt' end;
  if v_sicht is null then return null; end if;
  select * into a from public.personal_akten x where x.person_id = p_person and x.geloescht_am is null;
  r := case when found then to_jsonb(a) else jsonb_build_object('id', null, 'person_id', p_person) end
       - array['erstellt_am', 'erstellt_von', 'geaendert_am', 'geloescht_am', 'alt_id', 'alt_daten'];
  if v_sicht <> 'personal' then
    r := r - 'notiz';
  end if;
  if v_sicht = 'vorgesetzt' then
    r := r - array['geburtsdatum', 'telefon_privat', 'mail_privat', 'strasse', 'plz', 'ort', 'nationalitaet',
                   'bewilligung', 'bewilligung_bis', 'zivilstand', 'ahv_nr', 'iban', 'kleidergroesse',
                   'schuhgroesse', 'hosengroesse'];
  end if;
  r := r || jsonb_build_object(
    'sicht', v_sicht,
    'vorgesetzt_name', (select p.name from public.personen p where p.id = a.vorgesetzt_id),
    'loehne', case when v_sicht = 'personal' then coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'gueltig_ab', l.gueltig_ab, 'lohnart', l.lohnart,
                                          'betrag_rappen', l.betrag_rappen, 'anzahl_loehne', l.anzahl_loehne,
                                          'notiz', l.notiz) order by l.gueltig_ab desc)
        from public.personal_loehne l where l.person_id = p_person and l.geloescht_am is null), '[]') end,
    'gespraeche', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'datum', g.datum, 'art', g.art, 'notiz', g.notiz,
                                          'gefuehrt_von', (select p.name from public.personen p where p.id = g.gefuehrt_von))
                       order by g.datum desc)
        from public.personal_gespraeche g where g.person_id = p_person and g.geloescht_am is null), '[]'),
    'dokumente', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'art', d.art, 'titel', d.titel, 'datum', d.datum,
                                          'datei_pfad', d.datei_pfad) order by d.datum desc nulls last, d.titel)
        from public.personal_dokumente d
       where d.person_id = p_person and d.geloescht_am is null
         and (v_sicht <> 'vorgesetzt' or not intern.auswahl_merkmal('personal_dokument', d.art, 'vertraulich'))), '[]'),
    'ausruestung', coalesce((
      select jsonb_agg(x.t order by x.t) from (
        select f.bezeichnung || ' ' || f.kennzeichen as t from public.fahrzeuge f
         where f.person_id = p_person and f.geloescht_am is null and not f.ausser_betrieb
        union all
        select g.bezeichnung || coalesce(' (' || g.inventar_nr || ')', '') from public.geraete g
         where g.person_id = p_person and g.geloescht_am is null and g.zustand <> 'ausser_betrieb') x), '[]'));
  return r;
end
$$;
revoke execute on function public.personal_akte(uuid) from public, anon;
grant execute on function public.personal_akte(uuid) to authenticated;

-- ---------- Fristen der Personal-Akte ----------

/**
 * Personal-Fristen durchsehen (Zeitplan, stündlich): Probezeit-Ende, Ende der Befristung, Ablauf der Bewilligung
 * und nächstes Gespräch geben einmal pro Frist eine Aufgabe und eine Glocke an alle mit Recht «personal» und
 * die/den Vorgesetzte/n; die Bewilligung auch an die Person selbst. Vorlauf aus einstellungen.ressourcen
 * (`vorlauf_personal_tage`, Standard 30; Bewilligung `vorlauf_ausweis_tage`, Standard 60).
 */
create or replace function public.personal_fristen_melden(p_heute date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'ressourcen'), '{}');
  heute date := coalesce(p_heute, (now() at time zone 'Europe/Zurich')::date);
  berechtigte uuid[] := intern.personal_berechtigte();
  r record;
  k int;
  n int := 0;
  empfaenger uuid[];
begin
  for r in
    select f.*, p.name from (
      select a.person_id, a.vorgesetzt_id, 'probezeit'::text as art, a.probezeit_bis as faellig_am,
             'Probezeit endet'::text as de, 'Fin du temps d’essai'::text as fr from public.personal_akten a
       where a.geloescht_am is null and a.probezeit_bis is not null
      union all
      select a.person_id, a.vorgesetzt_id, 'befristung', a.befristet_bis, 'Befristung endet', 'Fin du contrat'
        from public.personal_akten a where a.geloescht_am is null and a.befristet_bis is not null
      union all
      select a.person_id, a.vorgesetzt_id, 'bewilligung', a.bewilligung_bis, 'Bewilligung läuft ab', 'Permis échoit'
        from public.personal_akten a where a.geloescht_am is null and a.bewilligung_bis is not null
      union all
      select a.person_id, a.vorgesetzt_id, 'gespraech', a.naechstes_gespraech, 'Mitarbeitergespräch',
             'Entretien collaborateur'
        from public.personal_akten a where a.geloescht_am is null and a.naechstes_gespraech is not null
    ) f
    join public.personen p on p.id = f.person_id and p.aktiv and p.geloescht_am is null
    left join public.personal_akten a on a.person_id = f.person_id and a.geloescht_am is null
   where (a.austritt is null or a.austritt > heute)
     and f.faellig_am >= heute - 30
     and f.faellig_am <= heute + case when f.art = 'bewilligung'
                                      then coalesce((cfg ->> 'vorlauf_ausweis_tage')::int, 60)
                                      else coalesce((cfg ->> 'vorlauf_personal_tage')::int, 30) end
  loop
    insert into intern.fristen_gemeldet (schluessel)
    values ('personal_' || r.art || ':' || r.person_id || ':' || r.faellig_am) on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    select array_agg(distinct x) into empfaenger from unnest(
      berechtigte || array[r.vorgesetzt_id] || case when r.art = 'bewilligung' then array[r.person_id] else '{}' end
    ) x where x is not null;
    insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
    select r.de || ': ' || r.name, r.faellig_am, x, 'personen', r.person_id from unnest(empfaenger) x;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, case when r.faellig_am < heute then 'kritisch' else 'warnung' end,
           'Frist: ' || r.de || ' – ' || r.name, 'Échéance : ' || r.fr || ' – ' || r.name,
           'Fällig am ' || to_char(r.faellig_am, 'DD.MM.YYYY'), 'Échéance le ' || to_char(r.faellig_am, 'DD.MM.YYYY'),
           '/staff?person=' || r.person_id
      from unnest(empfaenger) x;
  end loop;
  return n;
end
$$;
revoke execute on function public.personal_fristen_melden(date) from public, anon, authenticated;
grant execute on function public.personal_fristen_melden(date) to service_role;
