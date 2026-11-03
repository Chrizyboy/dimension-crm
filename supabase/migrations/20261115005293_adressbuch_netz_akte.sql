-- Adressbuch Teil 2: Netzbetreiber je Gemeinde (ElCom), Liste und Akte der Partner, Provision für Vermittler,
-- Fristen der Nachweise. Entscheid 0049.

-- 1. Netzbetreiber je Gemeinde ----------------------------------------------------------------------------------
-- Nachschlagetabellen, gefüllt von der Edge Function «adressbuch» aus den offenen Daten des Bundes (ElCom auf
-- LINDAS, Gemeinde je PLZ über api3.geo.admin.ch). Keine Fachtabellen: ersetzt beim Einlesen, gelesen von allen.
create table public.netzbetreiber_gemeinden (
  bfs_nr        int not null,
  gemeinde      text not null,
  elcom_id      text not null,
  netzbetreiber text not null,
  jahr          int,
  eingelesen_am timestamptz not null default now(),
  primary key (bfs_nr, elcom_id)
);
create table public.plz_gemeinden (
  plz           text primary key references public.plz_verzeichnis (plz),
  bfs_nr        int,                         -- null = an der Stelle keine Gemeinde gefunden
  gemeinde      text,
  eingelesen_am timestamptz not null default now()
);
create index netzbetreiber_gemeinden_name_idx on public.netzbetreiber_gemeinden (lower(gemeinde));
create index netzbetreiber_gemeinden_elcom_idx on public.netzbetreiber_gemeinden (elcom_id);
alter table public.netzbetreiber_gemeinden enable row level security;
alter table public.plz_gemeinden enable row level security;
create policy lesen on public.netzbetreiber_gemeinden for select to authenticated using (true);
create policy lesen on public.plz_gemeinden for select to authenticated using (true);
grant select on public.netzbetreiber_gemeinden, public.plz_gemeinden to authenticated;
comment on table public.netzbetreiber_gemeinden is 'ElCom: welche Netzbetreiber eine Gemeinde versorgen (offene Daten, Nachschlagetabelle).';

/** Netzbetreiber für ein Gebäude: zuerst über den Gemeindenamen, sonst über die PLZ. Mit Kontakt im Adressbuch. */
create or replace function public.netzbetreiber_fuer(p_plz text, p_gemeinde text default null)
returns table (elcom_id text, netzbetreiber text, gemeinde text, kontakt_id uuid)
language sql stable security definer set search_path = '' as $$
  with treffer as (
    select n.* from public.netzbetreiber_gemeinden n
     where nullif(trim(p_gemeinde), '') is not null and lower(n.gemeinde) = lower(trim(p_gemeinde))
    union
    select n.* from public.netzbetreiber_gemeinden n
      join public.plz_gemeinden g on g.bfs_nr = n.bfs_nr
     where g.plz = trim(p_plz)
       and not exists (select 1 from public.netzbetreiber_gemeinden x
                        where nullif(trim(p_gemeinde), '') is not null and lower(x.gemeinde) = lower(trim(p_gemeinde)))
  )
  select t.elcom_id, t.netzbetreiber, t.gemeinde,
         (select r.kontakt_id from public.kontakt_rollen r join public.kontakte k on k.id = r.kontakt_id
           where r.rolle = 'netzbetreiber' and r.geloescht_am is null and k.geloescht_am is null
             and (r.angaben ->> 'elcom_id' = t.elcom_id or lower(intern.kontaktname(k)) = lower(t.netzbetreiber))
           limit 1)
    from treffer t
   order by t.netzbetreiber
$$;
revoke execute on function public.netzbetreiber_fuer(text, text) from public, anon;
grant execute on function public.netzbetreiber_fuer(text, text) to authenticated, service_role;

