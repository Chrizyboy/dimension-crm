-- Kunden vollständig machen, Schritt 2 (Entscheid 0045):
-- fester Betreuer, Herkunft, Rechnungsangaben und UID am Kunden; Vor-Ort-Hinweise und Heizung am Gebäude;
-- Doppelte zusammenführen (nur Administration), ohne etwas hart zu löschen.

alter table public.kontakte
  add column betreuer_id uuid references public.personen (id),
  add column herkunft text,
  add column rechnungsadresse jsonb,
  add column rechnungs_email text,
  add column zahlungsfrist_tage int check (zahlungsfrist_tage between 0 and 120),
  add column uid_nr text,
  add column zusammengefuehrt_in uuid references public.kontakte (id);

comment on column public.kontakte.betreuer_id is 'Fester Ansprechpartner bei uns; leer = wer das letzte Geschäft betreut.';
comment on column public.kontakte.herkunft is 'Wie der Kunde zu uns kam (Auswahlliste «quelle», dieselbe wie bei Leads).';
comment on column public.kontakte.rechnungsadresse is
  'Abweichende Rechnungsadresse {name, zusatz, strasse, plz, ort}; leer = Adresse des Kunden.';
comment on column public.kontakte.rechnungs_email is 'Rechnungen per Mail an diese Adresse statt an die Kunden-Mail.';
comment on column public.kontakte.zahlungsfrist_tage is 'Eigene Zahlungsfrist; leer = Frist der Firma.';
comment on column public.kontakte.uid_nr is 'UID (CHE-…) bei Firmen.';
comment on column public.kontakte.zusammengefuehrt_in is 'Gesetzt, wenn dieser Kontakt als Doppelter in einen anderen überführt wurde.';

create index kontakte_betreuer_idx on public.kontakte (betreuer_id) where geloescht_am is null;

alter table public.objekte
  add column vor_ort text,
  add column heizung text;

comment on column public.objekte.vor_ort is 'Hinweise für Montage und Service: Zugang, Schlüssel, Parkplatz, Hund, Zähler.';
comment on column public.objekte.heizung is 'Heutige Heizung (Öl, Gas, Holz, Elektro, Wärmepumpe …), für Wärmepumpen-Angebote.';

-- Gestellte Rechnungen behalten ihren Kunden. Einzige Ausnahme: das Zusammenführen von Doppelten, denn dort ist es
-- derselbe Kunde, nur doppelt erfasst. Das Merkmal gilt nur innerhalb von kontakt_zusammenfuehren (set local).
create or replace function intern.rechnung_rechnen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_summe numeric := 0;
  v_kontakt uuid := new.kontakt_id;
begin
  if coalesce(current_setting('intern.zusammenfuehren', true), '') = 'ja' then
    v_kontakt := old.kontakt_id;
  end if;
  if tg_op = 'UPDATE' and old.status <> 'entwurf'
     and (new.positionen, new.inkl_mwst, new.mwst_satz, v_kontakt, new.firma_id)
         is distinct from (old.positionen, old.inkl_mwst, old.mwst_satz, old.kontakt_id, old.firma_id) then
    raise exception using errcode = 'P0001', message = 'finanzen.rechnung_gestellt';
  end if;
  select coalesce(sum(round(coalesce((x ->> 'menge')::numeric, 1) * coalesce((x ->> 'preis_rappen')::numeric, 0))), 0)
    into v_summe from jsonb_array_elements(new.positionen) x;
  if new.inkl_mwst then
    new.total_rappen := v_summe;
    new.netto_rappen := round(v_summe / (1 + new.mwst_satz / 100));
    new.mwst_rappen := new.total_rappen - new.netto_rappen;
  else
    new.netto_rappen := v_summe;
    new.mwst_rappen := round(v_summe * new.mwst_satz / 100);
    new.total_rappen := new.netto_rappen + new.mwst_rappen;
  end if;
  return new;
end
$$;

/**
 * Führt einen doppelt erfassten Kontakt (p_weg) in p_behalten über: alles, was an p_weg hängt (Gebäude, Leads,
 * Offerten, Projekte, Rechnungen, Mails, Aufgaben, Dokumente, Ansprechpersonen …), zeigt danach auf p_behalten.
 * Leere Felder von p_behalten werden aus p_weg ergänzt, Werbesperre gilt, wenn einer der beiden gesperrt ist.
 * p_weg kommt in den Papierkorb (nie hart gelöscht) und merkt sich, wohin er überführt wurde.
 * Nur Administration (Entscheid 0045). Gibt die Zahl der umgehängten Zeilen zurück.
 */
