# Modul: Service & Garantie

**Zweck:** Erfasst Störungen, Reklamationen, Garantiefälle und Kontrollen nach dem Bau und hält die Daten jeder gebauten Anlage fest.

**Stand:** gebaut in Phase **9** (V233: Service V49). Entscheid: `docs/entscheidungen/0018-projekte-service-wartung.md`.

## So läuft es

1. «Neuer Fall»: Kunde wählen, Anlage (falls vorhanden), worum es geht, Kategorie, Priorität, Zuständig, Termin, Garantie. Die Nummer S001 … vergibt die Datenbank.
2. In der Akte Stand, Priorität und Termin direkt ändern, Notizen in den Verlauf, Fotos und Rapporte als Anhänge, «Aufgabe erstellen» für die Aufgabenliste, «Erledigt».
3. Reiter «Anlagen»: IBN, Garantie, nächste Kontrolle, Monitoring und Komponenten mit Seriennummer. Anlagen entstehen mit der IBN im Projekt.

## Daten

- Besitzt: `service_faelle`, `anlagen`.
- Schreibt: `aufgaben` (Bezug `service_faelle`), `dokumente` und Speicher `dokumente/service/<fall>/…`.
- Liest: `kontakte`, `objekte`, `projekte`, `personen`, `auswahlwerte` (Kategorie, Priorität, Stand, Komponenten).
- Abläufe: `service_notiz`; Nummer und Erledigt-Datum setzt ein Trigger.

## Abhängigkeiten

- `src/services/supabase.ts`, `src/services/kontakte.ts` (über `KundeWahl`), `src/services/dokumente.ts`, `src/services/fachfehler.ts`, `src/services/meldungen.ts`.

## Ereignisse

- **sendet:** keine.
- **hört auf:** keine.

## Ordner

- `components/` – Seite, Fall-Liste, Fall-Akte, Dialoge, Anlagen, Startseiten-Karte
- `hooks/`, `services/`, `lib/` (Fälligkeit), `types.ts`, `schema.ts`, `index.ts`