-- Neues Gebäude ohne Netzbetreiber: Vorschlag aus dem Verzeichnis (nur wenn genau einer passt, sonst bleibt es leer
-- und die Akte zeigt die Auswahl). Von Hand Eingetragenes bleibt immer.
create or replace function intern.objekt_netzbetreiber() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  namen text[];
begin
  if nullif(trim(coalesce(new.netzbetreiber, '')), '') is not null or new.plz is null then return new; end if;
  select array_agg(distinct coalesce(k.firma, n.netzbetreiber)) into namen
    from public.netzbetreiber_fuer(new.plz, new.gemeinde) n
    left join public.kontakte k on k.id = n.kontakt_id;
  if coalesce(array_length(namen, 1), 0) = 1 then new.netzbetreiber := namen[1]; end if;
  return new;
end
$$;
create trigger netzbetreiber_vorschlagen before insert or update of plz, gemeinde on public.objekte
  for each row execute function intern.objekt_netzbetreiber();

/** ElCom-Verzeichnis ersetzen (nur Server). p_zeilen: [{bfs_nr, gemeinde, elcom_id, netzbetreiber}]. */
create or replace function public.netzbetreiber_verzeichnis_speichern(p_zeilen jsonb, p_jahr int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if jsonb_typeof(p_zeilen) <> 'array' or jsonb_array_length(p_zeilen) = 0 then raise exception 'adressbuch.elcom_leer'; end if;
  delete from public.netzbetreiber_gemeinden where true;
  insert into public.netzbetreiber_gemeinden (bfs_nr, gemeinde, elcom_id, netzbetreiber, jahr)
  select distinct on ((z ->> 'bfs_nr')::int, z ->> 'elcom_id')
         (z ->> 'bfs_nr')::int, trim(z ->> 'gemeinde'), z ->> 'elcom_id', trim(z ->> 'netzbetreiber'), p_jahr
    from jsonb_array_elements(p_zeilen) z
   where (z ->> 'bfs_nr') ~ '^\d+$' and nullif(z ->> 'elcom_id', '') is not null and nullif(trim(z ->> 'netzbetreiber'), '') is not null;
  get diagnostics n = row_count;
  return n;
end
$$;

/** PLZ, für die noch keine Gemeinde bekannt ist (mit Mittelpunkt), für den nächsten Schritt des Einlesens. */
create or replace function public.plz_gemeinden_offen(p_limit int default 150)
returns table (plz text, breite double precision, laenge double precision)
language sql stable security definer set search_path = '' as $$
  select v.plz, v.breite, v.laenge from public.plz_verzeichnis v
   where not exists (select 1 from public.plz_gemeinden g where g.plz = v.plz)
   order by v.plz limit greatest(1, least(p_limit, 500))
$$;

/** Gemeinde je PLZ speichern (nur Server). p_zeilen: [{plz, bfs_nr, gemeinde}]. */
create or replace function public.plz_gemeinden_speichern(p_zeilen jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into public.plz_gemeinden (plz, bfs_nr, gemeinde)
  select z ->> 'plz', nullif(z ->> 'bfs_nr', '')::int, nullif(trim(z ->> 'gemeinde'), '')
    from jsonb_array_elements(p_zeilen) z
   where exists (select 1 from public.plz_verzeichnis v where v.plz = z ->> 'plz')
  on conflict (plz) do update set bfs_nr = excluded.bfs_nr, gemeinde = excluded.gemeinde, eingelesen_am = now();
  get diagnostics n = row_count;
  return n;
end
$$;

/**
 * Nach dem Einlesen: Netzbetreiber, die unsere Gebäude versorgen, als Partner ins Adressbuch (einmal, mit ElCom-Nummer)
 * und Gebäude ohne Netzbetreiber ergänzen. Gibt {neu, gebaeude} zurück.
 */
create or replace function public.netzbetreiber_zuordnen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_kontakt uuid;
  v_neu int := 0;
  v_geb int := 0;
begin
  for r in
    select distinct n.elcom_id, n.netzbetreiber
      from public.objekte o
      cross join lateral public.netzbetreiber_fuer(o.plz, o.gemeinde) n
     where o.geloescht_am is null and o.plz is not null and n.kontakt_id is null
  loop
    -- Gibt es die Firma schon (gleicher Name), bekommt sie nur die Rolle.
    select k.id into v_kontakt from public.kontakte k
     where k.geloescht_am is null and lower(intern.kontaktname(k)) = lower(r.netzbetreiber) limit 1;
    if v_kontakt is null then
      insert into public.kontakte (art, kontaktart, firma, sprache, notiz)
      values ('firma', 'firma', r.netzbetreiber, 'de', 'Aus dem ElCom-Verzeichnis übernommen')
      returning id into v_kontakt;
      v_neu := v_neu + 1;
    end if;
    insert into public.kontakt_rollen (kontakt_id, rolle, angaben)
    values (v_kontakt, 'netzbetreiber', jsonb_build_object('elcom_id', r.elcom_id))
    on conflict (kontakt_id, rolle) where geloescht_am is null
    do update set angaben = public.kontakt_rollen.angaben || jsonb_build_object('elcom_id', r.elcom_id);
    v_kontakt := null;
  end loop;

  -- Bestehende Gebäude ohne Netzbetreiber: der Trigger schlägt vor, wenn wir die PLZ neu setzen.
  update public.objekte set plz = plz
   where geloescht_am is null and plz is not null and nullif(trim(coalesce(netzbetreiber, '')), '') is null;
  get diagnostics v_geb = row_count;
  return jsonb_build_object('neu', v_neu, 'gebaeude', v_geb);
end
$$;

/** Stand des Verzeichnisses für Einstellungen und Adressbuch. */
create or replace function public.netzbetreiber_stand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'gemeinden', (select count(distinct bfs_nr) from public.netzbetreiber_gemeinden),
    'netzbetreiber', (select count(distinct elcom_id) from public.netzbetreiber_gemeinden),
    'jahr', (select max(jahr) from public.netzbetreiber_gemeinden),
    'eingelesen_am', (select max(eingelesen_am) from public.netzbetreiber_gemeinden),
    'plz_total', (select count(*) from public.plz_verzeichnis),
    'plz_zugeordnet', (select count(*) from public.plz_gemeinden),
    'gebaeude', (select count(*) from public.objekte where geloescht_am is null),
    'gebaeude_ohne', (select count(*) from public.objekte where geloescht_am is null
                         and nullif(trim(coalesce(netzbetreiber, '')), '') is null))
$$;

revoke execute on function public.netzbetreiber_verzeichnis_speichern(jsonb, int) from public, anon, authenticated;
revoke execute on function public.plz_gemeinden_offen(int) from public, anon, authenticated;
revoke execute on function public.plz_gemeinden_speichern(jsonb) from public, anon, authenticated;
revoke execute on function public.netzbetreiber_zuordnen() from public, anon, authenticated;
grant execute on function public.netzbetreiber_verzeichnis_speichern(jsonb, int) to service_role;
grant execute on function public.plz_gemeinden_offen(int) to service_role;
grant execute on function public.plz_gemeinden_speichern(jsonb) to service_role;
grant execute on function public.netzbetreiber_zuordnen() to service_role;
revoke execute on function public.netzbetreiber_stand() from public, anon;
grant execute on function public.netzbetreiber_stand() to authenticated, service_role;
revoke execute on function intern.objekt_netzbetreiber() from public, anon, authenticated;
revoke execute on function intern.partnerrolle_verbinden() from public, anon, authenticated;

-- 2. Liste: eine Zeile pro Geschäftspartner -------------------------------------------------------------------
-- Partner = mindestens eine aktive Rolle. Kunden zeigt die App nur mit «auch Kunden zeigen» (aus kunden_uebersicht).
create or replace view public.adressbuch_uebersicht with (security_invoker = true) as
select k.id, k.kundennummer, k.art, intern.kontaktname(k) as name, k.email, k.telefon, k.sprache, k.geloescht_am,
       k.erstellt_am,
       r.rollen,
       coalesce(a.strasse, o.strasse) as strasse, coalesce(a.plz, o.plz) as plz, coalesce(a.ort, o.ort) as ort,
       a.webseite, a.uid_nr,
       h.person_name as hauptkontakt, h.telefon as hauptkontakt_telefon, h.email as hauptkontakt_email,
       (select count(*) from public.kontakt_zugehoerigkeiten z where z.firma_id = k.id and z.geloescht_am is null)::int
         as anzahl_personen,
       (select max(x.zeitpunkt) from public.aktivitaeten x where x.kontakt_id = k.id) as zuletzt,
       (select min(n.gueltig_bis) from public.partner_nachweise n
         where n.kontakt_id = k.id and n.geloescht_am is null and n.gueltig_bis is not null) as nachweis_bis,
       g.gesuche_offen, g.gesuche_alt, g.gesuche_tage,
       (select count(distinct nz.bfs_nr) from public.netzbetreiber_gemeinden nz
         where nz.elcom_id = r.elcom_id)::int as gemeinden,
       s.auftraege_laufend, s.auftraege, s.bewertung,
       (r.vermittler ->> 'provision_prozent')::numeric as provision_prozent,
       r.lieferant ->> 'kundennummer' as kundennummer_bei,
       r.subunternehmer ->> 'gewerk' as gewerk,
       lower(concat_ws(' ', intern.kontaktname(k), k.email, k.telefon, a.ort, o.ort, a.plz, a.uid_nr, r.suchtext,
             (select string_agg(zs.person_name || ' ' || coalesce(zs.funktion, ''), ' ')
                from public.kontakt_zugehoerigkeiten_sicht zs where zs.firma_id = k.id))) as suchtext,
       intern.telefon_ziffern(k.telefon) as telefon_ziffern
  from public.kontakte k
  join lateral (
    select array_agg(x.rolle order by w.reihenfolge) as rollen,
           max(x.angaben ->> 'elcom_id') as elcom_id,
           (array_agg(x.angaben) filter (where x.rolle = 'vermittler'))[1] as vermittler,
           (array_agg(x.angaben) filter (where x.rolle = 'lieferant'))[1] as lieferant,
           (array_agg(x.angaben) filter (where x.rolle = 'subunternehmer'))[1] as subunternehmer,
           string_agg(concat_ws(' ', w.text_de, w.text_fr, x.angaben ->> 'gewerk', x.angaben ->> 'marken',
                                x.angaben ->> 'kundennummer'), ' ') as suchtext
      from public.kontakt_rollen x
      left join public.auswahlwerte w on w.liste = 'partnerrolle' and w.schluessel = x.rolle
     where x.kontakt_id = k.id and x.geloescht_am is null and x.aktiv
    having count(*) > 0
  ) r on true
  left join public.partner_angaben a on a.kontakt_id = k.id and a.geloescht_am is null
  left join lateral (
    select ob.strasse, ob.plz, ob.ort from public.objekte ob
     where ob.kontakt_id = k.id and ob.geloescht_am is null order by ob.erstellt_am limit 1
  ) o on true
  left join lateral (
    select zs.person_name, zs.telefon, zs.email from public.kontakt_zugehoerigkeiten_sicht zs
     where zs.firma_id = k.id order by zs.hauptkontakt desc, zs.reihenfolge, zs.person_name limit 1
  ) h on true
  left join lateral (
    select count(*)::int as gesuche_offen,
           count(*) filter (where ps.eingereicht_am < current_date - coalesce(
             (select (wert ->> 'gesuch_warnung_tage')::int from public.einstellungen where schluessel = 'adressbuch'), 15))::int
             as gesuche_alt,
           round(avg(current_date - ps.eingereicht_am))::int as gesuche_tage
      from public.projekt_schritte ps
      join public.projekte p on p.id = ps.projekt_id and p.geloescht_am is null
      join public.objekte ob on ob.id = p.objekt_id
     where 'netzbetreiber' = any (r.rollen)
       and ps.schluessel = 'netz' and ps.stand in ('offen', 'teilweise') and ps.eingereicht_am is not null
       and lower(trim(ob.netzbetreiber)) = lower(intern.kontaktname(k))
  ) g on true
  left join lateral (
    select count(*) filter (where sa.status not in ('erledigt', 'abgesagt'))::int as auftraege_laufend,
           count(*)::int as auftraege,
           round(avg((coalesce(sa.bewertung_qualitaet, 0) + coalesce(sa.bewertung_termin, 0) + coalesce(sa.bewertung_preis, 0))::numeric
                     / nullif((sa.bewertung_qualitaet is not null)::int + (sa.bewertung_termin is not null)::int
                              + (sa.bewertung_preis is not null)::int, 0)), 1) as bewertung
      from public.subunternehmer su
      join public.subunternehmer_auftraege sa on sa.subunternehmer_id = su.id
     where su.kontakt_id = k.id and 'subunternehmer' = any (r.rollen)
  ) s on true;

grant select on public.adressbuch_uebersicht to authenticated;

-- 3. Akte eines Partners in einer Abfrage ---------------------------------------------------------------------
-- Mit den Rechten der lesenden Person (security invoker): Bestellungen sieht nur, wer sie sehen darf.
create or replace function public.partner_akte(p_kontakt uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'rollen', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'rolle', r.rolle, 'angaben', r.angaben,
                                                            'aktiv', r.aktiv) order by w.reihenfolge)
                          from public.kontakt_rollen r
                          left join public.auswahlwerte w on w.liste = 'partnerrolle' and w.schluessel = r.rolle
                         where r.kontakt_id = p_kontakt and r.geloescht_am is null), '[]'),
    'angaben', (select to_jsonb(a) - 'alt_daten' from public.partner_angaben a
                 where a.kontakt_id = p_kontakt and a.geloescht_am is null),
    'nachweise', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'art', n.art, 'gueltig_bis', n.gueltig_bis,
                                                               'notiz', n.notiz, 'dokument_id', n.dokument_id,
                                                               'speicher_pfad', d.speicher_pfad,
                                                               'sharepoint_url', d.sharepoint_url, 'datei', d.name)
                                           order by n.gueltig_bis nulls last)
                             from public.partner_nachweise n
                             left join public.dokumente d on d.id = n.dokument_id
                            where n.kontakt_id = p_kontakt and n.geloescht_am is null), '[]'),
    'gesuche', coalesce((select jsonb_agg(jsonb_build_object('projekt_id', p.id, 'nummer', p.nummer,
                                                             'kunde', intern.kontaktname(kk), 'ort', ob.ort,
                                                             'stand', ps.stand, 'eingereicht_am', ps.eingereicht_am,
                                                             'tage', current_date - ps.eingereicht_am)
                                         order by ps.eingereicht_am)
                           from public.projekt_schritte ps
                           join public.projekte p on p.id = ps.projekt_id and p.geloescht_am is null
                           join public.objekte ob on ob.id = p.objekt_id
                           join public.kontakte kk on kk.id = p.kontakt_id
                           join public.kontakte k on k.id = p_kontakt
                          where ps.schluessel = 'netz' and ps.stand in ('offen', 'teilweise')
                            and ps.eingereicht_am is not null
                            and lower(trim(ob.netzbetreiber)) = lower(intern.kontaktname(k))), '[]'),
    'gemeinden', coalesce((select jsonb_agg(distinct n.gemeinde)
                             from public.netzbetreiber_gemeinden n
                             join public.kontakt_rollen r on r.kontakt_id = p_kontakt and r.rolle = 'netzbetreiber'
                                                         and r.geloescht_am is null and r.angaben ->> 'elcom_id' = n.elcom_id), '[]'),
    'projekte', (select count(distinct p.id) from public.projekte p
                   join public.objekte ob on ob.id = p.objekt_id
                   join public.kontakte k on k.id = p_kontakt
                  where p.geloescht_am is null
                    and (lower(trim(ob.netzbetreiber)) = lower(intern.kontaktname(k))
                         or lower(trim(p.elektriker)) = lower(intern.kontaktname(k))
                         or lower(trim(p.architekt)) = lower(intern.kontaktname(k))
                         or exists (select 1 from public.subunternehmer su
                                      join public.subunternehmer_auftraege sa on sa.subunternehmer_id = su.id
                                     where su.kontakt_id = p_kontakt and sa.projekt_id = p.id))),
    'bestellungen', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'nummer', b.nummer, 'status', b.status,
                                                                  'liefertermin', b.liefertermin, 'total_rappen', b.total_rappen,
                                                                  'bestellt_am', b.bestellt_am, 'projekt', p.nummer)
                                              order by b.erstellt_am desc)
                                from public.bestellungen b
                                join public.lieferanten l on l.id = b.lieferant_id and l.kontakt_id = p_kontakt
                                left join public.projekte p on p.id = b.projekt_id
                               where b.geloescht_am is null and b.status not in ('geliefert', 'storniert')), '[]'),
    'einkauf_jahr', (select jsonb_build_object('total_rappen', coalesce(sum(b.total_rappen), 0), 'anzahl', count(*))
                       from public.bestellungen b
                       join public.lieferanten l on l.id = b.lieferant_id and l.kontakt_id = p_kontakt
                      where b.geloescht_am is null and b.status <> 'entwurf'
                        and coalesce(b.bestellt_am, b.erstellt_am::date) >= date_trunc('year', current_date)),
    'auftraege', coalesce((select jsonb_agg(jsonb_build_object('id', sa.id, 'projekt_id', p.id, 'projekt', p.nummer,
                                                               'kunde', intern.kontaktname(kk), 'leistung', sa.leistung,
                                                               'betrag_rappen', sa.betrag_rappen, 'termin_von', sa.termin_von,
                                                               'termin_bis', sa.termin_bis, 'status', sa.status,
                                                               'qualitaet', sa.bewertung_qualitaet,
                                                               'termin', sa.bewertung_termin, 'preis', sa.bewertung_preis)
                                           order by coalesce(sa.termin_von, sa.erstellt_am::date) desc)
                             from public.subunternehmer su
                             join public.subunternehmer_auftraege sa on sa.subunternehmer_id = su.id and sa.geloescht_am is null
                             join public.projekte p on p.id = sa.projekt_id
                             join public.kontakte kk on kk.id = p.kontakt_id
                            where su.kontakt_id = p_kontakt), '[]'),
    'empfehlungen', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'status', e.status, 'neukunde', e.neukunde,
                                                                  'lead_nummer', e.lead_nummer, 'projekt_nummer', e.projekt_nummer,
                                                                  'betrag_rappen', e.gutschrift_rappen,
                                                                  'ausbezahlt_am', e.ausbezahlt_am, 'erstellt_am', e.erstellt_am)
                                              order by e.erstellt_am desc)
                                from public.empfehlungen_liste e where e.empfehler_id = p_kontakt), '[]'),
    'dokumente', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'ordner', d.ordner,
                                                               'speicher_pfad', d.speicher_pfad, 'sharepoint_url', d.sharepoint_url,
                                                               'erstellt_am', d.erstellt_am) order by d.erstellt_am desc)
                             from public.dokumente d
                            where d.bezug_tabelle = 'kontakte' and d.bezug_id = p_kontakt and d.geloescht_am is null), '[]'))
