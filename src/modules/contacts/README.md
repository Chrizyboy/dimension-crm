# Modul: Adressbuch

**Zweck:** Alle Personen und Firmen an einem Ort, auch Partner, Architekt:innen, Elektriker:innen, Lieferanten und Behörden, gefiltert nach Art. Hier liegt auch der Papierkorb für Kontakte.

**Stand:** Phase 5 gebaut.

## Daten

- liest: `kunden_uebersicht` (über `src/services/kontakte.ts`), `auswahlwerte` (`kontaktart`)

## Abhängigkeiten

- `src/hooks/useKontakte.ts`, `src/components/shared/Datentabelle.tsx`, `Filterchips.tsx`
- Die Akte und der Kontakt-Dialog kommen aus dem Modul «Kunden»; die Route `src/app/contacts.tsx` setzt sie zusammen (Module importieren sich nie gegenseitig).

## Ereignisse

- keine

## Export (index.ts)

- `Adressbuch` – die Seite mit Liste, Filter nach Art und Papierkorb
