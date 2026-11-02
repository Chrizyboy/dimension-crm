# 0039 – Assistent: Fragen ans CRM, Aufträge, Dokumente, Verlauf (2.11.2026)

## Ausgangslage

Chris: Das CRM fühle sich «nur nach Fassade an», jedes Modul soll seinen Zweck ganz erfüllen. Der «KI-Assistent»
war ein Tagesbriefing mit zwei Knöpfen (freier Text, Mail lesen), dazu Kosten, Schreibstil und Einstellungen. Die
übrigen KI-Funktionen sitzen in den Akten. Das Ziel des Projekts: Die KI arbeitet im Hintergrund, die Software wirkt
eigenständig.

## Entscheid

- **Name «Assistent»** (FR «Assistant»), Pfad bleibt `#/ai`.
- **Fragen ans CRM:** Die KI schreibt nie SQL. Sie wählt aus einem festen Katalog (`_shared/ki_fragen.ts`: Tabellen,
  Felder, Vergleiche, dazu Kunde/Ort/Person über Fremdschlüssel). Der Server baut daraus REST-Abfragen und führt sie
  mit dem **Login der Person** aus (RLS, nur lesen, höchstens 4 Abfragen à 50 Zeilen). Zwei Aufrufe: Planung
  (`frage_plan`, schnell) und Antwort (`frage`, standard).
- **Tabellen zeigen echte Werte:** Die KI wählt nur, welche Abfrage und welche Spalten gezeigt werden; Zahlen in der
  Tabelle kommen aus der Datenbank, nicht aus dem KI-Text.
- **Vorschläge** (Aufgabe, Mail-Entwurf, Öffnen) zeigen nur auf Datensätze aus den gelesenen Daten und werden erst nach
  dem Klick übernommen; Mails gehen wie bisher über Schreibfenster und Ausgangskorb (Regel 6).
- **Verlauf:** `ki_gespraeche`, nur die Person selbst sieht ihre Gespräche (auch die Administration nicht). Älter als
  90 Tage → Papierkorb, sobald die Person ein neues beginnt.
- **Aufträge:** `ki_vorlagen`, Art «frage» oder «text», je Rolle. Firmen-Aufträge pflegt die Administration, eigene
  jede Person.
- **Dokument lesen** (`dokument`, schnell): Art, Angaben mit Sicherheit, passende Projekte/Offerten/Kunden (mit den
  Rechten der Person). Übernehmen von Hand (Akte öffnen, Aufgabe, kopieren).
- **Im CRM:** alle KI-Funktionen mit Ort, Aufrufen und Kosten des Monats; die Administration schaltet jede einzeln
  aus (`einstellungen.ki.aus`, geprüft in `kiAufruf`).
- **Überall mit Ctrl J** (und Knopf oben): Fenster mit dem offenen Datensatz aus der Adresse als Bezug.

## Folgen

- Migration `20261110005300_assistent.sql`, Test `supabase/tests/assistent.test.sql`.
- Edge Function `ki` neu veröffentlichen (`npx supabase functions deploy ki`).
- Neue Tabellen im Katalog: Eintrag in `KATALOG` (Felder und Fremdschlüssel), sonst nichts.