$$;
revoke execute on function public.partner_akte(uuid) from public, anon;
grant execute on function public.partner_akte(uuid) to authenticated;

/** Mögliche Doppelte beim Anlegen eines Partners: gleiche UID, Mail, Telefon oder ähnlicher Firmenname. */
create or replace function public.partner_dubletten(p_name text, p_email text default null, p_telefon text default null,
                                                     p_uid text default null, p_ohne uuid default null)
returns table (id uuid, kundennummer int, name text, ort text, grund text)
language sql stable security invoker set search_path = '' as $$
  with kern as (
    -- Rechtsform und Satzzeichen weglassen, damit «Bur Dachtechnik GmbH» und «Dachtechnik Bur» sich finden.
    select array(select w from unnest(regexp_split_to_array(lower(regexp_replace(coalesce(p_name, ''),
             '\m(ag|gmbh|sa|sàrl|sarl|kg|co|und|et|&)\M|[^[:alnum:]àâäéèêëïîôöùûüç ]', ' ', 'g')), '\s+')) w
           where length(w) >= 3) as woerter
  )
  select k.id, k.kundennummer, intern.kontaktname(k), coalesce(a.ort, o.ort),
         case when nullif(trim(p_uid), '') is not null and a.uid_nr = trim(p_uid) then 'uid'
              when nullif(trim(p_email), '') is not null and lower(k.email) = lower(trim(p_email)) then 'email'
              when length(intern.telefon_ziffern(p_telefon)) >= 9
                   and intern.telefon_ziffern(k.telefon) = intern.telefon_ziffern(p_telefon) then 'telefon'
              else 'name' end
    from public.kontakte k
    cross join kern
    left join public.partner_angaben a on a.kontakt_id = k.id and a.geloescht_am is null
    left join lateral (select ob.ort from public.objekte ob where ob.kontakt_id = k.id and ob.geloescht_am is null
                        order by ob.erstellt_am limit 1) o on true
   where k.geloescht_am is null and (p_ohne is null or k.id <> p_ohne)
     and ((nullif(trim(p_uid), '') is not null and a.uid_nr = trim(p_uid))
       or (nullif(trim(p_email), '') is not null and lower(k.email) = lower(trim(p_email)))
       or (length(intern.telefon_ziffern(p_telefon)) >= 9 and intern.telefon_ziffern(k.telefon) = intern.telefon_ziffern(p_telefon))
       or (cardinality(kern.woerter) > 0
           and (select bool_and(lower(intern.kontaktname(k)) like '%' || w || '%') from unnest(kern.woerter) w)))
   order by k.kundennummer
   limit 5
