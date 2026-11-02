-- Einkauf & Material vollständig (2.11.2026, Entscheid 0039): Konditionen der Lieferanten, Verpackungseinheit und
-- Lieferzeit je Preis, Auftragsbestätigung, Rechnungsabgleich, Freigabegrenze und Sammelbestellung über Projekte.
-- Nur Ergänzungen: bestehende Spalten und Abläufe aus Phase 9a (Entscheid 0019) bleiben.

-- Konditionen je Lieferant (Fracht, Mindestwert, Lieferzeit, Zahlung, Bestellweg).
alter table public.lieferanten
  add column if not exists fracht_frei_ab_rappen bigint,
  add column if not exists fracht_rappen bigint,
  add column if not exists mindestbestellwert_rappen bigint,
  add column if not exists lieferzeit_tage int check (lieferzeit_tage between 0 and 365),
  add column if not exists zahlungsziel_tage int,
  add column if not exists skonto_prozent numeric(5, 2),
  add column if not exists skonto_tage int,
  add column if not exists bestellschluss text,
  add column if not exists bestellweg text not null default 'mail' check (bestellweg in ('mail', 'webshop', 'telefon')),
  add column if not exists webshop_url text;
comment on column public.lieferanten.lieferzeit_tage is 'Übliche Lieferzeit in Arbeitstagen (wenn der Preis keine eigene hat).';

-- Je Preis: Verpackungseinheit (z. B. Palette 36 Module), eigene Lieferzeit und der vorherige Preis.
alter table public.lieferantenpreise
  add column if not exists verpackungseinheit numeric(12, 3) check (verpackungseinheit > 0),
  add column if not exists lieferzeit_tage int check (lieferzeit_tage between 0 and 365),
  add column if not exists ek_vorher_rappen bigint,
  add column if not exists ek_geaendert_am date;

/** Ändert sich ein Einkaufspreis, bleibt der alte sichtbar (Preisänderung markieren). */
create or replace function intern.ek_vorher_merken() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.ek_rappen is distinct from old.ek_rappen and old.ek_rappen is not null then
    new.ek_vorher_rappen := old.ek_rappen;
    new.ek_geaendert_am := current_date;
  end if;
  return new;
end
$$;
drop trigger if exists ek_vorher on public.lieferantenpreise;
create trigger ek_vorher before update of ek_rappen on public.lieferantenpreise
  for each row execute function intern.ek_vorher_merken();

-- Bestellung: wer bestellt, Vorlage zur Freigabe, Auftragsbestätigung (AB), Lieferung und Rechnung.
alter table public.bestellungen
  add column if not exists bestellt_von uuid references public.personen (id),
  add column if not exists vorgelegt_am timestamptz,
  add column if not exists ab_nummer text,
  add column if not exists ab_am date,
  add column if not exists ab_termin date,
  add column if not exists ab_total_rappen bigint,
  add column if not exists tracking text,
  add column if not exists lieferhinweis text,
  add column if not exists kontakt_vor_ort text,
  add column if not exists nachgefragt_am date,
  add column if not exists lieferscheine text[] not null default '{}',
  add column if not exists rechnung_kreditor_id uuid references public.kreditor_zahlungen (id),
  add column if not exists rechnung_nummer text,
  add column if not exists rechnung_rappen bigint,
  add column if not exists rechnung_geprueft_am timestamptz,
  add column if not exists rechnung_geprueft_von uuid references public.personen (id),
  add column if not exists rechnung_notiz text;
comment on column public.bestellungen.liefertermin is 'Gewünschter Liefertermin; bestätigt ist ab_termin.';
create unique index if not exists bestellungen_kreditor_idx on public.bestellungen (rechnung_kreditor_id)
  where rechnung_kreditor_id is not null and geloescht_am is null;

alter table public.bestellpositionen
  add column if not exists ab_menge numeric(12, 3),
  add column if not exists ab_ek_rappen bigint;

