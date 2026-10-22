-- Phase 9, Teil 1: Projekt-Fahrplan (V108) aus den Ablauf-Vorlagen je Produkt.
-- Ein Schritt ist entweder von Hand gesetzt (projekt_schritte) oder ergibt sich aus anderen Daten
-- (Vertrag, Einsätze, Baustellen-Status, Zahlungsplan, Material). Bewilligungen (V48) und die Checkliste
-- Elektriker sind keine eigenen Listen mehr, sondern markierte Schritte im selben Fahrplan: eine Quelle,
-- kein Abgleich zwischen drei Formularen wie in der Vorlage.

alter table public.ablauf_schritte
  add column if not exists bewilligung boolean not null default false,
  add column if not exists elektriker boolean not null default false,
  add column if not exists auto text check (auto in ('vertrag', 'anzahlung', 'termin', 'montage', 'ibn', 'schluss', 'material', 'elektro')),
  add column if not exists hinweis_de text,
  add column if not exists hinweis_fr text,
  add column if not exists frist_nach text;
comment on column public.ablauf_schritte.bewilligung is 'Erscheint im Reiter Bewilligungen (Datum und Frist je Projekt).';
comment on column public.ablauf_schritte.elektriker is 'Gehört zur Checkliste Elektriker (DRT, IA, Schema, IAT, RS/PM F., RS/PM R., Beglaubigung).';
comment on column public.ablauf_schritte.auto is 'Woraus sich der Stand ergibt; vertrag, termin, montage und ibn lassen sich nicht von Hand setzen.';
comment on column public.ablauf_schritte.frist_nach is 'Frist = Erledigt-Datum dieses Schritts + frist_tage (z. B. Pronovo 30 Tage nach der Abnahme).';

alter table public.projekt_schritte add column if not exists eingereicht_am date;
comment on column public.projekt_schritte.eingereicht_am is 'Datum, an dem der Schritt auf «in Arbeit» bzw. «eingereicht» gesetzt wurde.';

alter table public.projekte add column if not exists bau_vorher jsonb;
comment on column public.projekte.bau_vorher is 'Stand vor der letzten Übernahme in den Bau oder Rücknahme, für «Rückgängig» (V127, V134).';

-- Inbetriebnahme fehlte in den Vorlagen (V233 «ibnS»): nach dem letzten Montage-Schritt einfügen.
insert into public.ablauf_schritte (ablauf_vorlage_id, phase, schluessel, name_de, name_fr, reihenfolge, pflicht)
select v.id, 'ibn', 'ibn', 'Inbetriebnahme (IBN)', 'Mise en service',
       coalesce((select max(s.reihenfolge) from public.ablauf_schritte s where s.ablauf_vorlage_id = v.id and s.phase = 'montage'), 100) + 5,
       true
  from public.ablauf_vorlagen v
 where not exists (select 1 from public.ablauf_schritte s where s.ablauf_vorlage_id = v.id and s.schluessel = 'ibn');

update public.ablauf_schritte set bewilligung = schluessel in ('gemeinde', 'netz', 'ia', 'sina', 'abnahme', 'pronovo'),
       elektriker = schluessel in ('netz', 'ia', 'schema', 'iat', 'sina', 'kontrolle', 'cert'),
       auto = case when schluessel in ('vertrag', 'anzahlung', 'termin', 'montage', 'ibn', 'schluss', 'material', 'elektro')
                   then schluessel end;
update public.ablauf_schritte set frist_nach = 'abnahme', frist_tage = 30 where schluessel = 'pronovo';