$$;
revoke execute on function public.partner_dubletten(text, text, text, text, uuid) from public, anon;
grant execute on function public.partner_dubletten(text, text, text, text, uuid) to authenticated;

-- 4. Provision für Vermittler ---------------------------------------------------------------------------------
-- Unterschreibt ein vermittelter Kunde, wird statt der Kunden-Gutschrift die Provision vorgemerkt (% vom
-- Vertragswert exkl. MWST, ohne Dankes-Mail). Läuft vor «empfehlung_vertrag» (Trigger in Namensreihenfolge),
-- danach findet jene Funktion keine offene Empfehlung mehr und tut nichts.
create or replace function intern.provision_bei_vertrag() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  emp public.empfehlungen;
  pct numeric;
  betrag bigint;
begin
  if new.unterzeichnet_am is null or old.unterzeichnet_am is not null or new.verkaufschance_id is null then return new; end if;
  select * into emp from public.empfehlungen where verkaufschance_id = new.verkaufschance_id and status = 'lead'
     and geloescht_am is null;
  if not found then return new; end if;
  select nullif(r.angaben ->> 'provision_prozent', '')::numeric into pct from public.kontakt_rollen r
   where r.kontakt_id = emp.empfehler_id and r.rolle = 'vermittler' and r.aktiv and r.geloescht_am is null;
  if pct is null or pct <= 0 then return new; end if;
  betrag := round(coalesce(new.vertragswert_rappen, 0) / (1 + public.mwst_satz() / 100) * pct / 100);
  update public.empfehlungen set status = 'auftrag', projekt_id = new.id, gutschrift_rappen = betrag,
         gutschrift_am = new.unterzeichnet_am
   where id = emp.id;
  return new;
