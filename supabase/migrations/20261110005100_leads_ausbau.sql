-- Anfragen & Leads neu (02.11.2026, Entscheid 0039): Erstkontakt messen und nachhaken, Herkunft und Dachdaten am
-- Lead, Website-Formular direkt ins CRM, Nachfassen an Tag 3, 10 und 21. Entscheide von Chris (2.11.2026):
-- Erinnerung an den Verkäufer nach 15 Minuten, Meldung an Chris nach 2 Stunden (in der Arbeitszeit); Richtofferte
-- nur intern; Nachfass-Mails als Entwurf mit Freigabe. Alle Werte stehen in einstellungen.verkauf (Regel 8).

insert into public.einstellungen (schluessel, wert) values ('verkauf', $j${
  "aktiv_seit": null,
  "erstkontakt_minuten": 15,
  "eskalation_minuten": 120,
  "eskalation_an": ["chris"],
  "arbeitszeit": {"tage": [1, 2, 3, 4, 5], "von": "07:30", "bis": "18:00"},
  "feiertage": [],
  "nachfassen_tage": [3, 10, 21],
  "verlust_wiedervorlage_monate": 12,
  "richtpreis": {
    "pv_stufen": [
      {"bis_kwp": 10, "chf_pro_kwp": 2300},
      {"bis_kwp": 20, "chf_pro_kwp": 1950},
      {"bis_kwp": 50, "chf_pro_kwp": 1650},
      {"bis_kwp": null, "chf_pro_kwp": 1400}
    ],
    "kwp_pro_m2": 0.2,
    "max_kwp_ohne_besuch": 30,
    "batterie_chf": 8400,
    "wallbox_chf": 2300,
    "waermepumpe_chf": 32000,
    "foerderung_chf_pro_kwp": 360,
    "spanne_prozent": 15
  }
}$j$::jsonb)
on conflict (schluessel) do nothing;

-- Nur Neues löst Erinnerungen aus (wie bei den Automationen): ab dem Einspielen dieser Migration.
update public.einstellungen set wert = jsonb_set(wert, '{aktiv_seit}', to_jsonb(now()))
 where schluessel = 'verkauf' and wert ->> 'aktiv_seit' is null;

alter table public.verkaufschancen
  add column if not exists erstkontakt_am timestamptz,
  add column if not exists erinnert_am    timestamptz,
  add column if not exists eskaliert_am   timestamptz,
  add column if not exists herkunft       jsonb not null default '{}';

comment on column public.verkaufschancen.erstkontakt_am is 'Erster Anruf, Mail, SMS oder Besuch an den Kunden (setzt der Trigger erstkontakt).';
comment on column public.verkaufschancen.herkunft is 'Woher der Lead kam: Seite, Formular, Kampagne (utm_*), Kontaktwunsch, Zeitfenster.';

-- Erster Kontakt: jede Aktivität an den Kunden (nicht Notiz, nicht Systemeintrag) setzt ihn einmal.
create or replace function intern.lead_erstkontakt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.verkaufschance_id is not null and new.geloescht_am is null
     and new.art in ('anruf', 'mail', 'sms', 'besuch', 'brief') and coalesce(new.richtung, 'aus') = 'aus' then
    update public.verkaufschancen set erstkontakt_am = new.zeitpunkt
     where id = new.verkaufschance_id and (erstkontakt_am is null or erstkontakt_am > new.zeitpunkt);
  end if;
  return new;
end
$$;
drop trigger if exists erstkontakt on public.aktivitaeten;
create trigger erstkontakt after insert on public.aktivitaeten
  for each row execute function intern.lead_erstkontakt();

update public.verkaufschancen v
   set erstkontakt_am = x.am
  from (select a.verkaufschance_id, min(a.zeitpunkt) as am from public.aktivitaeten a
         where a.verkaufschance_id is not null and a.geloescht_am is null
           and a.art in ('anruf', 'mail', 'sms', 'besuch', 'brief') and coalesce(a.richtung, 'aus') = 'aus'
         group by 1) x
 where x.verkaufschance_id = v.id and v.erstkontakt_am is null;

/**
 * Zeitplan (alle 5 Minuten): neue Leads ohne Erstkontakt. Nach `erstkontakt_minuten` Arbeitszeit eine Glocke an
 * den Verkäufer (tour_person_id), nach `eskalation_minuten` eine an die Personen in `eskalation_an`. Je Lead einmal.
 */
