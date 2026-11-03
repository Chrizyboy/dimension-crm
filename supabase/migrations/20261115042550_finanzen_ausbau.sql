-- Finanzen vollständig (Entscheid 0053): Gesellschaften getrennt, Konten mit Kontoauszug, Lieferantenrechnungen mit
-- Freigabe der Buchhaltung (das Visum der Projektleitung gehört zu den Eingangsrechnungen, Thread «Rechnungen»),
-- Zahllauf mit Freigabe durch eine zweite Person,
-- MWST-Schätzung je Quartal, Marge über alle Projekte und Monatsabschluss. Buchhaltung bleibt in AbaNinja.

-- Gesellschaft an allen Planposten -------------------------------------------------------------------------------
alter table public.kreditor_zahlungen add column if not exists firma_id uuid references public.firmen (id);
alter table public.material_zahlungen add column if not exists firma_id uuid references public.firmen (id);
alter table public.fixkosten add column if not exists firma_id uuid references public.firmen (id);
alter table public.erwartete_eingaenge add column if not exists firma_id uuid references public.firmen (id);

update public.kreditor_zahlungen set firma_id = intern.firma_fuer(projekt_id, 'de')
 where firma_id is null and projekt_id is not null;
update public.material_zahlungen set firma_id = intern.firma_fuer(projekt_id, 'de')
 where firma_id is null and projekt_id is not null;
update public.erwartete_eingaenge set firma_id = intern.firma_fuer(projekt_id, 'de')
 where firma_id is null and projekt_id is not null;
update public.fixkosten f set firma_id = (select s.firma_id from public.standorte s where lower(s.kuerzel) = lower(trim(f.standort)))
 where firma_id is null and f.standort is not null;

-- Lieferantenrechnungen: Prüfung, Skonto, Zahlungsdaten -----------------------------------------------------------
alter table public.kreditor_zahlungen
  add column if not exists pruefung text check (pruefung in ('freigabe', 'bereit', 'klaeren', 'zurueckgehalten')),
  add column if not exists freigabe_von uuid references public.personen (id),
  add column if not exists freigabe_am timestamptz,
  add column if not exists skonto_prozent numeric(5, 2),
  add column if not exists skonto_bis date,
  add column if not exists skonto_rappen bigint,
  add column if not exists iban text,
  add column if not exists referenz text,
  add column if not exists bestellung_id uuid references public.bestellungen (id),
  add column if not exists zahllauf_id uuid;

-- Bisherige Einträge gelten als geprüft: sie kommen aus V233 oder wurden schon von Hand gepflegt.
update public.kreditor_zahlungen set pruefung = 'bereit' where pruefung is null;

/** Gesellschaft, Prüfschritt und Bestellung für neue Lieferantenrechnungen setzen (auch aus dem AbaNinja-Abgleich). */
create or replace function intern.kreditor_vorbereiten() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_text text := coalesce(new.text, '') || ' ' || coalesce(new.rechnung_nr, '') || ' ' || coalesce(new.referenz, '');
begin
  if new.firma_id is null and new.projekt_id is not null then
    new.firma_id := intern.firma_fuer(new.projekt_id, 'de');
  end if;
  if new.bestellung_id is null then
    select b.id into new.bestellung_id from public.bestellungen b
     where b.geloescht_am is null and b.nummer <> '' and v_text ~* ('\m' || b.nummer || '\M') limit 1;
  end if;
  if new.bestellung_id is null and new.projekt_id is not null and new.lieferant_id is not null then
    select min(b.id::text)::uuid into new.bestellung_id from public.bestellungen b
     where b.geloescht_am is null and b.projekt_id = new.projekt_id and b.lieferant_id = new.lieferant_id
       and b.status <> 'storniert'
    having count(*) = 1;
  end if;
  if tg_op = 'INSERT' and new.pruefung is null then
    -- Neue Rechnungen aus AbaNinja zahlt erst, wer sie geprüft hat; Eingangsrechnungen mit Visum setzen «bereit».
    if new.quelle = 'abaninja' and new.status = 'offen' and not coalesce(new.geprueft, false) then
      new.pruefung := 'freigabe';
    else
      new.pruefung := 'bereit';
    end if;
  end if;
  -- «Geprüft» kommt vom Visum der Eingangsrechnung (oder von Hand): dann ist die Rechnung zahlbereit.
  if tg_op = 'UPDATE' and new.geprueft and not old.geprueft and new.pruefung = 'freigabe' then
    new.pruefung := 'bereit';
    new.freigabe_am := now();
  end if;
  if new.skonto_prozent is not null and new.betrag_rappen is not null then
    new.skonto_rappen := round(new.betrag_rappen * new.skonto_prozent / 100);
  elsif new.skonto_prozent is null then
    new.skonto_rappen := null;
  end if;
  return new;
