-- Phase 13, Teil 1: Grundlagen der KI-Funktionen (Bau-Auftrag 3.4), siehe Entscheid 0024.
-- Die KI läuft nur auf dem Server (Edge Function «ki», Schlüssel ANTHROPIC_API_KEY nur in den Secrets).
-- Hier liegen die zentrale Einstellung (Modelle, Preise, Tageslimit, Firmenstil), das Kostenprotokoll jedes Aufrufs,
-- gespeicherte Ergebnisse (Zusammenfassung, Lead-Bewertung, Tagesbriefing, Luftbild) und der Schreibstil pro Person.

-- Zentrale Einstellung (Regel 9: Modelle nie im Code raten). Nur die Administration ändert sie.
-- Preise in USD je Million Tokens (Stand Oktober 2026), umgerechnet mit «usd_chf».
insert into public.einstellungen (schluessel, wert) values ('ki', $j${
  "aktiv": true,
  "modelle": {"standard": "claude-opus-5-5", "schnell": "claude-haiku-5-5"},
  "preise_usd": {
    "claude-opus-5-5":   {"ein": 4.0, "aus": 20.0, "cache_lesen": 0.20, "cache_schreiben": 5.0},
    "claude-sonnet-5-5": {"ein": 2.0, "aus": 10.0, "cache_lesen": 0.20, "cache_schreiben": 2.5},
    "claude-haiku-5-5":  {"ein": 0.10, "aus": 0.50, "cache_lesen": 0.01, "cache_schreiben": 0.125}
  },
  "usd_chf": 0.90,
  "tageslimit_rappen": 1000,
  "person_limit_rappen": null,
  "funktionen": {
    "entwurf": "standard", "zusammenfassung": "standard", "mail_erkennen": "schnell", "notiz": "schnell",
    "lead_bewertung": "standard", "briefing": "standard", "luftbild": "standard", "beleg": "schnell",
    "offerte_pdf": "schnell", "social": "standard", "marketing_text": "standard", "monatsbericht": "standard",
    "stil_lernen": "schnell", "automation": "standard"
  },
  "stil": {
    "de": "SCHREIBSTIL (verbindlich, gilt für jeden Kundentext):\nDer Text muss klingen wie von einem erfahrenen Verkäufer persönlich geschrieben – nicht nach KI. Kein Werbe- oder Floskeldeutsch, keine übertriebene Höflichkeit, keine Zusammenfassungen am Schluss.\nAufbau:\n– Anrede «Guten Tag Herr …» / «Guten Tag Frau …» (bei Vornamen-Duzis nur, wenn die Daten das zeigen).\n– Erster Satz: konkreter, persönlicher Dank oder Bezug («Vielen Dank für das gute Gespräch gestern bei Ihnen vor Ort.», «Besten Dank für Ihre Rückmeldung und dafür, dass Sie so konkret nachfragen.»).\n– Bei mehreren Fragen kurz ankündigen, wie du vorgehst («Ich gehe Ihre vier Punkte der Reihe nach durch, zum Preis komme ich am Schluss.»).\n– Pro Thema eine kurze, schlichte Zwischenzeile als eigene Zeile, ohne Nummer und ohne Doppelpunkt (z.B. «Zur Rückliefervergütung», «Werkgarantie», «Verschattung», «Zum Preis»), danach eine Leerzeile und fliessende Absätze in ganzen Sätzen. Kurze Texte (z.B. Begleittext, Terminbestätigung) brauchen keine Zwischenzeilen.\n– Schluss: klarer nächster Schritt und Angebot zum Telefonieren («Rufen Sie mich gerne an, wenn Sie etwas lieber direkt besprechen möchten.»), dann «Freundliche Grüsse».\nInhalt und Haltung:\n– Mit konkreten Zahlen aus den Daten argumentieren (CHF 38'470.90, kWp, kWh, Rp./kWh, mm, kg, Jahre) – aber nur, was in den Daten steht.\n– Ehrlich, direkt und sicher. Eine eigene Einschätzung ist erlaubt und erwünscht («Aus meiner Sicht ist das ein Selbstläufer.», «Ehrlich gesagt sehe ich den Nutzen hier begrenzt.»). Wo es passt, eine leichte, natürliche Wärme – nie anbiedernd.\n– Falsche Informationen sachlich richtigstellen, ohne Dritte schlechtzumachen («Da muss ich Ihrem Elektriker leider widersprechen: …» plus Fakten, ggf. Hinweis auf das beigelegte Datenblatt).\n– Grenzen klar benennen («Eine Abgrenzung muss ich trotzdem machen: …»). Entgegenkommen immer mit Begründung.\n– Niemals Rabatte, überarbeitete Offerten, Termine oder Leistungen versprechen, die nicht ausdrücklich in den Daten oder im Auftrag stehen.\n– Bei Preisdruck: freundlich fragen, ob das Vergleichsangebot den gleichen Umfang hat, und aufzählen, welche Komponenten und Leistungen bei uns enthalten sind (keine Garantien oder Planungsdetails in diese Liste).\n– Anhänge, auf die sich der Text bezieht, im Text erwähnen («Das Datenblatt lege ich Ihnen bei.»).\n– Keine Standardfloskeln wie «Vielen Dank für Ihr Interesse», «Wir freuen uns, Ihnen … zu unterbreiten», «Zögern Sie nicht» oder «Wir hoffen, Ihnen damit gedient zu haben».\n– Interne Angaben gehören nicht in den Kundentext: Standort-Bezeichnungen, Status, Lead-Quelle, interne Kommentare und Notizen, Kürzel, Dateinamen. Nutze sie höchstens als Hintergrund.\n– Wenn Zahlen in den Wünschen und in der angehängten Offerte voneinander abweichen, gilt die Offerte; setze bei Unklarheit einen Platzhalter [bitte prüfen].\n– Betreff kurz und konkret, z.B. «Ihre Offerte 200014 – die offenen Punkte von gestern».",
    "fr": "STYLE D'ÉCRITURE (obligatoire pour chaque texte client) :\nLe texte doit sonner comme écrit personnellement par un conseiller expérimenté – pas comme une IA. Pas de formules publicitaires, pas de politesse exagérée, pas de résumé final.\nStructure :\n– «Bonjour Monsieur …» / «Bonjour Madame …».\n– Première phrase : remerciement concret et personnel («Merci pour notre échange d'hier sur place.», «Merci pour votre retour et pour vos questions précises.»).\n– S'il y a plusieurs questions, annoncer brièvement la marche («Je reprends vos quatre points dans l'ordre, je termine par le prix.»).\n– Pour chaque thème, un intertitre court et simple sur sa propre ligne, sans numéro ni deux-points (p.ex. «Rétribution de l'injection», «Garantie», «Ombrage», «Concernant le prix»), puis une ligne vide et des paragraphes en phrases complètes. Les textes courts (lettre d'accompagnement, confirmation de rendez-vous) n'ont pas d'intertitres.\n– Fin : prochaine étape claire et proposition d'appeler («N'hésitez pas à m'appeler si vous préférez en discuter de vive voix.»), puis «Meilleures salutations».\nContenu et ton :\n– Argumenter avec les chiffres concrets des données (CHF, kWc, kWh, ct./kWh, mm, kg, années) – uniquement ceux qui figurent dans les données.\n– Honnête, direct, sûr de soi. Un avis personnel est bienvenu («À mon avis, c'est un investissement qui se rentabilise tout seul.», «Honnêtement, j'en vois l'utilité limitée ici.»). Une chaleur naturelle, jamais obséquieuse.\n– Corriger une information erronée factuellement, sans dénigrer des tiers («Là, je dois malheureusement contredire votre électricien : …»).\n– Poser clairement les limites («Je dois tout de même faire une distinction : …»). Toute concession est motivée.\n– Ne jamais promettre de rabais, d'offre révisée, de dates ou de prestations qui ne figurent pas explicitement dans les données ou la demande.\n– En cas de pression sur le prix : demander poliment si l'offre concurrente a le même périmètre et énumérer les composants et prestations inclus chez nous (pas de garanties ni de détails de planification dans cette liste).\n– Mentionner les annexes auxquelles le texte fait référence.\n– Pas de formules toutes faites comme «Merci pour votre intérêt», «Nous avons le plaisir de vous soumettre», «N'hésitez pas à» en ouverture, ou «En espérant avoir répondu à vos attentes».\n– Les informations internes n'apparaissent pas dans le texte : site (Bulle/Muri), statut, source du lead, commentaires internes, abréviations, noms de fichiers.\n– Si des chiffres diffèrent entre la demande et l'offre jointe, l'offre fait foi ; en cas de doute, placeholder [à vérifier].\n– Objet court et concret, p.ex. «Votre offre 200014 – les points ouverts d'hier»."
  }
}$j$::jsonb)
on conflict (schluessel) do nothing;