create or replace function public.leads_erstkontakt_melden() returns int
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select wert from public.einstellungen where schluessel = 'verkauf'), '{}');
  ab timestamptz := coalesce((cfg ->> 'aktiv_seit')::timestamptz, now());
  m_erinnern int := coalesce((cfg ->> 'erstkontakt_minuten')::int, 15);
  m_eskalieren int := coalesce((cfg ->> 'eskalation_minuten')::int, 120);
  r record;
  min int;
  n int := 0;
  chefs uuid[];
begin
  select coalesce(array_agg(distinct x), '{}') into chefs
    from (select intern.pe_person(k) as x from jsonb_array_elements_text(coalesce(cfg -> 'eskalation_an', '[]')) k) e
   where x is not null;

  for r in
    select v.id, v.nummer, v.tour_person_id, v.erstellt_am, v.erinnert_am, v.eskaliert_am, intern.kontaktname(k) as name,
           coalesce(o.ort, '') as ort
      from public.verkaufschancen v
      join public.kontakte k on k.id = v.kontakt_id
      left join public.objekte o on o.id = v.objekt_id
     where v.geloescht_am is null and v.stufe = 'neu' and v.erstkontakt_am is null
       and v.erstellt_am >= ab and (v.alt_id is null or v.alt_id like 'messe:%')
       and (v.erinnert_am is null or v.eskaliert_am is null)
  loop
    min := intern.pe_arbeitsminuten(r.erstellt_am, now(), cfg);
    if min >= m_erinnern and r.erinnert_am is null then
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
      select p, 'warnung', 'Jetzt anrufen: ' || r.name, 'Appeler maintenant : ' || r.name,
             concat_ws(' · ', nullif(r.ort, ''), 'seit ' || min || ' Min. ohne Kontakt'),
             concat_ws(' · ', nullif(r.ort, ''), 'sans contact depuis ' || min || ' min'),
             '/sales?lead=' || r.id, true
        from unnest(case when r.tour_person_id is not null then array[r.tour_person_id] else chefs end) p;
      update public.verkaufschancen set erinnert_am = now() where id = r.id;
      n := n + 1;
    end if;
    if min >= m_eskalieren and r.eskaliert_am is null then
      insert into public.benachrichtigungen (person_id, art, titel_de, titel_fr, text_de, text_fr, ziel, popup)
      select p, 'kritisch', 'Lead ohne Anruf: ' || r.name, 'Lead sans appel : ' || r.name,
             concat_ws(' · ', r.nummer, nullif(r.ort, ''), 'seit ' || min || ' Min. in der Arbeitszeit'),
             concat_ws(' · ', r.nummer, nullif(r.ort, ''), 'depuis ' || min || ' min (heures ouvrables)'),
             '/sales?lead=' || r.id, true
        from unnest(chefs) p;
      update public.verkaufschancen set eskaliert_am = now() where id = r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end
$$;
revoke execute on function public.leads_erstkontakt_melden() from public, anon, authenticated;
grant execute on function public.leads_erstkontakt_melden() to service_role;

/**
 * Website-Formular (Edge Function «anfrage»): legt den Lead über anfrage_uebernehmen an (Dubletten, Zuteilung,
 * Kennung gegen doppelte Zustellung) und ergänzt Herkunft, Dach und Verbrauch, die das Formular schon kennt.
 * p wie anfrage_uebernehmen plus herkunft {…} und dach {flaeche_m2, ertrag_kwh, egid}, verbrauch_kwh.
 */
