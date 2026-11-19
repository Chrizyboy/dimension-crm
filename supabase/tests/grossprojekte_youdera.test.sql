-- Prüft die Youdera-Prüfung der Grossprojekte (Entscheid 0029, Nachtrag 19.11.2026): Anlage auf den Verbrauch ausgelegt,
-- Eigenverbrauch mindestens 70 %, Weg (PPA, ZEV, Dachmiete), Ampel mit drei Seiten, Ausschluss bei belegtem Dach oder
-- ohne Weg, echte Zahlen (Stromrechnung) vor Schätzung, Recherche nur mit hoher Sicherheit, PV-Bestand nachtragen.
-- Ausführen: npm run db:test
begin;
select plan(17);

create temporary table t (name text primary key, id uuid) on commit drop;
-- Fester Massstab, damit der Test nicht von der aktuellen Einstellung abhängt.
update public.einstellungen set wert = jsonb_set(wert, '{suche,ab_punkte}', '35') where schluessel = 'grossprojekte';

-- Industriehalle: 3'000 m² Grundfläche, 1'800 m² gutes Dach, keine PV, Eigentum offen
insert into t select 'halle', public.grossprojekt_aus_suche('{"egid": "8y0001", "strasse": "Hallenweg 3", "plz": "5630",
  "gemeinde": "Muri (AG)", "lage_e": 2669600, "lage_n": 1237600, "nutzung": "industrie", "dachflaeche_m2": 1800,
  "dach_klasse": 4, "stromertrag_kwh": 300000, "grundflaeche_m2": 3000, "geschosse": 1, "baujahr": 2005,
  "pv_bestand_kw": 0, "egrid": "CH999900000001"}', 'Dachsuche: Test');
select isnt((select id from t where name = 'halle'), null, 'Industriehalle ohne PV wird aufgenommen');
select is((select eignung ->> 'weg' from public.grossprojekte where id = (select id from t where name = 'halle')), 'ppa',
  'Weg: Strom-Contracting mit dem Eigentümer');
select ok((select (eignung ->> 'kwp_empfohlen')::int between 200 and 260 and (eignung ->> 'kwp_dach')::int = 324
  from public.grossprojekte where id = (select id from t where name = 'halle')),
  'Anlage auf den Verbrauch ausgelegt (rund 230 kWp), nicht aufs ganze Dach (324 kWp)');
select cmp_ok((select (eignung ->> 'eigenverbrauch_prozent')::int from public.grossprojekte
  where id = (select id from t where name = 'halle')), '>=', 70, 'Eigenverbrauch erreicht die Schwelle von Youdera');
select is((select eignung ->> 'ampel' from public.grossprojekte where id = (select id from t where name = 'halle')), 'gruen',
  'Ampel grün: Grösse, Eigenverbrauch, Ersparnis und freies Dach stimmen');
select cmp_ok((select (eignung ->> 'ersparnis_chf')::int from public.grossprojekte
  where id = (select id from t where name = 'halle')), '>', 0, 'Kunde spart etwas');
select is((select egrid || '/' || grundflaeche_m2 || '/' || pv_bestand_kw from public.grossprojekte
  where id = (select id from t where name = 'halle')), 'CH999900000001/3000/0', 'EGRID, Grundfläche und PV-Bestand gespeichert');
select is((select jsonb_array_length(eignung -> 'pruefungen' -> 'kunde') + jsonb_array_length(eignung -> 'pruefungen' -> 'youdera')
  + jsonb_array_length(eignung -> 'pruefungen' -> 'wir') from public.grossprojekte where id = (select id from t where name = 'halle')),
  9, 'neun Prüfpunkte auf drei Seiten');

-- Belegtes Dach und Gebäude ohne Weg
select is(public.grossprojekt_aus_suche('{"egid": "8y0002", "plz": "5630", "lage_e": 2670600, "lage_n": 1237600,
  "nutzung": "industrie", "dachflaeche_m2": 1800, "stromertrag_kwh": 300000, "grundflaeche_m2": 3000, "pv_bestand_kw": 250}'),
  null, 'Dach mit grosser PV-Anlage: nicht in die Liste');
select is((intern.gp_vorbereitet(jsonb_populate_record(null::public.grossprojekte, '{"plz": "5630", "bauherr_art": "immobilien",
  "nutzung": "verwaltung", "dachflaeche_m2": 900, "stromertrag_kwh": 150000, "grundflaeche_m2": 800}'), true)).ausschluss,
  'kein_weg', 'vermietetes Bürohaus mit kleinem Dach: weder PPA noch Dachmiete');
select is((intern.gp_vorbereitet(jsonb_populate_record(null::public.grossprojekte, '{"plz": "5630", "bauherr_art": "immobilien",
  "nutzung": "gewerbe", "dachflaeche_m2": 4000, "stromertrag_kwh": 700000, "grundflaeche_m2": 5000}'), true)).eignung ->> 'weg',
  'dachmiete', 'vermietete Halle mit grossem Dach: Dachmiete');
select is((intern.gp_vorbereitet(jsonb_populate_record(null::public.grossprojekte, '{"plz": "5630", "bauherr_art": "genossenschaft",
  "nutzung": "ueberbauung", "wohnungen": 24, "dachflaeche_m2": 1200, "stromertrag_kwh": 200000, "grundflaeche_m2": 1500,
  "geschosse": 5}'), true)).eignung ->> 'weg', 'zev', 'Überbauung mit 24 Wohnungen: ZEV');

-- Echte Zahlen und Recherche
update public.grossprojekte set rechnung = '{"verbrauch_kwh": 900000}' where id = (select id from t where name = 'halle');
select is((select (eignung ->> 'kwp_empfohlen')::int || '/' || (eignung ->> 'verbrauch_quelle') from public.grossprojekte
  where id = (select id from t where name = 'halle')), '324/rechnung', 'mit der Stromrechnung: ganzes Dach, Verbrauch echt');
update public.grossprojekte set recherche = '{"eigentuemer": {"sicherheit": "tief"}, "eigentuemer_nutzt_selbst": false}'
 where id = (select id from t where name = 'halle');
select is((select eignung ->> 'weg' from public.grossprojekte where id = (select id from t where name = 'halle')), 'ppa',
  'unsichere Recherche ändert nichts');
update public.grossprojekte set recherche = '{"eigentuemer": {"sicherheit": "hoch"}, "eigentuemer_nutzt_selbst": false}'
 where id = (select id from t where name = 'halle');
select is((select eignung ->> 'weg' from public.grossprojekte where id = (select id from t where name = 'halle')), 'dachmiete',
  'sicher vermietet: kein PPA mit dem Eigentümer, nur Dachmiete');

-- PV-Bestand nachtragen (Zeitplan)
update public.grossprojekte set pv_geprueft_am = null where id = (select id from t where name = 'halle');
select ok(public.grossprojekt_pv_offen(50) @> jsonb_build_array(jsonb_build_object('id', (select id from t where name = 'halle'))),
  'nie geprüfte kommen in die Warteschlange');
select public.grossprojekt_pv_setzen((select id from t where name = 'halle'), '{"pv_bestand_kw": 300}');
select is((select ausschluss from public.grossprojekte where id = (select id from t where name = 'halle')), 'pv_vorhanden',
  'nachgetragene grosse PV schliesst aus');

select * from finish();
rollback;
