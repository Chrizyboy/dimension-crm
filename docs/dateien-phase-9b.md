# Dateien aus Phase 9b – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261031000100_baustelle_grundlagen.sql`** – Rapporte bekommen Nummern R0001 …, eine Art (Montage, Service, Wartung, IBN), Prüfpunkte, Verrechnung und «Montage fertig». Zeiten bekommen Art (Arbeit, Reise), Prüfung und Notiz; jede Person sieht nur ihre eigenen, exportierte sind fest. Nachträge bekommen Nummern N001 …, Stunden, Material und Unterschrift, auch ohne Projekt an einem Service-Rapport. Neue Tabelle `garantiefaelle`. Prüfpunkte der IBN als Einstellung. Sichten für Rapporte, Zeiten und Nachträge.
- **`…0200_baustelle_ablaeufe.sql`** – «Mein Tag» für das Handy, Rapport speichern und abschliessen (mit allen Folgen: Nachträge bestätigt, Zeit gestoppt, Baustelle zur IBN, Anlage angelegt, Projekt abgeschlossen, Service-Verlauf), wieder öffnen, Zeiten starten, stoppen, erfassen, prüfen und exportieren, Nachträge erfassen und bewerten. Alles lässt sich gefahrlos zweimal senden (wichtig ohne Netz).
- **`supabase/tests/baustelle.test.sql`** – 39 Prüfungen: Nummern, Rechte, eine laufende Zeit, Abschluss und seine Folgen, fester Rapport, Prüfpunkte zusammenführen, Service ohne Projekt, Verrechnung Pflicht, Zeiten prüfen und exportieren, Garantiefall.
- **`supabase/seed.sql`** – Testmonteur `montage@test.local` (Mario Montage).

## Modul «Baustelle & Rapporte» (`src/modules/fieldwork/`)

- **`components/Baustelle.tsx`**, **`Netzstand.tsx`** – Die Seite mit vier Reitern und der Anzeige «Ohne Netz» / «3 Einträge warten» / abgelehnte Einträge (auch im Rapport).
- **`components/MeinTag.tsx`**, **`TagKarte.tsx`**, **`ZeitLaeuft.tsx`** – Tagesplan am Handy: Baustellen und Service-Termine mit Navigation, Anruf, Team, Elektriker; laufende Zeit mit Stopp und Pause.
- **`components/RapportAkte.tsx`** mit **`RapportZeit`**, **`ArbeitenAbschnitt`**, **`FotoAbschnitt`**, **`PruefAbschnitt`**, **`NachtragAbschnitt`**, **`VerrechnungWahl`** – Der Rapport: Zeit, Arbeiten und Mehrmaterial, Fotos mit der Handykamera, IBN-Prüfpunkte, Nachträge, Verrechnung.
- **`components/AbschlussDialog.tsx`** – Abschliessen mit Unterschrift des Kunden (oder Grund ohne), «Montage fertig», «Fall erledigt».
- **`components/RapportPdfKnopf.tsx`**, **`DossierDialog.tsx`** – Rapport bzw. IBN-Protokoll als PDF; Anlagedossier erstellen, beim Projekt ablegen und per Mail (Ausgangskorb) senden.
- **`components/RapportListe.tsx`**, **`rapportSpalten.tsx`**, **`NeuerRapportDialog.tsx`** – Liste im Büro und neuer Rapport.
- **`components/Zeiten.tsx`**, **`ZeitDialog.tsx`** – Zeiten je Woche und Person, erfassen, prüfen, Lohn-Export.
- **`components/Nachtraege.tsx`**, **`NachtragDialog.tsx`** – Nachträge mit Stand und Betrag.
- **`components/HeuteKarte.tsx`** – Karte «Baustelle» auf der Startseite.
- **`services/warteschlange.ts`**, **`speicher.ts`**, **`monteur.ts`** – Ohne Netz: Änderungen am Handy merken und später senden.
- **`services/baustelle.ts`**, **`pdf.ts`**, **`rapportPdf.ts`**, **`dossier.ts`** – Laden im Büro und PDFs.
- **`hooks/`**, **`lib/`** (Zeit, Netzfehler, Links, Lohn-Export, Bild verkleinern, mit Tests), **`types.ts`**, **`schema.ts`**.

## Übrige Änderungen

- **`src/components/shared/Unterschriftfeld.tsx`** – Unterschrift mit Finger oder Maus, als Bild.
- **`src/modules/aftersales/`** – Abschnitt «Garantiefall beim Hersteller» im Service-Fall (`GarantieAbschnitt.tsx`, `services/garantie.ts`).
- **`src/app/fieldwork.tsx`** – Adresse `#/fieldwork?reiter=…&rapport=…`.
- **`src/layouts/Startseite.tsx`** – Karte «Baustelle». **`src/layouts/HandyNavigation.tsx`** – Baustelle in der Handy-Leiste.
- **`src/i18n/de.json`**, **`fr.json`** – Texte für Baustelle, Unterschrift, Garantiefall und Fehler.
- **`e2e/baustelle.spec.ts`**, **`playwright.config.ts`**, **`e2e/hilfen.ts`** – Browser-Test auf einem Pixel 7: Termin im Büro, Rapport am Handy mit Funkloch und Unterschrift, Zeit prüfen, Lohn-Export, Nachtrag bewerten, Garantiefall.
- **`docs/entscheidungen/0020-baustelle-am-handy.md`**, **`docs/datenmodell.md`**, **`CLAUDE.md`**, **`src/lib/bauplan.ts`**.
