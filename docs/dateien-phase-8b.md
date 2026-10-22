# Dateien aus Phase 8b – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261028000100_ausschreibungen_tabellen.sql`** – Das Dossier (`ausschreibungen`) bekommt Nummer (AS-2026-0001), Spur, Fristen, Bauherrschaft, Parzelle, Punkte und Grund. Neu: Kontakte pro Dossier (`ausschreibung_kontakte`, immer mit Quelle), Anschreiben (`anschreiben`), die zentrale Sperrliste (`kontaktsperren`) und die Läufe der Quellen (`quellen_laeufe`). Dazu die Regeln des Monitors in `einstellungen` (wer bewilligt, wer sendet, Kantone, Stichworte, Vorlagen, Signatur).
- **`…0200_ausschreibungen_einlesen.sql`** – Nimmt eine Meldung entgegen, bewertet sie mit Stichworten, berechnet die Fahrzeit ab Muri oder Bulle, wählt die Spur, erkennt Doppelte (gleiche Gemeinde und Parzelle oder ähnliche Bauherrschaft) und sperrt die Vergabestelle bis zum Zuschlag. `ausschreibung_erfassen` für das Erfassen von Hand.
- **`…0300_ausschreibungen_anschreiben.sql`** – Entwürfe aus den Vorlagen (DE/FR, AS-Nummer im Betreff, feste Signatur und Abmelde-Satz). Prüft Quelle, Sperrliste und «Privatperson nie per Mail». Bewilligen und Ablehnen.
- **`…0400_ausschreibungen_ablauf.sql`** – Senden: Mail in den Ausgangskorb, Brief zum Drucken, Anruf als Aufgabe. Erst jetzt entsteht der Lead («Angeschrieben», Wiedervorlage nach 5 Arbeitstagen). Antworten erkennt das CRM an der AS-Nummer; «keine Werbung» setzt den Absender auf die Sperrliste.
- **`…0500_ausschreibungen_entscheide.sql`** – Entscheide wie «Teilnehmen» (legt die Submissions-Offerte und drei Fristen im Kalender mit Erinnerungen 7 und 2 Tage vorher an), «Nicht teilnehmen», «Später», «Beobachten», «Eingereicht», «Zuschlag», «Absage».
- **`…0600_ausschreibungen_lauf.sql`** – Der tägliche Lauf (Beobachten wecken oder nach 6 Monaten archivieren, einmal nachfassen, an Bewilligen erinnern, stille Quellen melden), die Tageszahlen für Startseite und Glocke und der Trichter.
- **`supabase/tests/ausschreibungen.test.sql`** – 43 Prüfungen: Spuren, Doppelte, Sperren, wer bewilligen und senden darf, Lead erst beim Senden, Fristen, Nachfassen nur einmal.

## Server-Funktionen (`supabase/functions/`)

- **`ausschreibungen/`** – «Jetzt lesen» für simap oder das Amtsblatt.
- **`zeitplan/`** – neu drei Jobs: simap um 06:52, 12:00 und 17:00, Amtsblatt um 06:52 (Mo–Sa), täglicher Lauf.
- **`_shared/simap.ts`**, **`_shared/amtsblatt.ts`** – Lesen die öffentlichen Schnittstellen von simap.ch und amtsblattportal.ch (ohne Schlüssel) und machen daraus Meldungen.
- **`_shared/ausschreibungen.ts`** – Ein Lauf: Meldungen holen, einzeln einlesen, Ergebnis für die Quellen-Kontrolle festhalten (auch wenn die Quelle ausfällt).
- **`_shared/quellen.test.ts`** – 9 Tests mit erfundenen Beispielen im Aufbau der echten Quellen.

## Prüfen ohne echte Quellen

- **`scripts/ausschreibungen/pruefen.mjs`** (`npm run ausschreibungen:pruefen`) – Startet Ersatz-Server für simap und das Amtsblatt und spielt 16 Fälle durch: neue Meldungen, keine Doppelten, Zuschlag schaltet die Spur um, Ausfall einer Quelle wird festgehalten.

## Modul «Ausschreibungen» (`src/modules/tenders/`) – neu gebaut

- **`components/Ausschreibungen.tsx`** – Die Seite mit sechs Reitern: Prüfen, Bewilligen, Senden, Alle, Quellen, Trichter. Zahlen an den Reitern zeigen, was wartet.
- **`components/DossierListe.tsx`**, **`dossierSpalten.tsx`** – Liste der Dossiers (Priorität, Ort mit Fahrzeit, Spur und Stand, Frist, Quelle).
- **`components/DossierAkte.tsx`**, **`DossierAktionen.tsx`**, **`EntscheidDialog.tsx`**, **`DossierKontakte.tsx`**, **`KontaktDialog.tsx`** – Ein Dossier als Seitenpanel: Angaben, Fristen, Kontakte mit Anschreiben, Doppelte, Verlauf und die passenden Entscheid-Knöpfe.
- **`components/Freigabeliste.tsx`**, **`AnschreibenVorschau.tsx`**, **`BriefDruck.tsx`** – Bewilligen (Andy) und Senden (Chris) in Serie, mit Tastatur (↑/↓, X, B, A, S). Briefe werden vor dem Senden gedruckt.
- **`components/Quellen.tsx`**, **`Sperrliste.tsx`**, **`RegelnKarte.tsx`** – Quellen-Kontrolle mit «Jetzt lesen», Sperrliste, Regeln (nur Administration).
- **`components/Trichter.tsx`** – Gefunden → passend → bearbeitet → Antwort → Erfolg, je Quelle und Kanton.
- **`components/ErfassenDialog.tsx`** – Meldung von Hand erfassen (AG, LU, FR, VD, NE haben kein lesbares Portal).
- **`components/HeuteKarte.tsx`** – Karte auf der Startseite und einmal am Tag eine Meldung in der Glocke.
- **`services/ausschreibungen.ts`**, **`hooks/`**, **`lib/anzeige.ts`**, **`lib/entscheide.ts`**, **`schema.ts`**, **`types.ts`**.

## Übrige Änderungen

- **`src/app/tenders.tsx`** – Adresse `#/tenders?reiter=senden&dossier=…`.
- **`src/layouts/Startseite.tsx`** – zeigt die Karte «Ausschreibungen heute».
- **`e2e/ausschreibungen.spec.ts`** – Browser-Test: Baugesuch erfassen, Kontakt, bewilligen, senden; Sperrliste, Quellen, Trichter ohne Verstösse.
