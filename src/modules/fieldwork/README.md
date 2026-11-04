# Modul: Baustelle & Rapporte

**Zweck:** Die Handy-Ansicht für Monteure und die Büro-Sicht dazu: Tagesplan, ein Rapport für alles (Montage,
Service, Wartung, IBN) mit Arbeiten, Mehrmaterial, Fotos, Prüfpunkten, Nachträgen und Unterschrift des Kunden,
Zeiterfassung mit Start/Stopp und Lohn-Export, Anlagedossier. Funktioniert auch ohne Netz.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, https://claude.ai/artifact/Q54YPWZzgtFQSSS6PHUnmq),
gebaut in Phase **9b**, Entscheid 0020; ausgebaut für Montage, Projektleitung und GL am 2.11.2026, Entscheid 0045.

## Reiter (`#/fieldwork?reiter=…&rapport=…&baustelle=…`)

Nur mit Recht `preise` (Projektleitung, GL), Start dort bei «Baustellen heute»:

- **Baustellen heute** (`heute`): wer ist wo, wer hat gestempelt, Fortschritt, Ist/Soll, Fotos, Meldungen,
  fehlende Rapporte, Rapporte zum Visieren. Lädt alle zwei Minuten neu.
- **Baustellen**: Liste der letzten und nächsten Wochen; Baustellen-Akte als Seitenpanel (`?baustelle=…`) mit
  Schritten, Soll/Ist (Soll änderbar), Einsätzen, Bautagebuch, Meldungen, Nachträgen, Pflichtfotos, Seriennummern.
- **Meldungen**: alles, was von den Baustellen gemeldet wurde; erledigen mit Notiz.
- **Auswertung**: fertige Baustellen mit Ist gegen Soll, Stunden pro kWp, Reiseanteil, Nachträge, Rapport-Treue.

Für alle:

- **Mein Tag** (`tag`): oben die Stempeluhr (Arbeit oder Reise starten, auch ohne Rapport, z. B. Fahrt ins Lager;
  Summen heute und Woche), darunter Einsätze und Service-Termine der angemeldeten Person für heute und die nächsten Tage,
  mit Navigation, Anruf, Team, Elektriker, laufender Zeit und «Rapport beginnen» / «IBN-Protokoll». Bei Montagen:
  Fortschritt, was heute dran ist, fehlende Pflichtfotos, Projektleitung, «Mappe» (offline) und «Problem melden».
  «Rapport beginnen» öffnet den Sicherheits-Check und startet die Zeit fürs ganze Team.
  Im Rapport: Teamzeit mit Feierabend und Pause, Arbeitsschritte, Diktat, Pflichtfotos, Seriennummern scannen;
  Unterschrift nur bei Abnahme (mit Vorbehalten) und Nachträgen; Visum oder Rückfrage der Projektleitung.
- **Rapporte**: Liste mit Filter offen/abgeschlossen/alle, Suche, «Neuer Rapport» (zum Projekt, Service-Fall
  oder Wartungsvertrag). Die Akte ist ein Seitenpanel.
- **Zeiten**: Wochenblatt (Ist/Soll nach Pensum, Jahressaldo, Hinweise nach Arbeitsgesetz, Woche bestätigen),
  Zeiten je Person erfassen oder korrigieren, prüfen, Lohn-Export (CSV).
  Jede Zeit hat genau ein Ziel: Projekt, Service-Fall (auch über den Rapport) oder einen internen Posten aus
  `einstellungen.baustelle.interne_posten` (Lager, Fahrzeug, Weiterbildung). Der Trigger `intern.zeit_ziel` prüft das.
- **Nachträge**: Regie-Arbeiten mit Stand (offen, vom Kunden bestätigt, abgelehnt), Betrag (Recht `preise`).

## Daten

- Besitzt: `rapporte`, `zeiten`, `nachtraege`, `baustellen_meldungen`, `zeiten_wochen` (mit den Sichten
  `rapporte_liste`, `zeiten_liste`, `nachtraege_liste`, `baustellen_meldungen_liste`), Einstellungen
  `ibn_pruefpunkte` und `baustelle` (Schritte, Pflichtfotos, Sicherheit, Soll-Faustregel, Zeit-Regeln).
- Liest: `mein_tag` (Einsätze, Service-Fälle, Projekte, Objekte, Kontakte), `projekte`, `projekt_material`,
  `anlagen`, `artikel.datenblaetter` (Dossier), `dokumente` (Fotos, Unterschrift, Dossier), `personen`.
- Abläufe nur über Datenbank-Funktionen: `rapport_speichern`, `rapport_abschliessen`, `rapport_oeffnen`,
  `zeit_starten`, `zeit_stoppen`, `zeit_speichern`, `zeiten_pruefen`, `zeiten_exportieren`,
  `nachtrag_speichern`, `nachtrag_status`, `zeit_team_starten`, `zeit_team_stoppen`, `meldung_erfassen`,
  `meldung_erledigen`, `rapport_visieren`, `baustelle_soll_setzen`, `zeiten_woche_bestaetigen`. Lesen:
  `baustellen_infos`, `baustellen_mappe`, `baustellen_heute`, `baustellen_liste`, `baustelle_akte`,
  `zeiten_wochenblatt`, `baustelle_auswertung`.

## Ohne Netz

`services/warteschlange.ts` hält jede Änderung in IndexedDB (`dimension-baustelle`) und sendet sie, sobald Netz
da ist. Kommt während des Sendens ein neuer Auftrag dazu, geht er im selben Lauf mit (nicht erst im 30-Sekunden-Takt).
`services/monteur.ts` ändert dazu die Kopie am Handy, damit die Ansicht sofort stimmt. Lesen geht über
`mitAblage`: Solange etwas wartet oder kein Netz da ist, gilt die Kopie am Handy. Neue Handy-Abläufe brauchen
eine ID vom Handy und eine wiederholbare Datenbank-Funktion.

## Abhängigkeiten

- `src/services/supabase.ts`, `meldungen.ts`, `fehler.ts`, `fachfehler.ts`
- `src/components/shared/`: `Datentabelle`, `Filterchips`, `AkteAbschnitt`, `Unterschriftfeld`, `MailDialog` (Dossier-Mail über den Ausgangskorb), `Seitenkopf`, `Zustaende`
- `pdf-lib` (erst beim Erstellen eines PDFs geladen)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine (der Service-Fall bekommt den Rapport über die Datenbank in seinen Verlauf)

## Ordner

- `components/` – Seite, Mein Tag, Rapport-Akte und ihre Abschnitte, Listen und Dialoge
- `hooks/` – `useBaustelle` (Abfragen mit Kopie am Handy), `useAktion`
- `services/` – `baustelle` (Büro), `monteur` (Handy, über die Warteschlange), `warteschlange`, `speicher`,
  `pdf`, `rapportPdf`, `dossier`
- `lib/` – Zeit, Netzfehler, Links (Navigation, Telefon), Lohn-Export, Bild verkleinern (mit Tests)
- `types.ts`, `schema.ts`, `index.ts`
