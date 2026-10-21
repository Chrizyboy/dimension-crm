-- Phase 4, Teil 1: Rollen als Daten, wirksame Rechte, Anmeldung nur für erfasste Mitarbeitende.
-- Grundsatz: Was jemand sehen darf, entscheidet die Datenbank (RLS). Die Seitenleiste blendet nur aus.

-- Rollen sind Konfiguration (CLAUDE.md Regel 8). «rechte» gibt die Rolle mit,
-- «bereiche» sind die sichtbaren Bereiche der Seitenleiste (leer = alle).
create table public.rollen (
  id           uuid primary key default gen_random_uuid(),
  schluessel   text not null unique,
  name_de      text not null,
  name_fr      text not null,
  beschreibung_de text,
  beschreibung_fr text,
  rechte       text[] not null default '{}',
  bereiche     text[] not null default '{}',
  reihenfolge  int not null default 0,
  aktiv        boolean not null default true
);
select intern.richte_fachtabelle_ein('rollen');

-- Bekannte Rechte. Neue Rechte kommen nur mit einer Migration dazu, weil RLS-Regeln sie nennen.
alter table public.rollen add constraint rollen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'admin']);
alter table public.personen add constraint personen_rechte_gueltig
  check (rechte <@ array['basis', 'preise', 'finanzen', 'admin']);

insert into public.rollen (schluessel, name_de, name_fr, beschreibung_de, beschreibung_fr, rechte, bereiche, reihenfolge) values
  ('admin', 'Administration', 'Administration',
   'Sieht und verwaltet alles, auch Benutzer und Rollen.', 'Voit et gère tout, y compris utilisateurs et rôles.',
   '{admin}', '{}', 10),
  ('verkauf', 'Verkauf', 'Vente',
   'Anfragen, Leads, Offerten und Kunden.', 'Demandes, leads, offres et clients.',
   '{}', '{dashboard,sales,quotes,workcontracts,tenders,customers,contacts,marketing,projects,aftersales,expenses,ai}', 20),
  ('innendienst', 'Innendienst / Offerten', 'Service interne / offres',
   'Offerten, Werkverträge, Einkauf und Verträge.', 'Offres, contrats d’entreprise, achats et contrats.',
   '{preise}', '{dashboard,sales,quotes,workcontracts,tenders,customers,contacts,projects,purchasing,contracts,invoices,aftersales,expenses,ai}', 30),
  ('projektleitung', 'Projektleitung', 'Direction de projet',
   'Projekte, Montage, Einkauf und Service.', 'Projets, montage, achats et service.',
   '{preise}', '{dashboard,quotes,workcontracts,customers,contacts,projects,purchasing,fieldwork,contracts,aftersales,expenses,ai}', 40),
  ('montage', 'Montage', 'Montage',
   'Eigene Einsätze, Baustelle und Rapporte, am Handy.', 'Ses interventions, chantier et rapports, sur mobile.',
   '{}', '{projects,fieldwork,aftersales,expenses}', 50),
  ('buchhaltung', 'Buchhaltung', 'Comptabilité',
   'Rechnungen, Zahlungen, Finanzen und Spesen.', 'Factures, paiements, finances et notes de frais.',
   '{finanzen,preise}', '{dashboard,customers,contacts,contracts,invoices,finance,expenses}', 60),
  -- Übergang für Personen aus der Vorlage: dort gab es nur «admin» und «Benutzer».
  ('mitarbeit', 'Mitarbeit (noch zuordnen)', 'Collaboration (à attribuer)',
   'Aus der Vorlage übernommen. Bitte eine passende Rolle wählen.', 'Repris de l’ancien CRM. Merci de choisir un rôle.',
   '{}', '{}', 90);

alter table public.personen drop constraint if exists personen_rolle_check;
alter table public.personen add constraint personen_rolle_fk foreign key (rolle) references public.rollen (schluessel) on update cascade;

-- E-Mail immer klein, damit der Abgleich mit dem Login (Microsoft schreibt oft «Vorname.Name@») sicher ist.
create or replace function intern.normalisiere_email()
returns trigger
language plpgsql
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;
create trigger email_klein before insert or update of email on public.personen
  for each row execute function intern.normalisiere_email();
create trigger email_klein before insert or update of email on public.einladungen
  for each row execute function intern.normalisiere_email();

-- Wirksame Rechte = Rechte der Rolle plus persönliche Zusatzrechte. Ersetzt die Fassung aus Phase 3.
create or replace function intern.hat_recht(p_recht text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.personen p
    left join public.rollen r on r.schluessel = p.rolle and r.aktiv and r.geloescht_am is null
    where p.auth_user_id = auth.uid()
      and p.aktiv
      and p.geloescht_am is null
      and (
        p_recht = 'basis'
        or 'admin' = any (p.rechte || coalesce(r.rechte, '{}'))
        or p_recht = any (p.rechte || coalesce(r.rechte, '{}'))
      )
  );
end;
$$;