create or replace function public.lead_aus_website(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  v_lead uuid;
  v_objekt uuid;
begin
  r := public.anfrage_uebernehmen(p - 'herkunft' - 'dach' - 'verbrauch_kwh');
  v_lead := (r ->> 'verkaufschance_id')::uuid;
  if v_lead is null or r ->> 'ergebnis' = 'schon' then return r; end if;
  update public.verkaufschancen
     set herkunft = herkunft || coalesce(p -> 'herkunft', '{}')
   where id = v_lead
  returning objekt_id into v_objekt;
  if v_objekt is not null and r ->> 'ergebnis' = 'neu' then
    update public.objekte
       set dach = dach || case when coalesce(p -> 'dach', '{}') = '{}' then '{}'
                               else jsonb_build_object('website', p -> 'dach') end,
           verbrauch_kwh = coalesce(verbrauch_kwh, nullif(p ->> 'verbrauch_kwh', '')::int)
     where id = v_objekt;
  end if;
  return r;
end
$$;
revoke execute on function public.lead_aus_website(jsonb) from public, anon, authenticated;
grant execute on function public.lead_aus_website(jsonb) to service_role;

/** Zeitplan: Objekte offener Leads ohne Dachdaten (sonnendach.ch, Gebäuderegister), älteste zuerst. */
create or replace function public.leads_dach_offen(p_limit int default 20)
returns table (id uuid, strasse text, plz text, ort text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.strasse, o.plz, o.ort
    from public.objekte o
   where o.geloescht_am is null and o.strasse is not null and o.plz is not null
     and not (o.dach ? 'sonnendach') and not (o.dach ? 'gesucht_am')
     and exists (select 1 from public.verkaufschancen v
                  where v.objekt_id = o.id and v.geloescht_am is null
                    and v.stufe in ('neu', 'offen', 'warten', 'termin_vereinbart', 'zur_offerte'))
   order by o.erstellt_am desc
   limit p_limit
$$;
revoke execute on function public.leads_dach_offen(int) from public, anon, authenticated;
grant execute on function public.leads_dach_offen(int) to service_role;

/**
 * Dach- und Gebäudedaten eines Lead-Objekts speichern (aus gebaeudeSuchen): unter dach.sonnendach, dazu Heizung und
 * Baujahr. Von Hand Eingetragenes (Fläche, Ausrichtung …) bleibt. Ohne Ergebnis nur «gesucht_am», damit es nicht
 * immer wieder gesucht wird.
 */
create or replace function public.lead_dach_speichern(p_objekt uuid, p jsonb, p_meldung text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.objekte
     set dach = dach || jsonb_build_object('gesucht_am', now(), 'meldung', p_meldung)
                     || case when p ? 'dachflaeche_m2' or p ? 'egid' then jsonb_build_object('sonnendach', p) else '{}' end
   where id = p_objekt;
end
$$;
revoke execute on function public.lead_dach_speichern(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.lead_dach_speichern(uuid, jsonb, text) to service_role;

-- Nachfassen an Tag 3, 10 und 21 nach dem Senden (statt einmal nach 14 Tagen): jeder Schritt prüft, dass die
-- Offerte noch offen ist, die KI schreibt den Entwurf, die Mail wartet im Ausgangskorb auf Freigabe (Chris 5A).
update public.automationen
   set name_de = 'Offerte gesendet: nachfassen an Tag 3, 10 und 21',
       name_fr = 'Offre envoyée : relancer aux jours 3, 10 et 21',
       beschreibung_de = 'Solange die Offerte offen ist, liegt an Tag 3, 10 und 21 nach dem Senden eine Nachfass-Mail in der Sprache des Kunden im Ausgangskorb (die KI schreibt sie im Stil der Firma). Die zuständige Person gibt sie frei und bekommt eine Aufgabe.',
       beschreibung_fr = 'Tant que l’offre est ouverte, un e-mail de relance dans la langue du client est prêt aux jours 3, 10 et 21 après l’envoi (rédigé par l’IA dans le style de l’entreprise). La personne responsable le valide et reçoit une tâche.',
       aktionen = $j$[
  {"art": "warten", "tage": 3},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"], "ki": "nachfassen",
   "betreff": {"de": "Ihre Offerte {Offerte}", "fr": "Votre offre {Offerte}"},
   "text": {"de": "{Anrede}\n\nVor ein paar Tagen haben wir Ihnen unsere Offerte {Offerte} geschickt. Ist alles klar, oder haben Sie Fragen dazu? Ich rufe Sie gerne an.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nIl y a quelques jours, nous vous avons envoyé notre offre {Offerte}. Tout est-il clair ou avez-vous des questions ? Je vous appelle volontiers.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nachfassen 1/3: Offerte {Offerte} ({Name})", "fr": "Relance 1/3 : offre {Offerte} ({Name})"},
   "text": {"de": "Die Mail liegt im Ausgangskorb. Anrufen wirkt oft besser.", "fr": "L’e-mail est dans la boîte d’envoi. Un appel est souvent plus efficace."}},
  {"art": "warten", "tage": 7},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"], "ki": "nachfassen",
   "betreff": {"de": "Ihre Offerte {Offerte}", "fr": "Votre offre {Offerte}"},
   "text": {"de": "{Anrede}\n\nIch wollte nachfragen, ob Sie unsere Offerte {Offerte} schon anschauen konnten. Gerne passen wir etwas an oder besprechen Förderung und Ablauf mit Ihnen.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nJe me permets de vous demander si vous avez pu consulter notre offre {Offerte}. Nous pouvons volontiers l’adapter ou discuter avec vous des subventions et du déroulement.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nachfassen 2/3: Offerte {Offerte} ({Name})", "fr": "Relance 2/3 : offre {Offerte} ({Name})"},
   "text": {"de": "Die Mail liegt im Ausgangskorb. Anrufen wirkt oft besser.", "fr": "L’e-mail est dans la boîte d’envoi. Un appel est souvent plus efficace."}},
  {"art": "warten", "tage": 11},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "in", "wert": ["offeriert", "nachfassen"]}]},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"], "ki": "nachfassen",
   "betreff": {"de": "Ihre Offerte {Offerte}", "fr": "Votre offre {Offerte}"},
   "text": {"de": "{Anrede}\n\nIhre Offerte {Offerte} ist noch offen. Passt der Zeitpunkt gerade nicht, sagen Sie mir einfach, wann ich mich wieder melden darf.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nVotre offre {Offerte} est toujours ouverte. Si le moment ne convient pas, dites-moi simplement quand je peux revenir vers vous.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nachfassen 3/3: Offerte {Offerte} ({Name})", "fr": "Relance 3/3 : offre {Offerte} ({Name})"},
   "text": {"de": "Letzte Erinnerung. Ohne Antwort: Wiedervorlage setzen oder als verloren markieren.", "fr": "Dernier rappel. Sans réponse : fixer un rappel ou marquer comme perdue."}}
]$j$::jsonb
 where vorlage = 'offerte_nachfassen' and geloescht_am is null;