end
$$;
create trigger empfehlung_a_provision after update of unterzeichnet_am on public.projekte
  for each row execute function intern.provision_bei_vertrag();

-- Schlussrechnung bezahlt → Buchhaltung bekommt die Aufgabe, die Provision auszuzahlen (einmal je Empfehlung).
create or replace function intern.provision_bei_schlusszahlung() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e record;
  v_wer uuid[] := intern.automation_empfaenger('["rolle:buchhaltung", "rolle:admin"]'::jsonb, '{}'::jsonb);
begin
  if new.status <> 'bezahlt' or old.status = 'bezahlt' or new.art <> 'schluss' or new.projekt_id is null then return new; end if;
  for e in
    select em.id, em.gutschrift_rappen, k.*, p.nummer as projekt_nummer
      from public.empfehlungen em
      join public.kontakte k on k.id = em.empfehler_id
      join public.projekte p on p.id = em.projekt_id
     where em.projekt_id = new.projekt_id and em.status = 'auftrag' and em.geloescht_am is null
       and exists (select 1 from public.kontakt_rollen r where r.kontakt_id = em.empfehler_id and r.rolle = 'vermittler'
                    and r.geloescht_am is null)
       and not exists (select 1 from public.aufgaben a where a.bezug_tabelle = 'empfehlungen' and a.bezug_id = em.id
                        and a.titel like 'Provision auszahlen%')
  loop
    insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
    select 'Provision auszahlen: ' || coalesce(nullif(e.firma, ''), concat_ws(' ', e.vorname, e.nachname)) || ', '
             || intern.chf_text(coalesce(e.gutschrift_rappen, 0)) || ' für ' || coalesce(e.projekt_nummer, ''),
           (now() at time zone 'Europe/Zurich')::date + 10, x, 'empfehlungen', e.id
      from unnest(v_wer) x;
  end loop;
  return new;