/** Nummer, bestellende Person; Lieferant nur im Entwurf änderbar (wie bisher). */
create or replace function intern.bestellung_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.nummer, '') = '' then
      new.nummer := 'B' || lpad(nextval('intern.bestell_nummer')::text, 4, '0');
    end if;
    new.bestellt_von := coalesce(new.bestellt_von, intern.meine_person_id());
  elsif old.status <> 'entwurf' and new.lieferant_id is distinct from old.lieferant_id then
    raise exception using errcode = 'P0001', message = 'einkauf.nicht_entwurf';
  end if;
  return new;
end
$$;

-- Einstellungen des Einkaufs (nur Administration ändert sie).
insert into public.einstellungen (schluessel, wert) values ('einkauf', jsonb_build_object(
  'freigabe_grenze_rappen', 500000,
  'freigabe_durch', jsonb_build_array('andreas@dimension-solaire.ch'),
  'puffer_arbeitstage', 5,
  'lieferzeit_tage', 5,
  'ab_erinnern_tage', 3,
  'gefahr_tage', 10
)) on conflict (schluessel) do nothing;

create or replace function intern.einkauf_einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'einkauf' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'einkauf.kein_recht';
  end if;
  return new;
end
$$;
drop trigger if exists einkauf_schuetzen on public.einstellungen;
create trigger einkauf_schuetzen before insert or update on public.einstellungen
  for each row execute function intern.einkauf_einstellung_schuetzen();

/** Einstellung «einkauf» mit Standardwerten. */
create or replace function intern.einkauf_cfg() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('freigabe_grenze_rappen', 500000, 'freigabe_durch', '[]'::jsonb, 'puffer_arbeitstage', 5,
                            'lieferzeit_tage', 5, 'ab_erinnern_tage', 3, 'gefahr_tage', 10)
         || coalesce((select wert from public.einstellungen where schluessel = 'einkauf' and geloescht_am is null), '{}')
$$;

/** Personen, die über der Grenze freigeben (Einstellung «freigabe_durch», sonst die Administration). */
create or replace function intern.einkauf_freigeber() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select array_agg(p.id) from public.personen p
      where p.aktiv and p.geloescht_am is null
        and lower(p.email) in (select lower(x) from jsonb_array_elements_text(intern.einkauf_cfg() -> 'freigabe_durch') x)),
    (select array_agg(p.id) from public.personen p where p.aktiv and p.geloescht_am is null and p.rolle = 'admin'),
    '{}')
$$;

/** Darf ich diese Summe freigeben? Unter der Grenze alle mit Recht «preise», darüber nur die Freigebenden. */
create or replace function public.einkauf_darf_freigeben(p_total_rappen bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select intern.hat_recht('preise')
     and (coalesce(p_total_rappen, 0) < (intern.einkauf_cfg() ->> 'freigabe_grenze_rappen')::bigint
          or intern.meine_person_id() = any (intern.einkauf_freigeber()))
$$;

/** Datum, das n Arbeitstage (Mo–Fr) vor einem Datum liegt. */
create or replace function intern.arbeitstage_minus(p_datum date, p_tage int) returns date
language plpgsql immutable set search_path = '' as $$
declare
  d date := p_datum;
  n int := 0;
begin
  if d is null then return null; end if;
  while n < greatest(p_tage, 0) loop
    d := d - 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end
$$;

/** Lieferzeit in Arbeitstagen für einen Artikel bei einem Lieferanten (Preis, sonst Lieferant, sonst Standard). */
create or replace function intern.lieferzeit(p_lieferant uuid, p_artikel uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select lp.lieferzeit_tage from public.lieferantenpreise lp
      where lp.lieferant_id = p_lieferant and lp.artikel_id = p_artikel and lp.geloescht_am is null),
    (select l.lieferzeit_tage from public.lieferanten l where l.id = p_lieferant),
    (intern.einkauf_cfg() ->> 'lieferzeit_tage')::int)
$$;

revoke execute on function public.einkauf_darf_freigeben(bigint) from public, anon;
grant execute on function public.einkauf_darf_freigeben(bigint) to authenticated;
grant execute on function intern.arbeitstage_minus(date, int) to authenticated;
grant execute on function intern.lieferzeit(uuid, uuid) to authenticated;
grant execute on function intern.einkauf_cfg() to authenticated;
grant execute on function intern.einkauf_freigeber() to authenticated;