update public.ablauf_schritte s set hinweis_de = h.de, hinweis_fr = h.fr
  from (values
    ('anzahlung', 'Aus dem Zahlungsplan, sonst hier abhaken.', 'Selon le plan de paiement, sinon cocher ici.'),
    ('gemeinde', 'Dachanlagen meist nur meldepflichtig (Art. 18a RPG). Baugesuch bei Schutzobjekt, Kernzone oder speziellen Fassaden- und Freiflächenanlagen.',
                 'Installations sur toit en général soumises à simple annonce (art. 18a LAT). Permis pour objet protégé, zone centre ou installations spéciales.'),
    ('netz', 'Beim Netzbetreiber einreichen und Zusage abwarten, bevor gebaut wird.', 'À déposer auprès du gestionnaire de réseau; attendre l’accord avant les travaux.'),
    ('foerd', 'Viele Kantone und Gemeinden verlangen das Gesuch vor Baubeginn. Nicht überall vorhanden: dann «nicht nötig».',
              'Beaucoup de cantons et communes exigent la demande avant le début des travaux. Sinon «pas nécessaire».'),
    ('ia', 'Durch den Elektriker an den Netzbetreiber, vor Beginn der Elektroinstallation.', 'Par l’électricien au gestionnaire de réseau, avant l’installation électrique.'),
    ('material', 'In Arbeit = bestellt, erledigt = an Lager.', 'En cours = commandé, terminé = en stock.'),
    ('geruest', 'SUVA: Absturzsicherung ab 3 m Absturzhöhe.', 'SUVA : protection contre les chutes dès 3 m.'),
    ('iat', 'Aus der Checkliste Elektriker.', 'Selon la check-list électricien.'),
    ('sina', 'Erstprüfung durch den Elektriker: SiNa und Mess- und Prüfprotokoll an Netzbetreiber und Kunde.',
             'Contrôle initial par l’électricien : RS et procès-verbal de mesure au GRD et au client.'),
    ('kontrolle', 'Durch ein unabhängiges, akkreditiertes Kontrollorgan.', 'Par un organe de contrôle indépendant et accrédité.'),
    ('cert', 'Anlagenbeglaubigung und Registrierung im Herkunftsnachweis-System.', 'Certification et enregistrement dans le système des garanties d’origine.'),
    ('pronovo', 'Interne Frist: 30 Tage nach der Abnahme.', 'Délai interne : 30 jours après la réception.'),
    ('schluss', 'Aus dem Zahlungsplan, sonst hier abhaken.', 'Selon le plan de paiement, sinon cocher ici.')
  ) h(schluessel, de, fr)
 where s.schluessel = h.schluessel;

/** Stand eines Feldes der alten Checkliste Elektriker («1», «ok», «ras» …) oder null, wenn leer. */
-- Ohne «set search_path», damit Postgres die Funktion in die Sicht einbettet (sonst ein Aufruf pro Zeile).
create or replace function intern.checkliste_stand(p_wert text) returns text
language sql immutable as $$
  select case
    when lower(trim(coalesce(p_wert, ''))) in ('1', 'ok', 'ja', 'oui', 'true', 'x') then 'erledigt'
    when lower(trim(coalesce(p_wert, ''))) in ('ras', 'non', 'nv', 'nein') then 'nicht_noetig'
  end
$$;

/** Zwei Felder zusammen (RS und PM): beide erledigt oder nicht nötig = erledigt, eines erledigt = teilweise. */
create or replace function intern.checkliste_paar(p_a text, p_b text) returns text
language sql immutable as $$
  select case
    when intern.checkliste_stand(p_a) = 'nicht_noetig' and intern.checkliste_stand(p_b) = 'nicht_noetig' then 'nicht_noetig'
    when intern.checkliste_stand(p_a) is not null and intern.checkliste_stand(p_b) is not null then 'erledigt'
    when 'erledigt' in (intern.checkliste_stand(p_a), intern.checkliste_stand(p_b)) then 'teilweise'
  end
$$;

/**
 * Fahrplan aller Projekte: ein Zeile pro Projekt und Schritt seiner Ablauf-Vorlage mit dem wirksamen Stand,
 * der Frist und ob sie überfällig ist. Rechte wie die Tabellen darunter (security_invoker).
 */