/** Einstellungen schützen (wie bisher) und neu: die KI-Einstellung ändert nur die Administration. */
create or replace function intern.einstellung_schuetzen() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.schluessel = 'ausschreibungen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ausschreibung.kein_recht';
  end if;
  if new.schluessel = 'finanzen' and auth.uid() is not null and not intern.hat_recht('finanzen') then
    raise exception using errcode = '42501', message = 'finanzen.kein_recht';
  end if;
  if new.schluessel = 'marketing' and auth.uid() is not null and not intern.hat_recht('admin')
     and (tg_op = 'INSERT' or (new.wert -> 'social' ->> 'ci') is distinct from (old.wert -> 'social' ->> 'ci')) then
    raise exception using errcode = '42501', message = 'marketing.ci_nur_admin';
  end if;
  if new.schluessel = 'automationen' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'automation.kein_recht';
  end if;
  if new.schluessel = 'ki' and auth.uid() is not null and not intern.hat_recht('admin') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return new;
end
$$;

-- Kostenprotokoll: jeder Aufruf der KI mit Funktion, Modell, Tokens und Kosten. Keine Inhalte (Datenschutz).
-- Kosten in Tausendstel-Rappen (Ganzzahl), weil ein Aufruf oft weniger als einen Rappen kostet.
create table public.ki_aufrufe (
  id                bigint generated always as identity primary key,
  zeitpunkt         timestamptz not null default now(),
  person_id         uuid references public.personen (id),
  funktion          text not null,
  modell            text not null,
  ok                boolean not null,
  fehler            text,
  eingabe_tokens    int not null default 0,
  ausgabe_tokens    int not null default 0,
  cache_tokens      int not null default 0,
  kosten_millirappen bigint not null default 0,
  dauer_ms          int,
  bezug_tabelle     text,
  bezug_id          uuid
);
create index ki_aufrufe_zeit_idx on public.ki_aufrufe (zeitpunkt desc);
create index ki_aufrufe_person_idx on public.ki_aufrufe (person_id, zeitpunkt desc);
alter table public.ki_aufrufe enable row level security;
-- Lesen: die eigenen Aufrufe, die Administration alle. Schreiben nur der Server (Service-Schlüssel).
create policy lesen on public.ki_aufrufe for select to authenticated
  using ((select intern.hat_recht('admin')) or person_id = (select intern.meine_person_id()));
