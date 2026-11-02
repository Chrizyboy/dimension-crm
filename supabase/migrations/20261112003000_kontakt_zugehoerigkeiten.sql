-- Adressbuch Teil 1: Wer gehört zu wem (Person ↔ Firma, auch zweite Person eines Haushalts).
-- Eine Tabelle für Adressbuch und Kundenakte (abgestimmt zwischen beiden Bereichen am 02.11.2026):
-- Ansprechpersonen einer Firma mit Funktion und Merkern, wer unterschreibt, wer Rechnungen bekommt,
-- wer vor Ort ist. «firma_id» ist der übergeordnete Kontakt; bei Ehepaaren darf das auch eine Person sein.

create table public.kontakt_zugehoerigkeiten (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.kontakte (id),
  firma_id       uuid not null references public.kontakte (id),
  funktion       text,                               -- frei: «Gérante», «Hauswart», «Innendienst» …
  hauptkontakt   boolean not null default false,     -- erste Ansprechperson der Firma
  unterschreibt  boolean not null default false,     -- darf Offerten/Verträge unterschreiben
  rechnungen     boolean not null default false,     -- bekommt Rechnungen
  vor_ort        boolean not null default false,     -- Zugang, Schlüssel, Termine vor Ort
  bevorzugt      text,                               -- «nur Mail», «abends anrufen» …
  telefon_direkt text,                               -- direkte Nummer in dieser Firma (sonst die der Person)
  email_direkt   text,
  reihenfolge    int not null default 0,
  constraint kontakt_zugehoerigkeiten_nicht_selbst check (person_id <> firma_id)
);

select intern.richte_fachtabelle_ein('kontakt_zugehoerigkeiten');

comment on table public.kontakt_zugehoerigkeiten is
  'Ansprechpersonen: Person gehört zu Firma (oder zweite Person eines Haushalts). Gemeinsam für Adressbuch und Kundenakte.';

-- Eine Person nur einmal pro Firma; im Papierkorb Liegendes zählt nicht.
create unique index kontakt_zugehoerigkeiten_paar_idx
  on public.kontakt_zugehoerigkeiten (person_id, firma_id) where geloescht_am is null;
-- Höchstens ein Hauptkontakt pro Firma, damit Listen und Mails eindeutig sind.
create unique index kontakt_zugehoerigkeiten_haupt_idx
  on public.kontakt_zugehoerigkeiten (firma_id) where hauptkontakt and geloescht_am is null;
create index kontakt_zugehoerigkeiten_firma_idx on public.kontakt_zugehoerigkeiten (firma_id) where geloescht_am is null;

-- Wird ein neuer Hauptkontakt gesetzt, verliert der bisherige den Merker (statt Fehler im Formular).
create or replace function intern.zugehoerigkeit_ein_hauptkontakt()
returns trigger
language plpgsql
as $$
begin
  if new.hauptkontakt and new.geloescht_am is null then
    update public.kontakt_zugehoerigkeiten
       set hauptkontakt = false
     where firma_id = new.firma_id and id <> new.id and hauptkontakt and geloescht_am is null;
  end if;
  return new;
end;
$$;

create trigger ein_hauptkontakt before insert or update of hauptkontakt, geloescht_am
  on public.kontakt_zugehoerigkeiten for each row execute function intern.zugehoerigkeit_ein_hauptkontakt();

-- Sicht für Listen und Akten: Zugehörigkeit mit Namen, Nummer und Mail beider Seiten in einer Abfrage.
create or replace view public.kontakt_zugehoerigkeiten_sicht with (security_invoker = true) as
select z.id, z.person_id, z.firma_id, z.funktion, z.hauptkontakt, z.unterschreibt, z.rechnungen, z.vor_ort,
       z.bevorzugt, z.reihenfolge,
       coalesce(z.telefon_direkt, p.telefon) as telefon,
       coalesce(z.email_direkt, p.email) as email,
       z.telefon_direkt, z.email_direkt,
       nullif(trim(concat_ws(' ', p.vorname, p.nachname)), '') as person_name,
       p.anrede as person_anrede, p.sprache as person_sprache,
       coalesce(nullif(f.firma, ''), nullif(trim(concat_ws(' ', f.vorname, f.nachname)), '')) as firma_name,
       f.art as firma_art, f.kontaktart as firma_kontaktart
  from public.kontakt_zugehoerigkeiten z
  join public.kontakte p on p.id = z.person_id and p.geloescht_am is null
  join public.kontakte f on f.id = z.firma_id and f.geloescht_am is null
 where z.geloescht_am is null;

grant select on public.kontakt_zugehoerigkeiten_sicht to authenticated;
