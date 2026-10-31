# 0029 – Grossprojekt-Monitor für Contracting

**Kontext:** Chris wünschte am 30.10.2026 einen Monitor für Grossprojekte, die sich für Energie-Contracting eignen
(grosse Dächer, Gewerbe und Industrie, Gemeinden, Überbauungen, Heizungs- und PV-Contracting). Er wählte einen eigenen
Bereich in der Seitenleiste und sagte: «wir wollen keine Mail, es soll direkt im CRM sein». Grundlage ist der
Ausschreibungs-Monitor (Phase 8b, Entscheid 0017), der simap und das Amtsblatt schon liest.

**Entscheid:**

- **Eigener Bereich «Grossprojekte»** (`contracting`, Gruppe Verkauf, Phase 8c) mit den Reitern Prüfen, Beobachten,
  Bewilligt, Alle und Annahmen. Akte als Seitenpanel (`#/contracting?projekt=…`).
- **Quellen:** Jede Meldung, die der Ausschreibungs-Monitor einliest, prüft auch der Grossprojekt-Monitor
  (`ausschreibung_einlesen` ruft `intern.gp_aus_meldung`), auch wenn sie kein PV-Wort enthält (z. B. «Heizungsersatz»).
  Treffer: grosses Gebäude oder Heizung im Text, kein Ausschluss (Einfamilienhaus, Garage …). Dazu von Hand erfasst.
  Der Server ergänzt mit Adresse oder Parzelle die Dachfläche von **sonnendach.ch** und Baujahr, Wohnungen und Heizung
  aus dem **Gebäuderegister** (api3.geo.admin.ch, offen, ohne Schlüssel). Von Hand Eingetragenes bleibt stehen.
- **Punkte 0 bis 100 in der Datenbank** (`intern.gp_bewerten`, Trigger bei jedem Speichern): Dach bis 30, Eigenverbrauch
  bis 20, Heizung bis 20 (fossil, alt, ab 50 kW; Heizungsersatz voll), Bauherrschaft bis 15 (Gemeinde, Genossenschaft,
  Pensionskasse zuerst), Fahrzeit bis 10, Wohnungen für einen ZEV bis 5. Ausgeschlossen (0 Punkte): geschützt,
  Einfamilienhaus, über 60 Minuten, Dach unter 200 m² ohne grosse Heizung.
- **Grobe Schätzung** ebenfalls in der Datenbank: kWp aus der Fläche, Ertrag von sonnendach.ch, Investition nach
  Staffel, Contracting-Preis in Rp./kWh (Annuität + Betrieb + Marge, geteilt durch den Ertrag); Wärme: Leistung,
  Investition und Jahresrate. Alle Werte, Schwellen und Stichworte in `einstellungen.grossprojekte` (ändern nur
  Administration, Trigger rechnet danach alle offenen neu).
- **Alles im CRM, keine Mail:** Starke Treffer (ab `melden_ab`, Standard 50 Punkte) meldet der Zeitplan stündlich einmal
  in der Glocke (an Andy, sonst an die Administration); Karte «Grossprojekte» auf «Mein Tag».
- **Entscheid wie beim Ausschreibungs-Monitor:** Andy bewilligt (Vertretung Chris, Administration immer); erst dann
  entsteht der Lead (Quelle «Grossprojekt», Interesse PV/Wärmepumpe, Schätzung in der Notiz). Hat das Dossier schon
  einen Lead, wird dieser genommen. Verwerfen nur mit Grund, Beobachten mit Wiedervorlage. Stand und Entscheid ändern
  nur `grossprojekt_entscheiden` und der Zeitplan (Trigger `grossprojekt_schuetzen`).
- **Kein Anschreiben:** Wie die Firma kontaktiert wird, entscheidet das Team im Lead.