comment on table public.ki_aufrufe is 'Kostenprotokoll der KI (Phase 13): ohne Inhalte, nur Funktion, Modell, Tokens, Kosten.';
comment on column public.ki_aufrufe.kosten_millirappen is 'Kosten in Tausendstel-Rappen (1000 = 1 Rappen).';

-- Gespeicherte Ergebnisse, damit dieselbe Frage nicht zweimal bezahlt wird und das Ergebnis später sichtbar bleibt.
create table public.ki_ergebnisse (
  id            uuid primary key default gen_random_uuid(),
  art           text not null check (art in ('zusammenfassung', 'lead_bewertung', 'briefing', 'luftbild')),
  bezug_tabelle text not null,
  bezug_id      uuid not null,
  person_id     uuid references public.personen (id),
  sprache       text not null default 'de' check (sprache in ('de', 'fr')),
  inhalt        jsonb not null,
  modell        text
);
select intern.richte_fachtabelle_ein('ki_ergebnisse');
create index ki_ergebnisse_bezug_idx on public.ki_ergebnisse (bezug_tabelle, bezug_id, art, erstellt_am desc)
  where geloescht_am is null;
-- Das Tagesbriefing sieht nur, wem es gehört (und die Administration).
create policy nur_eigenes_briefing on public.ki_ergebnisse as restrictive for select to authenticated
  using (art <> 'briefing' or person_id = (select intern.meine_person_id()) or (select intern.hat_recht('admin')));
comment on table public.ki_ergebnisse is
  'KI-Ergebnisse (Phase 13): Zusammenfassung, Lead-Bewertung, Tagesbriefing, Luftbild-Analyse. Vorschläge, nie Fakten.';

-- Schreibstil pro Person (V233 «Mein Schreibstil», aisLearn): gelernte Regeln und zuletzt übernommene Beispiele.
create unique index if not exists schreibstile_person_idx on public.schreibstile (person_id) where geloescht_am is null;
alter table public.schreibstile add column if not exists anzahl int not null default 0;
comment on column public.schreibstile.regeln is 'Gelernte Regeln (Liste kurzer Sätze, höchstens 15), von der Person änderbar.';
comment on column public.schreibstile.beispiele is 'Zuletzt übernommene Texte ohne Namen und Adressen: [{"art", "text", "am"}], höchstens 4.';
comment on column public.schreibstile.anzahl is 'Wie viele KI-Texte die Person übernommen hat.';
-- Den eigenen Stil sieht und ändert jede Person selbst, fremde nur die Administration.
create policy nur_eigener_stil on public.schreibstile as restrictive for all to authenticated
  using (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('admin')))
  with check (person_id = (select intern.meine_person_id()) or (select intern.hat_recht('admin')));

-- Ausgangskorb: Entwürfe aus Automationen, deren Text die KI schreiben soll (Warteschlange für den Zeitplan).
alter table public.ausgangskorb
  add column if not exists ki_status  text check (ki_status in ('wartet', 'fertig', 'fehler', 'uebersprungen')),
  add column if not exists ki_auftrag jsonb;