end
$$;
drop trigger if exists vorbereiten on public.kreditor_zahlungen;
create trigger vorbereiten before insert or update of projekt_id, lieferant_id, skonto_prozent, betrag_rappen, text, referenz, geprueft
  on public.kreditor_zahlungen for each row execute function intern.kreditor_vorbereiten();

/** Prüfschritt setzen (Buchhaltung): freigeben, zurückhalten, zu klären, wieder zur Freigabe. */
create or replace function public.kreditor_pruefung(p_id uuid, p_schritt text, p_notiz text default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  k public.kreditor_zahlungen;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if p_schritt not in ('freigabe', 'bereit', 'klaeren', 'zurueckgehalten') then
    raise exception using errcode = 'P0001', message = 'finanzen.schritt_falsch';
  end if;
  select * into k from public.kreditor_zahlungen where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if k.zahllauf_id is not null then raise exception using errcode = 'P0001', message = 'finanzen.im_zahllauf'; end if;
  if p_schritt in ('klaeren', 'zurueckgehalten') and nullif(trim(coalesce(p_notiz, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'finanzen.grund_fehlt';
  end if;
  update public.kreditor_zahlungen set pruefung = p_schritt,
         freigabe_von = case when p_schritt = 'bereit' then intern.meine_person_id() else freigabe_von end,
         freigabe_am = case when p_schritt = 'bereit' then now() else freigabe_am end,
         notiz = case when nullif(trim(coalesce(p_notiz, '')), '') is null then notiz
                      else concat_ws(E'\n', notiz, trim(p_notiz)) end
   where id = p_id;
end
$$;
grant execute on function public.kreditor_pruefung(uuid, text, text) to authenticated;

-- Konten und Kontoauszüge ----------------------------------------------------------------------------------------
create table public.finanz_konten (
  id             uuid primary key default gen_random_uuid(),
  firma_id       uuid not null references public.firmen (id),
  name           text not null,
  iban           text,
  stand_rappen   bigint,
  stand_am       date,
  reihenfolge    int not null default 0,
  aktiv          boolean not null default true,
  notiz          text
);
select intern.richte_fachtabelle_ein('finanz_konten', 'finanzen');
create unique index finanz_konten_iban_idx on public.finanz_konten (replace(iban, ' ', '')) where geloescht_am is null and iban is not null;

create table public.konto_buchungen (
  id              uuid primary key default gen_random_uuid(),
  konto_id        uuid not null references public.finanz_konten (id),
  datum           date not null,
  betrag_rappen   bigint not null,                  -- Eingang positiv, Ausgang negativ
  text            text,
  gegenpartei     text,
  referenz        text,                             -- QR- oder SCOR-Referenz
  bank_referenz   text not null,                    -- eindeutige Nummer der Bank, verhindert Doppelte
  kreditor_id     uuid references public.kreditor_zahlungen (id)
);
select intern.richte_fachtabelle_ein('konto_buchungen', 'finanzen');
create unique index konto_buchungen_eindeutig on public.konto_buchungen (konto_id, bank_referenz) where geloescht_am is null;

/**
 * Kontoauszug (camt.053, in der App gelesen) übernehmen: Stand mit Datum und Buchungen, ohne Doppelte.
 * Ausgänge mit gleichem Betrag wie eine Rechnung im freigegebenen Zahllauf derselben Gesellschaft setzen diese
 * auf «bezahlt». Gibt die Zähler zurück.
 */
create or replace function public.kontoauszug_einlesen(p_konto uuid, p_stand_rappen bigint, p_stand_am date, p_buchungen jsonb)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  ko public.finanz_konten;
  x jsonb;
  v_id uuid;
  v_kred uuid;
  n_neu int := 0; n_bez int := 0;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into ko from public.finanz_konten where id = p_konto and geloescht_am is null;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  for x in select * from jsonb_array_elements(coalesce(p_buchungen, '[]')) loop
    v_id := null;
    insert into public.konto_buchungen (konto_id, datum, betrag_rappen, text, gegenpartei, referenz, bank_referenz)
    values (p_konto, (x ->> 'datum')::date, (x ->> 'betrag_rappen')::bigint, x ->> 'text', x ->> 'gegenpartei',
            nullif(x ->> 'referenz', ''), x ->> 'bank_referenz')
    on conflict (konto_id, bank_referenz) where geloescht_am is null do nothing
    returning id into v_id;
    continue when v_id is null;
    n_neu := n_neu + 1;
    if (x ->> 'betrag_rappen')::bigint < 0 then
      select k.id into v_kred from public.kreditor_zahlungen k
        join public.zahllaeufe z on z.id = k.zahllauf_id and z.status = 'freigegeben' and z.firma_id = ko.firma_id
       where k.geloescht_am is null and k.status = 'offen'
         and coalesce(k.offen_rappen, k.betrag_rappen) - coalesce(case when z.ausfuehren_am <= k.skonto_bis then k.skonto_rappen end, 0)
             = -(x ->> 'betrag_rappen')::bigint
       order by (k.referenz is not null and k.referenz = x ->> 'referenz') desc, k.faellig_am
       limit 1;
      if v_kred is not null then
        update public.kreditor_zahlungen set status = 'bezahlt', bezahlt_am = (x ->> 'datum')::date, offen_rappen = 0
         where id = v_kred;
        update public.konto_buchungen set kreditor_id = v_kred where id = v_id;
        n_bez := n_bez + 1;
      end if;
    end if;
  end loop;
  if p_stand_am is not null and (ko.stand_am is null or p_stand_am >= ko.stand_am) then
    update public.finanz_konten set stand_rappen = p_stand_rappen, stand_am = p_stand_am where id = p_konto;
  end if;
  return jsonb_build_object('neu', n_neu, 'bezahlt', n_bez);
end
$$;
grant execute on function public.kontoauszug_einlesen(uuid, bigint, date, jsonb) to authenticated;

-- Zahllauf mit Freigabe -----------------------------------------------------------------------------------------
create table public.zahllaeufe (
  id               uuid primary key default gen_random_uuid(),
  firma_id         uuid not null references public.firmen (id),
  konto_id         uuid references public.finanz_konten (id),
  ausfuehren_am    date not null,
  status           text not null default 'zur_freigabe'
                   check (status in ('zur_freigabe', 'freigegeben', 'erledigt', 'verworfen')),
  vorbereitet_von  uuid references public.personen (id) default intern.meine_person_id(),
  freigegeben_von  uuid references public.personen (id),
  freigegeben_am   timestamptz,
  erledigt_am      timestamptz,
  notiz            text
);
select intern.richte_fachtabelle_ein('zahllaeufe', 'finanzen');
alter table public.kreditor_zahlungen
  add constraint kreditor_zahllauf_fk foreign key (zahllauf_id) references public.zahllaeufe (id);

/** Glocke an alle, die einen Zahllauf freigeben dürfen (Einstellung oder alle mit Recht «finanzen» ausser mir). */
create or replace function intern.zahllauf_melden(p_anzahl int, p_datum date) returns void
language sql security definer set search_path = '' as $$
  insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
  select p.id, 'info', 'Zahllauf freigeben', 'Valider le paiement groupé',
         p_anzahl || ' Zahlungen am ' || to_char(p_datum, 'DD.MM.YYYY'),
         p_anzahl || ' paiements le ' || to_char(p_datum, 'DD.MM.YYYY'), '/finance?reiter=zahllauf'
    from public.personen p
    left join public.rollen r on r.schluessel = p.rolle and r.aktiv and r.geloescht_am is null
   where p.aktiv and p.geloescht_am is null and p.id is distinct from intern.meine_person_id()
     and (p.id::text in (select jsonb_array_elements_text(coalesce(intern.fin_cfg() -> 'zahllauf_freigabe', '[]')))
          or (jsonb_array_length(coalesce(intern.fin_cfg() -> 'zahllauf_freigabe', '[]')) = 0
              and ('finanzen' = any (p.rechte || coalesce(r.rechte, '{}'))
                   or 'admin' = any (p.rechte || coalesce(r.rechte, '{}')))))
$$;
revoke execute on function intern.zahllauf_melden(int, date) from public, anon, authenticated;

/** Zahllauf vorbereiten: nur geprüfte, offene Rechnungen derselben Gesellschaft, keine schon eingeplante. */
create or replace function public.zahllauf_anlegen(p_firma uuid, p_konto uuid, p_datum date, p_ids uuid[], p_notiz text default null)
returns uuid
-- definer, weil die Glocke an andere Personen geht; das Recht prüft die erste Zeile.
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  n int;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception using errcode = 'P0001', message = 'finanzen.zahllauf_leer'; end if;
  select count(*) into n from public.kreditor_zahlungen
   where id = any (p_ids) and geloescht_am is null and status = 'offen' and pruefung = 'bereit'
     and zahllauf_id is null and firma_id = p_firma;
  if n <> array_length(p_ids, 1) then raise exception using errcode = 'P0001', message = 'finanzen.zahllauf_ungueltig'; end if;
  insert into public.zahllaeufe (firma_id, konto_id, ausfuehren_am, notiz) values (p_firma, p_konto, p_datum, p_notiz)
  returning id into v_id;
  update public.kreditor_zahlungen set zahllauf_id = v_id, geplant_am = p_datum where id = any (p_ids);
  perform intern.zahllauf_melden(n, p_datum);
  return v_id;
end
$$;
grant execute on function public.zahllauf_anlegen(uuid, uuid, date, uuid[], text) to authenticated;

/**
 * Zahllauf freigeben (Vier-Augen-Prinzip): nie die Person, die ihn vorbereitet hat. Steht in
 * einstellungen.finanzen.zahllauf_freigabe eine Liste von Personen, dürfen nur diese freigeben.
 */
create or replace function public.zahllauf_freigeben(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  z public.zahllaeufe;
  v_liste jsonb := coalesce(intern.fin_cfg() -> 'zahllauf_freigabe', '[]');
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into z from public.zahllaeufe where id = p_id and geloescht_am is null for update;
  if not found then raise exception using errcode = 'P0002', message = 'stand.unbekannt'; end if;
  if z.status <> 'zur_freigabe' then raise exception using errcode = 'P0001', message = 'finanzen.schritt_falsch'; end if;
  if z.vorbereitet_von = intern.meine_person_id() then
    raise exception using errcode = 'P0001', message = 'finanzen.vier_augen';
  end if;
  if jsonb_array_length(v_liste) > 0 and not v_liste ? intern.meine_person_id()::text then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_freigeber';
  end if;
  update public.zahllaeufe set status = 'freigegeben', freigegeben_von = intern.meine_person_id(), freigegeben_am = now()
   where id = p_id;
end
$$;
grant execute on function public.zahllauf_freigeben(uuid) to authenticated;

/** Zahllauf verwerfen: die Rechnungen sind wieder frei für den nächsten Lauf. */
create or replace function public.zahllauf_verwerfen(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  update public.zahllaeufe set status = 'verworfen' where id = p_id and status in ('zur_freigabe', 'freigegeben');
  if not found then raise exception using errcode = 'P0001', message = 'finanzen.schritt_falsch'; end if;
  update public.kreditor_zahlungen set zahllauf_id = null, geplant_am = null where zahllauf_id = p_id and status = 'offen';
end
$$;
grant execute on function public.zahllauf_verwerfen(uuid) to authenticated;

/** Zahllauf ausgeführt (in AbaNinja oder im E-Banking bezahlt): alle offenen Rechnungen darin gelten als bezahlt. */
create or replace function public.zahllauf_erledigt(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  z public.zahllaeufe;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  select * into z from public.zahllaeufe where id = p_id and geloescht_am is null for update;
  if not found or z.status <> 'freigegeben' then raise exception using errcode = 'P0001', message = 'finanzen.schritt_falsch'; end if;
  update public.kreditor_zahlungen set status = 'bezahlt', bezahlt_am = z.ausfuehren_am, offen_rappen = 0
   where zahllauf_id = p_id and status = 'offen';
  update public.zahllaeufe set status = 'erledigt', erledigt_am = now() where id = p_id;
end
$$;
grant execute on function public.zahllauf_erledigt(uuid) to authenticated;

-- MWST ----------------------------------------------------------------------------------------------------------
create table public.mwst_abrechnungen (
  id              uuid primary key default gen_random_uuid(),
  firma_id        uuid not null references public.firmen (id),
  periode         text not null check (periode ~ '^\d{4}-(Q[1-4]|S[12])$'),
  betrag_rappen   bigint not null,                 -- verbindlicher Betrag aus AbaNinja
  faellig_am      date not null,
  bezahlt_am      date,
  notiz           text
);
select intern.richte_fachtabelle_ein('mwst_abrechnungen', 'finanzen');
create unique index mwst_abrechnungen_eindeutig on public.mwst_abrechnungen (firma_id, periode) where geloescht_am is null;

/**
 * MWST je Gesellschaft und Periode (effektive Methode): Umsatzsteuer aus gestellten Rechnungen minus Vorsteuer aus
 * Lieferantenrechnungen (Satz aus mwst_satz()). Ist ein verbindlicher Betrag erfasst, gilt dieser. Fällig 60 Tage
 * nach Ende der Periode. Methode und Periode aus einstellungen.finanzen (mwst_methode, mwst_periode).
 */
create or replace function public.mwst_schaetzung(p_von date, p_bis date) returns table (
  firma_id uuid, periode text, von date, bis date, faellig_am date, umsatz_rappen bigint, umsatzsteuer_rappen bigint,
  vorsteuer_rappen bigint, zahllast_rappen bigint, verbindlich boolean, bezahlt_am date)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_halb boolean := coalesce(intern.fin_cfg() ->> 'mwst_periode', 'quartal') = 'semester';
  v_saldo numeric := nullif(intern.fin_cfg() ->> 'mwst_saldosteuersatz', '')::numeric;
  v_satz numeric := public.mwst_satz();
  v_start date;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  v_start := date_trunc(case when v_halb then 'year' else 'quarter' end, p_von)::date;
  while v_start <= p_bis loop
    bis := (v_start + (case when v_halb then interval '6 months' else interval '3 months' end))::date - 1;
    if v_halb and extract(month from v_start) = 1 and extract(month from bis) <> 6 then bis := make_date(extract(year from v_start)::int, 6, 30); end if;
    von := v_start;
    periode := to_char(v_start, 'YYYY') || case when v_halb then '-S' || case when extract(month from v_start) <= 6 then '1' else '2' end
                                                 else '-Q' || extract(quarter from v_start)::int end;
    faellig_am := bis + 60;
    for firma_id in select f.id from public.firmen f where f.geloescht_am is null order by f.kuerzel loop
      select coalesce(sum(r.netto_rappen), 0), coalesce(sum(r.mwst_rappen), 0) into umsatz_rappen, umsatzsteuer_rappen
        from public.rechnungen r
       where r.geloescht_am is null and r.firma_id = mwst_schaetzung.firma_id and r.status not in ('entwurf', 'storniert')
         and r.datum between von and bis;
      if v_saldo is not null then
        umsatzsteuer_rappen := round((umsatz_rappen + umsatzsteuer_rappen) * v_saldo / 100);
        vorsteuer_rappen := 0;
      else
        select coalesce(sum(k.betrag_rappen - round(k.betrag_rappen / (1 + v_satz / 100))), 0) into vorsteuer_rappen
          from public.kreditor_zahlungen k
         where k.geloescht_am is null and k.firma_id = mwst_schaetzung.firma_id and k.status <> 'storniert'
           and coalesce(k.kategorie, '') not in ('Lohn', 'Sozialversicherung', 'Steuern', 'Versicherung')
           and k.rechnung_am between von and bis;
      end if;
      zahllast_rappen := umsatzsteuer_rappen - vorsteuer_rappen;
      verbindlich := false;
      bezahlt_am := null;
      select a.betrag_rappen, true, a.bezahlt_am, a.faellig_am
        into zahllast_rappen, verbindlich, bezahlt_am, faellig_am
        from public.mwst_abrechnungen a
       where a.geloescht_am is null and a.firma_id = mwst_schaetzung.firma_id and a.periode = mwst_schaetzung.periode;
      if not found then faellig_am := bis + 60; end if;
      return next;
    end loop;
    v_start := bis + 1;
  end loop;
end
$$;
grant execute on function public.mwst_schaetzung(date, date) to authenticated;

-- Marge über alle Projekte --------------------------------------------------------------------------------------
/**
 * Marge aller Projekte in einer Abfrage (Recht preise oder finanzen): Vertrag und Nachträge, verrechnet, bezahlt,
 * Kosten bisher (wie nachkalkulation), Soll aus der Kalkulation, Gesellschaft und Produkt. Beträge exkl. MWST.
 */
create or replace function public.marge_uebersicht() returns table (
  projekt_id uuid, nummer text, titel text, kunde text, status text, firma_id uuid, produkt text,
  unterzeichnet_am date, umsatz_rappen bigint, verrechnet_rappen bigint, bezahlt_rappen bigint, kosten_rappen bigint,
  material_rappen bigint, arbeit_rappen bigint, soll_verkauf_rappen bigint, soll_einkauf_rappen bigint,
  schlussrechnung boolean)
language plpgsql stable security invoker set search_path = '' as $$
declare
  pr record;
  n jsonb;
begin
  if not (intern.hat_recht('preise') or intern.hat_recht('finanzen')) then
    raise exception using errcode = 'P0001', message = 'finanzen.kein_recht';
  end if;
  for pr in
    select p.id, p.nummer, p.titel, p.status, p.unterzeichnet_am, intern.kontaktname(k) as kunde,
           intern.firma_fuer(p.id, 'de') as firma_id, v.interesse
      from public.projekte p
      left join public.kontakte k on k.id = p.kontakt_id
      left join public.verkaufschancen v on v.id = p.verkaufschance_id
     where p.geloescht_am is null
  loop
    n := public.nachkalkulation(pr.id);
    projekt_id := pr.id; nummer := pr.nummer; titel := pr.titel; kunde := pr.kunde; status := pr.status;
    firma_id := pr.firma_id; unterzeichnet_am := pr.unterzeichnet_am;
    produkt := case when 'waermepumpe' = any (coalesce(pr.interesse, '{}')) then 'waermepumpe'
                    when 'pv' = any (coalesce(pr.interesse, '{}')) then 'pv'
                    when 'batterie' = any (coalesce(pr.interesse, '{}')) then 'batterie'
                    else 'andere' end;
    umsatz_rappen := (n #>> '{ist,umsatz_rappen}')::bigint;
    verrechnet_rappen := (n #>> '{ist,verrechnet_rappen}')::bigint;
    material_rappen := (n #>> '{ist,material_rappen}')::bigint;
    arbeit_rappen := (n #>> '{ist,arbeit_rappen}')::bigint;
    kosten_rappen := coalesce(material_rappen, 0) + coalesce(arbeit_rappen, 0);
    soll_verkauf_rappen := (n #>> '{soll,verkauf_rappen}')::bigint;
    soll_einkauf_rappen := (n #>> '{soll,einkauf_rappen}')::bigint;
    select coalesce(sum(round(r.bezahlt_rappen * r.netto_rappen::numeric / nullif(r.total_rappen, 0))), 0),
           bool_or(r.art = 'schluss')
      into bezahlt_rappen, schlussrechnung
      from public.rechnungen r
     where r.projekt_id = pr.id and r.geloescht_am is null and r.status not in ('entwurf', 'storniert');
    schlussrechnung := coalesce(schlussrechnung, false);
    return next;
  end loop;
end
$$;
grant execute on function public.marge_uebersicht() to authenticated;

-- Monatsabschluss -----------------------------------------------------------------------------------------------
create table public.monatsabschluesse (
  id               uuid primary key default gen_random_uuid(),
  monat            text not null check (monat ~ '^\d{4}-\d{2}$'),
  bestaetigt_von   uuid references public.personen (id) default intern.meine_person_id(),
  bestaetigt_am    timestamptz not null default now(),
  offen            jsonb not null default '[]',      -- Punkte, die beim Bestätigen noch offen waren
  notiz            text
);
select intern.richte_fachtabelle_ein('monatsabschluesse', 'finanzen');
create unique index monatsabschluesse_monat on public.monatsabschluesse (monat) where geloescht_am is null;

/** Zahlen für die Abschluss-Liste eines Monats (Stichtag = letzter Tag). */
create or replace function public.monatsabschluss_stand(p_monat text) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_von date := (p_monat || '-01')::date;
  v_bis date := ((p_monat || '-01')::date + interval '1 month')::date - 1;
begin
  if not intern.hat_recht('finanzen') then raise exception using errcode = 'P0001', message = 'finanzen.kein_recht'; end if;
  return jsonb_build_object(
    'von', v_von, 'bis', v_bis,
    'konten_alt', (select count(*) from public.finanz_konten where geloescht_am is null and aktiv
                     and (stand_am is null or stand_am < v_bis)),
    'abaninja_am', (select max(abaninja_abgeglichen_am) from public.rechnungen where geloescht_am is null),
    'ohne_zuordnung', (select count(*) from public.kreditor_zahlungen where geloescht_am is null and status <> 'storniert'
                         and rechnung_am between v_von and v_bis and projekt_id is null and kategorie is null),
    'ohne_firma', (select count(*) from public.kreditor_zahlungen where geloescht_am is null and status = 'offen'
                     and firma_id is null),
    'pruefung_offen', (select count(*) from public.kreditor_zahlungen where geloescht_am is null and status = 'offen'
                         and pruefung in ('freigabe', 'klaeren') and rechnung_am <= v_bis),
    'spesen_offen', (select count(*) from public.spesen where geloescht_am is null and status in ('eingereicht', 'genehmigt')
                       and datum <= v_bis),
    'tranchen_offen', (select count(*) from public.offene_tranchen where faellig_am <= v_bis),
    'zeiten_offen', (select count(*) from public.zeiten where geloescht_am is null and stopp is not null
                       and start::date between v_von and v_bis and exportiert_am is null),
    'abschluss', (select to_jsonb(m) from public.monatsabschluesse m where m.monat = p_monat and m.geloescht_am is null));
end
$$;
grant execute on function public.monatsabschluss_stand(text) to authenticated;

-- Gesellschaft je Projekt für die Liquidität (Tranchen und offene Rechnungen kommen aus anderen Sichten).
create or replace view public.finanz_projekt_firma with (security_invoker = true) as
select p.id as projekt_id, intern.firma_fuer(p.id, 'de') as firma_id
  from public.projekte p where p.geloescht_am is null;
