-- Posteingang: wer welche Mail bearbeitet (Chris 1.11.2026, Fragen 19 und 20).
-- «Jeder bearbeitet seine eigenen Mails»: was im persönlichen Postfach liegt, gehört der Person selbst, auch wenn der
-- Kunde, Lead oder das Projekt jemand anderem gehört. Mails aus Team-Postfächern (info@) verteilen Davis oder Chris;
-- keine automatische Zuteilung nach Sprache. Glocke bei doppelter Frist: Chris und Loris.
-- Ersetzt die Zuteilung aus 20261110000300 (Betreuer der Akte, Liste je Art/Sprache, Verkauf nach Sprache).

update public.einstellungen
   set wert = wert || '{"verteilen": ["davis", "chris"], "eskalation": ["chris", "loris"]}'::jsonb
 where schluessel = 'posteingang';

/** Wer Mails aus Team-Postfächern verteilt: Kürzel aus der Einstellung «verteilen», nur aktive Personen. */
create or replace function intern.pe_verteiler(p_cfg jsonb) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(intern.pe_person(x) order by n) filter (where intern.pe_person(x) is not null), '{}')
    from jsonb_array_elements_text(coalesce(p_cfg -> 'verteilen', '[]')) with ordinality as v(x, n)
$$;

/**
 * Wer ist zuständig? Persönliches Postfach: die Person selbst. Team-Postfach: wer verteilt (die erste, die nicht
 * abwesend ist, sonst die erste), sonst die alte Liste «zustaendig» der Einstellung. Ohne Treffer niemand; dann geht
 * die Glocke bei doppelter Frist an die Leitung.
 */
create or replace function intern.pe_zustaendig(r public.posteingang, p_cfg jsonb) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  sprache text := case when r.sprache = 'fr' then 'fr' else 'de' end;
  verteiler uuid[] := intern.pe_verteiler(p_cfg);
begin
  if r.postfach_person_id is not null then
    return r.postfach_person_id;
  end if;
  return coalesce(
    (select x from unnest(verteiler) with ordinality as v(x, n) where not intern.abwesend(x) order by n limit 1),
    verteiler[1],
    intern.pe_person(p_cfg -> 'zustaendig' -> coalesce(r.art, 'sonstiges') ->> sprache),
    intern.pe_person(p_cfg -> 'zustaendig' -> 'standard' ->> sprache));
end
$$;

/** Einordnen wie bisher; neu: Anfragen und Störungen aus Team-Postfächern melden sich bei allen, die verteilen. */
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
    perform intern.pe_glocke(
      case when r.postfach_person_id is null and cardinality(intern.pe_verteiler(cfg)) > 0
           then intern.pe_verteiler(cfg) || r.zustaendig_id else array[r.zustaendig_id] end,
      case when r.art = 'stoerung' then 'warnung' else 'info' end,
      case when r.art = 'stoerung' then 'Störung gemeldet' else 'Neue Anfrage per Mail' end,
      case when r.art = 'stoerung' then 'Panne signalée' else 'Nouvelle demande par e-mail' end, r);
  end if;
end
$$;