create index if not exists ausgangskorb_ki_idx on public.ausgangskorb (erstellt_am) where ki_status = 'wartet';
comment on column public.ausgangskorb.ki_status is
  'KI-Entwurf: wartet (Text aus der Vorlage, KI schreibt gleich), fertig, fehler oder uebersprungen (Vorlagentext bleibt).';

/** Heutige KI-Kosten (Zürich-Tag) gesamt und für eine Person, mit den Limits aus der Einstellung. */
create or replace function intern.ki_budget(p_person uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with e as (select coalesce((select wert from public.einstellungen where schluessel = 'ki' and geloescht_am is null), '{}') as w),
       h as (select coalesce(sum(kosten_millirappen), 0) as alle,
                    coalesce(sum(kosten_millirappen) filter (where person_id = p_person), 0) as person
               from public.ki_aufrufe
              where zeitpunkt >= ((now() at time zone 'Europe/Zurich')::date)::timestamp at time zone 'Europe/Zurich')
  select jsonb_build_object(
    'aktiv', coalesce((e.w ->> 'aktiv')::boolean, true),
    'heute_millirappen', h.alle,
    'person_millirappen', h.person,
    'limit_rappen', (e.w ->> 'tageslimit_rappen')::int,
    'person_limit_rappen', (e.w ->> 'person_limit_rappen')::int,
    'frei', coalesce((e.w ->> 'aktiv')::boolean, true)
            and (e.w ->> 'tageslimit_rappen' is null or h.alle < (e.w ->> 'tageslimit_rappen')::bigint * 1000)
            and (e.w ->> 'person_limit_rappen' is null or h.person < (e.w ->> 'person_limit_rappen')::bigint * 1000))
  from e, h
$$;

/** Budget für den Server (Edge Function «ki» prüft vor jedem Aufruf). */
create or replace function public.ki_budget(p_person uuid) returns jsonb
language sql stable security definer set search_path = '' as $$ select intern.ki_budget(p_person) $$;
revoke execute on function public.ki_budget(uuid) from public, anon, authenticated;
grant execute on function public.ki_budget(uuid) to service_role;

/** Budget der angemeldeten Person (für die Anzeige in der App). */
create or replace function public.ki_mein_budget() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not intern.hat_recht('basis') then
    raise exception using errcode = '42501', message = 'ki.kein_recht';
  end if;
  return intern.ki_budget(intern.meine_person_id());
end
$$;
revoke execute on function public.ki_mein_budget() from public, anon;
grant execute on function public.ki_mein_budget() to authenticated;

/**
 * Kostenübersicht für einen Zeitraum: je Tag, Funktion und Person. Security invoker: die Administration sieht alle,
 * alle anderen nur die eigenen Aufrufe (RLS auf ki_aufrufe).
 */
create or replace function public.ki_kosten(p_von date, p_bis date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with a as (
    select * from public.ki_aufrufe
     where zeitpunkt >= p_von::timestamp at time zone 'Europe/Zurich'
       and zeitpunkt < (p_bis + 1)::timestamp at time zone 'Europe/Zurich')
  select jsonb_build_object(
    'summe_millirappen', (select coalesce(sum(kosten_millirappen), 0) from a),
    'anzahl', (select count(*) from a),
    'fehler', (select count(*) from a where not ok),
    'tage', coalesce((select jsonb_agg(jsonb_build_object('tag', tag, 'millirappen', m, 'anzahl', n) order by tag)
                        from (select (zeitpunkt at time zone 'Europe/Zurich')::date as tag,
                                     sum(kosten_millirappen) as m, count(*) as n from a group by 1) t), '[]'),
    'funktionen', coalesce((select jsonb_agg(jsonb_build_object('funktion', funktion, 'millirappen', m, 'anzahl', n)
                                             order by m desc)
                              from (select funktion, sum(kosten_millirappen) as m, count(*) as n from a group by 1) t), '[]'),
    'personen', coalesce((select jsonb_agg(jsonb_build_object('person_id', person_id, 'name', name,
                                                              'millirappen', m, 'anzahl', n) order by m desc)
                            from (select a.person_id, p.name, sum(kosten_millirappen) as m, count(*) as n
                                    from a left join public.personen p on p.id = a.person_id group by 1, 2) t), '[]'),
    'modelle', coalesce((select jsonb_agg(jsonb_build_object('modell', modell, 'millirappen', m, 'anzahl', n,
                                                             'eingabe', ein, 'ausgabe', aus) order by m desc)
                           from (select modell, sum(kosten_millirappen) as m, count(*) as n,
                                        sum(eingabe_tokens) as ein, sum(ausgabe_tokens) as aus from a group by 1) t), '[]'))
$$;
grant execute on function public.ki_kosten(date, date) to authenticated;