**Folgen:** Neue Fachtabelle `grossprojekte` (automatisch in der Datensicherung), Spalte `aktivitaeten.grossprojekt_id`,
Edge Function `grossprojekte` (Aktion `anreichern`), Job `grossprojekte` im Zeitplan. Der echte Dienst des Bundes ist in
der Cloud-Sandbox gesperrt: `npm run grossprojekte:pruefen` prüft gegen einen Ersatz-Server. Die Feldnamen (sonnendach
`flaeche`, `klasse`, `stromertrag`, `building_id`; GWR `egid`, `gbauj`, `ganzwhg`, `gkat`, `gklas`, `genh1`,
`gwaerdath1`) stammen aus der Dokumentation und sind beim ersten echten Lauf zu bestätigen.

## Nachtrag 31.10.2026: Dachsuche

**Kontext:** Chris: «Grossprojekte soll selbständig nach grossen Dächern suchen mit viel Verbrauch, wo PV eine gute
Option wäre. Wir haben mit Youdera eine super Ausgangslage für Contracting und wollen im nächsten Jahr einige
Grossprojekte machen.» Meldungen von simap und Amtsblatt reichen dafür nicht: Bestehende Gebäude ohne Baugesuch fehlen.

**Entscheid:**

- **Kacheln statt Meldungen:** Das Gebiet um die Zentren in `einstellungen.grossprojekte.suche.zentren` (Muri, Bulle,
  je 30 km) ist in Kacheln von 2 × 2 km geteilt (`intern.gp_kacheln`, rund 1'400). Der Zeitplan nimmt stündlich die
  nächsten `kacheln_pro_lauf` (Standard 6) noch nicht oder vor über einem Jahr durchsuchten, die nahen zuerst; so ist
  das ganze Gebiet in rund zehn Tagen einmal durchsucht. Fortschritt in `intern.gp_suchkacheln`.
- **Viel Verbrauch = Gebäudeklasse:** Pro Kachel alle Gebäude aus dem Gebäuderegister (Identify mit Rechteck,
  seitenweise), behalten werden die Klassen in `suche.klassen` (Industrie 1251, Lager 1252, Handel 1230, Büro 1220,
  Schule 1263, Spital 1264, Sport 1265, Heim 1130) ab `min_grundflaeche_m2` (800 m²). Für diese das Dach bei
  sonnendach.ch; ab `min_dach_m2` (500 m²) geht das Gebäude an `grossprojekt_aus_suche`.
- **Nur was sich lohnt:** `grossprojekt_aus_suche` bewertet vor dem Speichern (`intern.gp_vorbereitet`, gleiche
  Rechnung wie der Trigger) und nimmt nur auf, was mindestens `suche.ab_punkte` (50) hat und nicht ausgeschlossen ist.
  Nie doppelt: gleiche EGID oder innert 30 m, auch im Papierkorb oder verworfen (was Andy weggelegt hat, kommt nicht
  wieder). Quelle «Dachsuche», Bauherrschaft offen (steht nicht im Register; Andy klärt sie im Grundbuch).
- **Anhalten:** Schalter «Dachsuche» im Reiter Annahmen (nur Administration), dort auch der Fortschritt.

**Folgen:** Mehr Abfragen beim Bund (pro Kachel 1–8 fürs Register, 2 pro grossem Gebäude für das Dach); bei Ausfall
hört der Lauf auf und macht in der nächsten Stunde weiter. Feldnamen des Registers für Lage und Adresse (`gkode`,
`gkodn`, `garea`, `strname`, `deinr`, `dplz4`, `ggdename`, `lparz`) und `limit`/`offset` beim Identify sind beim ersten
echten Lauf zu bestätigen; `npm run grossprojekte:pruefen` prüft die Suche gegen den Ersatz-Server.

## Nachtrag 31.10.2026: 10 pro Woche, Recherche, Gebiet, verantwortlich

**Kontext:** Chris: «10 pro Woche reichen, aber es muss auch immer herausgefunden werden, wem es gehört und wer
Ansprechpartner ist, und Schritte vorschlagen.» Gebiet: «alle unsere Regionen» (www.dimension-solaire.ch/de/regionen/).
Schwelle: «einfach alles, was interessant ist». Ansprechperson bei uns für Grossprojekte ist Chris, änderbar.

**Entscheid:**

- **Vorrat und 10 pro Woche:** Die Dachsuche legt Treffer in `intern.gp_suchvorrat` (`grossprojekt_in_vorrat`, gleiche
  Prüfung auf Doppelte wie bisher). Der Zeitplan gibt mit `grossprojekt_vorrat_freigeben` die Treffer mit den meisten
  Punkten frei, bis `suche.pro_woche` (10) neue Grossprojekte in dieser Woche (Montag, Zürcher Zeit) erreicht sind.
  Alle neuen ausser von Hand Erfassten zählen mit; Treffer aus Ausschreibungen werden nie gebremst.
- **Keine harte Schwelle:** In den Vorrat kommt ab `suche.ab_punkte` 35 (vorher 50 direkt in die Liste), Dach ab 300 m²,
  Grundfläche ab 500 m²; die Punkte entscheiden, welche 10 pro Woche kommen. Alles in Annahmen › Suchgebiet einstellbar.
- **Gebiet = Regionen der Website:** 18 Gebiete als PLZ mit Radius (`suche.zentren`, `plz` + `radius_km`, einzeln
  ausschaltbar): Freiamt, Aarau, Baden, Luzern, Zug, Zürich, Winterthur; Greyerzerland, Freiburg, Lausanne/Riviera,
  Yverdon, Genf, Neuenburg, Jura, Berner Jura/Biel, Martigny, Sion, Visp. Die Mitte rechnet `intern.lv95` aus
  `plz_verzeichnis` (Näherung swisstopo). Rund 4'700 Kacheln, 10 pro Stunde: einmal durch in etwa 20 Tagen, die nahen
  zuerst. `fahrzeit_max` 120 Minuten (vorher 60), damit Genf und das Wallis nicht ausgeschlossen werden.
- **Recherche durch die KI:** Jedes neue Grossprojekt wartet (`recherche_stand`). Der Zeitplan (Job
  `grossprojekte_recherche`, alle 30 Minuten, eines pro Lauf) sucht mit der Websuche der Claude API (Handelsregister,
  Firmenwebsite, Gemeinde) nach Eigentümer, Nutzer und Ansprechperson und schreibt Notizen mit Quellen; ein zweiter
  Aufruf ordnet sie in ein festes Schema (`_shared/gp_recherche.ts`). Nur berufliche, öffentliche Kontaktdaten; bei
  Privatpersonen keine. Übernommen wird erst per Klick (Bauherrschaft, Ansprechperson, Schritte als Aufgaben); das
  Eigentum bestätigt ein Mensch im Grundbuch. Stufe `einstellungen.ki.funktionen.grossprojekt_recherche`, Kosten im
  Tageslimit, Websuche mit `websuche_usd_je_1000` (10 USD je 1000 Suchen, bis 8 pro Recherche), etwa CHF 0.30 je
  Grossprojekt. Limit erreicht oder KI aus: zurück in die Warteschlange.
- **Verantwortlich bei uns:** `grossprojekte.verantwortlich_id`, Standard aus `einstellungen.grossprojekte.verantwortlich`
  (Kürzel «chris»), in der Akte änderbar (`grossprojekt_verantwortlich_setzen`). Diese Person bekommt die Glocke für neue
  starke Treffer (zusätzlich zu Andy, der bewilligt) und die Aufgaben aus den Schritten.

**Folgen:** Neue Migrationen `20261110000200` und `20261110000300`, Zeitplan neu hochladen, kein neues Secret (die KI
nutzt `ANTHROPIC_API_KEY`). Wer Leads und Offerten übernimmt (Filipe Französisch, Loris Deutsch, Offerten Andy), gehört
zur Lead-Zuteilung und ist hier nicht geregelt.