-- Pipeline und «Zu tun» brauchen Eingangszeit, Erstkontakt, Herkunft und Dachdaten (Spalten nur hinten angehängt).
create or replace view public.verkauf_geschaefte with (security_invoker = true) as
with g as (
  select v.id as verkaufschance_id, o.id as offerte_id, p.id as projekt_id
    from public.verkaufschancen v
    left join lateral (
      select x.id from public.offerten x
       where x.verkaufschance_id = v.id and x.geloescht_am is null
       order by coalesce(x.angebot_am, x.erstellt_am::date) desc, x.erstellt_am desc limit 1
    ) o on true
    left join lateral (
      select x.id from public.projekte x
       where x.geloescht_am is null and (x.verkaufschance_id = v.id or x.offerte_id = o.id)
       order by x.erstellt_am desc limit 1
    ) p on true
   where v.geloescht_am is null
  union all
  select null, o.id, p.id
    from public.offerten o
    left join lateral (
      select x.id from public.projekte x where x.offerte_id = o.id and x.geloescht_am is null
       order by x.erstellt_am desc limit 1
    ) p on true
   where o.geloescht_am is null
     and not exists (select 1 from public.verkaufschancen v where v.id = o.verkaufschance_id and v.geloescht_am is null)
  union all
  select null, null, p.id
    from public.projekte p
   where p.geloescht_am is null
     and not exists (select 1 from public.offerten o where o.id = p.offerte_id and o.geloescht_am is null)
     and not exists (select 1 from public.verkaufschancen v where v.id = p.verkaufschance_id and v.geloescht_am is null)
)
select
  coalesce(g.verkaufschance_id, g.offerte_id, g.projekt_id) as id,
  case when g.verkaufschance_id is not null then 'verkaufschancen'
       when g.offerte_id is not null then 'offerten' else 'projekte' end as art,
  g.verkaufschance_id, g.offerte_id, g.projekt_id,
  v.nummer as lead_nummer, o.nummer as offerte_nummer, p.nummer as projekt_nummer,
  k.id as kontakt_id, k.kundennummer, intern.kontaktname(k) as name, k.telefon, k.email, k.sprache, k.werbesperre,
  ob.id as objekt_id, ob.strasse, coalesce(ob.plz, pv.plz) as plz, coalesce(ob.ort, regexp_replace(pv.ort, '\s+\d+$', '')) as ort,
  coalesce(ob.breite, pv.breite) as breite, coalesce(ob.laenge, pv.laenge) as laenge, ob.breite is not null as lage_genau,
  pv.hoehe, pv.kanton,
  st.kuerzel as standort,
  coalesce(v.region_id, ob.region_id) as region_id,
  coalesce(case when g.projekt_id is not null then p.verantwortlich_id end,
           case when g.offerte_id is not null then o.verantwortlich_id end, v.tour_person_id) as person_id,
  v.tour_person_id as termin_person_id,
  v.stufe, v.offerte_status, v.quelle, v.eingang_am, v.termin_am, v.termin_dauer_min,
  v.wiedervorlage_am, v.wiedervorlage_grund, coalesce(o.verlustgrund, v.verlustgrund) as verlustgrund,
  v.erreichbarkeit, v.interesse, v.kommentar_kunde,
  o.status as offerte_stand, o.angebot_am, o.nachfassen_am, o.entscheid, o.vertagt_grund,
  p.status as projekt_status, p.baubeginn,
  coalesce(p.vertragswert_rappen, o.betrag_rappen) as wert_rappen,
  o.leistung_kwp as kwp,
  s.stand, a.reihenfolge as stand_rang, a.eigenschaften ->> 'gruppe' as gruppe,
  coalesce(case when g.projekt_id is not null then coalesce(p.baubeginn, p.unterzeichnet_am, o.angebot_am, p.erstellt_am::date) end,
           case when g.offerte_id is not null then coalesce(o.angebot_am, o.erstellt_am::date) end,
           v.eingang_am, v.erstellt_am::date) as stand_datum,
  (select max(z.zeitpunkt) from public.aktivitaeten z
    where z.geloescht_am is null and z.art <> 'aenderung'
      and (z.verkaufschance_id = g.verkaufschance_id or z.kontakt_id = k.id)) as letzter_kontakt,
  greatest(v.geaendert_am, o.geaendert_am, p.geaendert_am) as geaendert_am,
  lower(concat_ws(' ', intern.kontaktname(k), k.email, ob.strasse, ob.plz, ob.ort, pv.ort, v.nummer, o.nummer, p.nummer,
    'k' || lpad(k.kundennummer::text, 4, '0'))) as suchtext,
  intern.telefon_ziffern(k.telefon) as telefon_ziffern,
  -- ab 02.11.2026
  v.erstellt_am as eingang_zeit,
  v.erstkontakt_am,
  coalesce(v.herkunft, '{}') as herkunft,
  coalesce(ob.dach, '{}') as dach,
  ob.verbrauch_kwh,
  ob.gebaeudeart,
  o.entscheid_am,
  v.alt_id is not null and v.alt_id not like 'messe:%' as uebernommen