create or replace view public.projekt_fahrplan with (security_invoker = true) as
with projekt as (
  select p.id as projekt_id, p.status, p.bau_status, p.material_status, p.unterzeichnet_am, p.checkliste, p.ablauf_vorlage_id,
         e.fest_von, e.fest_bis, coalesce(e.anzahl, 0) as einsaetze,
         coalesce(z.anzahl, 0) as tranchen, z.erste_bezahlt, z.bezahlt,
         exists (select 1 from public.anlagen a where a.projekt_id = p.id and a.ibn_am is not null and a.geloescht_am is null) as anlage_ibn
    from public.projekte p
    left join lateral (
      select min(x.von) filter (where x.art <> 'geplant') as fest_von, max(x.bis) filter (where x.art <> 'geplant') as fest_bis,
             count(*) as anzahl
        from public.einsaetze x where x.projekt_id = p.id and x.geloescht_am is null
    ) e on true
    left join lateral (
      select count(*) as anzahl, count(*) filter (where y.bezahlt_am is not null) as bezahlt,
             (array_agg(y.bezahlt_am is not null order by y.faellig_am nulls last, y.erstellt_am))[1] as erste_bezahlt
        from public.zahlungsplan y where y.projekt_id = p.id and y.geloescht_am is null
    ) z on true
   where p.geloescht_am is null
), basis as (
  select p.*,
         s.id as ablauf_schritt_id, s.phase, s.schluessel, s.name_de, s.name_fr, s.reihenfolge, s.pflicht,
         s.bewilligung, s.elektriker, s.auto, s.hinweis_de, s.hinweis_fr, s.frist_nach, s.frist_tage,
         ps.stand as gespeichert, ps.frist as eigene_frist, ps.eingereicht_am, ps.erledigt_am, ps.notiz,
         r.erledigt_am as bezug_erledigt_am
    from projekt p
    join public.ablauf_schritte s on s.ablauf_vorlage_id = p.ablauf_vorlage_id and s.geloescht_am is null
    left join public.projekt_schritte ps on ps.projekt_id = p.projekt_id and ps.schluessel = s.schluessel and ps.geloescht_am is null
    left join public.projekt_schritte r on r.projekt_id = p.projekt_id and r.schluessel = s.frist_nach and r.stand = 'erledigt'
                                       and r.geloescht_am is null
), stand as (
  select b.*,
    case b.auto
      when 'vertrag' then case when b.unterzeichnet_am is not null or b.status in ('auftrag', 'im_bau', 'abgeschlossen') then 'erledigt' else 'offen' end
      when 'anzahlung' then case when b.tranchen > 0 then case when b.erste_bezahlt then 'erledigt' else 'offen' end
                                 else coalesce(b.gespeichert, 'offen') end
      when 'schluss' then case when b.tranchen > 1 then case when b.bezahlt = b.tranchen then 'erledigt' when b.bezahlt > 0 then 'teilweise' else 'offen' end
                               else coalesce(b.gespeichert, 'offen') end
      when 'termin' then case when b.status = 'abgeschlossen' or b.bau_status in ('terminiert', 'ibn', 'fertig') or b.fest_von is not null then 'erledigt'
                              when b.einsaetze > 0 then 'teilweise' else 'offen' end
      when 'montage' then case when b.status = 'abgeschlossen' or b.bau_status in ('ibn', 'fertig') then 'erledigt'
                               when b.fest_von is null then 'offen'
                               when b.fest_bis < current_date then 'erledigt'
                               when b.fest_von <= current_date then 'teilweise' else 'offen' end
      when 'ibn' then case when b.status = 'abgeschlossen' or b.bau_status = 'fertig' or b.anlage_ibn then 'erledigt'
                           when b.bau_status = 'ibn' then 'teilweise' else 'offen' end
      when 'material' then case b.material_status when 'lager' then 'erledigt' when 'bestellt' then 'teilweise'
                                else coalesce(b.gespeichert, 'offen') end
      when 'elektro' then coalesce(b.gespeichert, case when b.status = 'abgeschlossen' or b.bau_status in ('ibn', 'fertig') then 'erledigt' else 'offen' end)
      else coalesce(b.gespeichert,
        case b.schluessel
          when 'netz' then intern.checkliste_stand(b.checkliste ->> 'drt')
          when 'ia' then intern.checkliste_stand(b.checkliste ->> 'ai')
          when 'schema' then intern.checkliste_stand(b.checkliste ->> 'schema')
          when 'iat' then intern.checkliste_stand(b.checkliste ->> 'iat')
          when 'sina' then intern.checkliste_paar(b.checkliste ->> 'rsF', b.checkliste ->> 'pmF')
          when 'kontrolle' then intern.checkliste_paar(b.checkliste ->> 'rsR', b.checkliste ->> 'pmR')
          when 'cert' then intern.checkliste_stand(b.checkliste ->> 'certification')
        end, 'offen')
    end as stand,
    coalesce(b.auto in ('vertrag', 'termin', 'montage', 'ibn') or (b.auto in ('anzahlung', 'schluss') and b.tranchen > 0), false)
      as automatisch
  from basis b
), frist as (
  select s.*, coalesce(s.eigene_frist, s.bezug_erledigt_am + coalesce(s.frist_tage, 0)) as frist
  from stand s
)
select f.projekt_id, f.ablauf_schritt_id, f.phase, f.schluessel, f.name_de, f.name_fr, f.reihenfolge, f.pflicht,
       f.bewilligung, f.elektriker, f.auto, f.automatisch, f.hinweis_de, f.hinweis_fr,
       f.stand, f.gespeichert, f.frist, f.eigene_frist, f.eingereicht_am, f.erledigt_am, f.notiz,
       f.stand not in ('erledigt', 'nicht_noetig') and f.frist < current_date as ueberfaellig,
       f.stand not in ('erledigt', 'nicht_noetig') and f.frist between current_date and current_date + 7 as bald
  from frist f;

grant select on public.projekt_fahrplan to authenticated;

/**
 * Zusammenfassung je Projekt für Karten und Listen: erledigte Schritte, die sechs Phasen als Balken
 * und der nächste offene Schritt.
 */