create or replace function public.kontakt_zusammenfuehren(p_behalten uuid, p_weg uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.kontakte;
  w public.kontakte;
  r record;
  v_n int;
  v_total int := 0;
begin
  if not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'kunden.zusammenfuehren_kein_recht';
  end if;
  if p_behalten = p_weg then
    raise exception using errcode = 'P0001', message = 'kunden.zusammenfuehren_gleich';
  end if;
  select * into b from public.kontakte where id = p_behalten and geloescht_am is null for update;
  select * into w from public.kontakte where id = p_weg and geloescht_am is null for update;
  if b.id is null or w.id is null then
    raise exception using errcode = 'P0001', message = 'kunden.zusammenfuehren_fehlt';
  end if;

  perform set_config('intern.zusammenfuehren', 'ja', true);

  -- Ansprechpersonen: Paare, die es beim Behaltenen schon gibt, und Verweise auf sich selbst in den Papierkorb.
  update public.kontakt_zugehoerigkeiten z set geloescht_am = now()
   where z.geloescht_am is null
     and ((z.person_id = p_weg and (z.firma_id = p_behalten or exists (
             select 1 from public.kontakt_zugehoerigkeiten x
              where x.geloescht_am is null and x.person_id = p_behalten and x.firma_id = z.firma_id)))
       or (z.firma_id = p_weg and (z.person_id = p_behalten or exists (
             select 1 from public.kontakt_zugehoerigkeiten x
              where x.geloescht_am is null and x.firma_id = p_behalten and x.person_id = z.person_id))));
  -- Nur ein Hauptkontakt pro Firma: hat der Behaltene schon einen, verliert der übernommene den Merker.
  if exists (select 1 from public.kontakt_zugehoerigkeiten
              where firma_id = p_behalten and hauptkontakt and geloescht_am is null) then
    update public.kontakt_zugehoerigkeiten set hauptkontakt = false
     where firma_id = p_weg and hauptkontakt and geloescht_am is null;
  end if;

  -- Jede Spalte, die per Fremdschlüssel auf kontakte zeigt, umhängen (auch Tabellen, die später dazukommen).
  for r in
    select c.conrelid::regclass as tabelle, a.attname as spalte
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.kontakte'::regclass and array_length(c.conkey, 1) = 1
       and c.conrelid <> 'public.kontakte'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', r.tabelle, r.spalte, r.spalte) using p_behalten, p_weg;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
  end loop;

  -- Lose Bezüge ohne Fremdschlüssel.
  update public.aufgaben set bezug_id = p_behalten where bezug_tabelle = 'kontakte' and bezug_id = p_weg;
  get diagnostics v_n = row_count; v_total := v_total + v_n;
  update public.dokumente set bezug_id = p_behalten where bezug_tabelle = 'kontakte' and bezug_id = p_weg;
  get diagnostics v_n = row_count; v_total := v_total + v_n;
  update public.anschreiben set dossier_kontakt_id = p_behalten where dossier_kontakt_id = p_weg;
  get diagnostics v_n = row_count; v_total := v_total + v_n;

  -- Der Doppelte zuerst in den Papierkorb (gibt eindeutige Werte wie den Empfehlungs-Code frei) …
  update public.kontakte
     set geloescht_am = now(), zusammengefuehrt_in = p_behalten, empfehlungs_code = null
   where id = p_weg;

  -- … dann leere Felder beim Behaltenen ergänzen.
  update public.kontakte k set
    anrede = coalesce(k.anrede, w.anrede),
    vorname = coalesce(nullif(k.vorname, ''), w.vorname),
    firma = coalesce(nullif(k.firma, ''), w.firma),
    email = coalesce(nullif(k.email, ''), w.email),
    telefon = coalesce(nullif(k.telefon, ''), w.telefon),
    werbesperre = k.werbesperre or w.werbesperre,
    notiz = case
      when nullif(trim(w.notiz), '') is null then k.notiz
      when nullif(trim(k.notiz), '') is null then w.notiz
      else k.notiz || E'\n\n' || w.notiz end,
    abaninja_id = coalesce(k.abaninja_id, w.abaninja_id),
    empfehlungs_code = coalesce(k.empfehlungs_code, w.empfehlungs_code),
    betreuer_id = coalesce(k.betreuer_id, w.betreuer_id),
    herkunft = coalesce(k.herkunft, w.herkunft),
    rechnungsadresse = coalesce(k.rechnungsadresse, w.rechnungsadresse),
    rechnungs_email = coalesce(nullif(k.rechnungs_email, ''), w.rechnungs_email),
    zahlungsfrist_tage = coalesce(k.zahlungsfrist_tage, w.zahlungsfrist_tage),
    uid_nr = coalesce(nullif(k.uid_nr, ''), w.uid_nr)
   where k.id = p_behalten;

  -- Im Verlauf festhalten, damit man später sieht, woher die Einträge kommen.
  insert into public.aktivitaeten (kontakt_id, art, text, zeitpunkt, person_id)
  values (p_behalten, 'aenderung',
          format('Doppelten zusammengeführt: Kundennummer %s (%s) wurde hierher überführt, %s Einträge umgehängt.',
                 w.kundennummer, trim(coalesce(w.vorname, '') || ' ' || coalesce(w.nachname, w.firma, '')), v_total),
          now(), intern.meine_person_id());

  perform set_config('intern.zusammenfuehren', '', true);
  return v_total;
end
$$;

revoke execute on function public.kontakt_zusammenfuehren(uuid, uuid) from public, anon;
grant execute on function public.kontakt_zusammenfuehren(uuid, uuid) to authenticated;