from g
left join public.verkaufschancen v on v.id = g.verkaufschance_id
left join public.offerten o on o.id = g.offerte_id
left join public.projekte p on p.id = g.projekt_id
join public.kontakte k on k.id = coalesce(v.kontakt_id, o.kontakt_id, p.kontakt_id) and k.geloescht_am is null
left join public.objekte ob on ob.id = coalesce(p.objekt_id, o.objekt_id, v.objekt_id)
left join lateral intern.ort_aus_verzeichnis(ob.plz, ob.ort) pv on true
left join public.standorte st on st.id = coalesce(p.standort_id, v.standort_id,
  (select x.id from public.standorte x where x.kuerzel = public.standort_fuer_plz(coalesce(ob.plz, pv.plz))))
cross join lateral (select case
  when g.projekt_id is not null then intern.stand_projekt(p, coalesce(o.entscheid = 'angenommen', false))
  when g.offerte_id is not null then intern.stand_offerte(o, coalesce(v.offerte_status = 'pruefung', false))
  else intern.stand_verkaufschance(v) end as stand) s
left join public.auswahlwerte a on a.liste = 'kundenstand' and a.schluessel = s.stand;

grant select on public.verkauf_geschaefte to authenticated;
revoke all on public.verkauf_geschaefte from anon;