create or replace view public.projekt_stand with (security_invoker = true) as
with f as materialized (
  select * from public.projekt_fahrplan
), phasen as (
  select x.projekt_id, jsonb_agg(jsonb_build_object('phase', x.phase, 'gesamt', x.gesamt, 'erledigt', x.erledigt,
                                                    'teilweise', x.teilweise, 'spaet', x.spaet) order by x.ab) as phasen
    from (select projekt_id, phase, min(reihenfolge) as ab, count(*) as gesamt,
                 count(*) filter (where stand in ('erledigt', 'nicht_noetig')) as erledigt,
                 bool_or(stand = 'teilweise') as teilweise, bool_or(ueberfaellig) as spaet
            from f group by projekt_id, phase) x
   group by x.projekt_id
), naechster as (
  select distinct on (projekt_id) projekt_id,
         jsonb_build_object('schluessel', schluessel, 'phase', phase, 'name_de', name_de, 'name_fr', name_fr,
                            'ueberfaellig', ueberfaellig, 'frist', frist) as naechster
    from f where stand not in ('erledigt', 'nicht_noetig')
   order by projekt_id, reihenfolge
)
select f.projekt_id,
       count(*) filter (where f.stand in ('erledigt', 'nicht_noetig')) as erledigt,
       count(*) as gesamt,
       coalesce(bool_or(f.ueberfaellig), false) as spaet,
       count(*) filter (where f.bewilligung and f.stand not in ('erledigt', 'nicht_noetig')) as bewilligungen_offen,
       count(*) filter (where f.bewilligung and f.ueberfaellig) as bewilligungen_spaet,
       count(*) filter (where f.elektriker and f.stand in ('erledigt', 'nicht_noetig')) as checkliste_erledigt,
       count(*) filter (where f.elektriker) as checkliste_gesamt,
       ph.phasen, n.naechster
  from f
  left join phasen ph on ph.projekt_id = f.projekt_id
  left join naechster n on n.projekt_id = f.projekt_id
 group by f.projekt_id, ph.phasen, n.naechster;

grant select on public.projekt_stand to authenticated;

/**
 * Einen Schritt im Fahrplan setzen: Stand, Datum, Frist oder Notiz (p: stand, datum, frist, notiz).
 * Schritte, die sich aus Vertrag, Einsätzen oder Zahlungen ergeben, lassen sich nicht von Hand setzen.
 * «Material» schreibt den Material-Stand des Projekts mit (bestellt / an Lager).
 */
create or replace function public.projekt_schritt_setzen(p_projekt uuid, p_schluessel text, p jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  f public.projekt_fahrplan;
  v_stand text := nullif(p ->> 'stand', '');
  v_datum date := nullif(p ->> 'datum', '')::date;
begin
  select * into f from public.projekt_fahrplan where projekt_id = p_projekt and schluessel = p_schluessel;
  if not found then raise exception using errcode = 'P0001', message = 'projekt.schritt_unbekannt'; end if;
  if v_stand is not null and f.automatisch then
    raise exception using errcode = 'P0001', message = 'projekt.schritt_automatisch';
  end if;
  if v_stand is not null and v_stand not in ('offen', 'teilweise', 'erledigt', 'nicht_noetig') then
    raise exception using errcode = 'P0001', message = 'projekt.stand_ungueltig';
  end if;
  v_stand := coalesce(v_stand, f.gespeichert, f.stand);

  insert into public.projekt_schritte as ps (projekt_id, ablauf_schritt_id, schluessel, stand, frist, notiz, eingereicht_am, erledigt_am)
  values (p_projekt, f.ablauf_schritt_id, p_schluessel, v_stand,
          case when p ? 'frist' then nullif(p ->> 'frist', '')::date else f.eigene_frist end,
          case when p ? 'notiz' then nullif(trim(p ->> 'notiz'), '') else f.notiz end,
          case when v_stand = 'teilweise' then coalesce(v_datum, current_date) end,
          case when v_stand = 'erledigt' then coalesce(v_datum, current_date) end)
  on conflict (projekt_id, schluessel) do update set
    stand = excluded.stand,
    frist = excluded.frist,
    notiz = excluded.notiz,
    geloescht_am = null,
    eingereicht_am = case when excluded.stand = 'teilweise' then coalesce(v_datum, ps.eingereicht_am, current_date)
                          when excluded.stand = 'offen' then null else ps.eingereicht_am end,
    erledigt_am = case when excluded.stand = 'erledigt' then coalesce(v_datum, case when ps.stand = 'erledigt' then ps.erledigt_am end, current_date) end;

  if p_schluessel = 'material' and p ? 'stand' then
    update public.projekte set material_status = case v_stand when 'erledigt' then 'lager' when 'teilweise' then 'bestellt' end
     where id = p_projekt;
  end if;
end
$$;

revoke execute on function public.projekt_schritt_setzen(uuid, text, jsonb) from public, anon;
grant execute on function public.projekt_schritt_setzen(uuid, text, jsonb) to authenticated;
