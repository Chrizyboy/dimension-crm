# Modul: Baustelle & Rapporte

**Zweck:** Die Handy-Ansicht für Monteure und die Büro-Sicht dazu: Tagesplan, ein Rapport für alles (Montage,
Service, Wartung, IBN) mit Arbeiten, Mehrmaterial, Fotos, Prüfpunkten, Nachträgen und Unterschrift des Kunden,
Zeiterfassung mit Start/Stopp und Lohn-Export, Anlagedossier. Funktioniert auch ohne Netz.

Freigegeben von Chris am 21.10.2026 (ERP-Lückenanalyse, https://claude.ai/artifact/Q54YPWZzgtFQSSS6PHUnmq),
gebaut in Phase **9b**, Entscheid 0020.

## Reiter (`#/fieldwork?reiter=…&rapport=…`)

- **Mein Tag** (`tag`): Einsätze und Service-Termine der angemeldeten Person für heute und die nächsten Tage,
  mit Navigation, Anruf, Team, Elektriker, laufender Zeit und «Rapport beginnen» / «IBN-Protokoll».
- **Rapporte**: Liste mit Filter offen/abgeschlossen/alle, Suche, «Neuer Rapport» (zum Projekt, Service-Fall
  oder Wartungsvertrag). Die Akte ist ein Seitenpanel.
- **Zeiten**: Woche je Person, Zeit erfassen oder korrigieren, prüfen, Lohn-Export (CSV).
- **Nachträge**: Regie-Arbeiten mit Stand (offen, vom Kunden bestätigt, abgelehnt), Betrag (Recht `preise`).

## Daten

- Besitzt: `rapporte`, `zeiten`, `nachtraege` (mit den Sichten `rapporte_liste`, `zeiten_liste`,
  `nachtraege_liste`), Einstellung `ibn_pruefpunkte`.
- Liest: `mein_tag` (Einsätze, Service-Fälle, Projekte, Objekte, Kontakte), `projekte`, `projekt_material`,
  `anlagen`, `artikel.datenblaetter` (Dossier), `dokumente` (Fotos, Unterschrift, Dossier), `personen`.
- Abläufe nur über Datenbank-Funktionen: `rapport_speichern`, `rapport_abschliessen`, `rapport_oeffnen`,
  `zeit_starten`, `zeit_stoppen`, `zeit_speichern`, `zeiten_pruefen`, `zeiten_exportieren`,
  `nachtrag_speichern`, `nachtrag_status`.

## Ohne Netz

`services/warteschlange.ts` hält jede Änderung in IndexedDB (`dimension-baustelle`) und sendet sie, sobald Netz
da ist. `services/monteur.ts` ändert dazu die Kopie am Handy, damit die Ansicht sofort stimmt. Lesen geht über
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