end
$$;
create trigger provision_auszahlen after update of status on public.rechnungen
  for each row execute function intern.provision_bei_schlusszahlung();
revoke execute on function intern.provision_bei_vertrag() from public, anon, authenticated;
revoke execute on function intern.provision_bei_schlusszahlung() from public, anon, authenticated;

-- 5. Fristen der Nachweise (Zeitplan, stündlich): Aufgabe und Glocke einmal je Nachweis und Datum -------------
create or replace function public.partner_fristen_melden(p_heute date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  heute date := coalesce(p_heute, (now() at time zone 'Europe/Zurich')::date);
  vorlauf int := coalesce((select (wert ->> 'nachweis_vorlauf_tage')::int from public.einstellungen
                            where schluessel = 'adressbuch'), 30);
  v_wer uuid[] := intern.automation_empfaenger('["rolle:admin"]'::jsonb, '{}'::jsonb);
  r record;
  n int := 0;
  k int;
begin
  for r in
    select pn.id, pn.kontakt_id, pn.gueltig_bis, intern.kontaktname(ko) as firma,
           coalesce(w.text_de, pn.art) as art_de, coalesce(w.text_fr, pn.art) as art_fr
      from public.partner_nachweise pn
      join public.kontakte ko on ko.id = pn.kontakt_id and ko.geloescht_am is null
      left join public.auswahlwerte w on w.liste = 'partnernachweis' and w.schluessel = pn.art
     where pn.geloescht_am is null and pn.gueltig_bis is not null and pn.gueltig_bis <= heute + vorlauf
  loop
    insert into intern.fristen_gemeldet (schluessel) values ('nachweis:' || r.id || ':' || r.gueltig_bis)
    on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;
    n := n + 1;
    insert into public.aufgaben (titel, faellig_am, person_id, bezug_tabelle, bezug_id)
    select 'Nachweis erneuern: ' || r.art_de || ' – ' || r.firma, r.gueltig_bis, x, 'kontakte', r.kontakt_id
      from unnest(v_wer) x;
    insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel)
    select x, case when r.gueltig_bis < heute then 'kritisch' else 'warnung' end,
           'Nachweis: ' || r.art_de || ' – ' || r.firma, 'Attestation : ' || r.art_fr || ' – ' || r.firma,
           'Gültig bis ' || to_char(r.gueltig_bis, 'DD.MM.YYYY'), 'Valable jusqu’au ' || to_char(r.gueltig_bis, 'DD.MM.YYYY'),
           '/contacts?kontakt=' || r.kontakt_id
      from unnest(v_wer) x;
  end loop;
  return n;
end
$$;
revoke execute on function public.partner_fristen_melden(date) from public, anon, authenticated;
grant execute on function public.partner_fristen_melden(date) to service_role;
