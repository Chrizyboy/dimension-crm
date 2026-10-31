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
