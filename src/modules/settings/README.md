# Modul: Einstellungen (`settings`)

**Zweck:** Benutzer, Rollen und Rechte verwalten, das eigene Konto pflegen und die Verbindungen zu Microsoft 365, AbaNinja und SMS einrichten und prüfen.

**Stand:** 03.11.2026 Einstellungen an einem Ort (Entscheid 0048): Bereiche mit Suche, dazu Auswahllisten, Standorte & Regionen, Änderungsprotokoll, Papierkorb und die Bereiche der Module. Vorher: Phase 4 gebaut (Benutzer, Rollen, Mein Konto), Phase 8: Reiter «Verbindungen» und Microsoft in «Mein Konto». Phase 16: Reiter «Datensicherung» und «Betrieb», Karte «Diese App» (Version, Updates, Autostart) in «Mein Konto».

## Daten

- liest und schreibt `personen`, `rollen`, `rollen_rechte` (über die Funktionen aus Phase 4), `einstellungen` (Abschnitte `microsoft`, `sms`, `abaninja`)
- liest `integrationen`, `integrations_protokoll`, `zeitplan_laeufe()`, Microsoft-Verbindungen ohne Token über `meine_microsoft_verbindung()` und `microsoft_verbindungen()`
- Phase 16: `sicherungen` und Bucket `sicherungen` (nur lesen; erstellen und wiederherstellen über die Edge Function `sicherung`), `einstellungen.sicherung` (Zeiten, Aufbewahrung, SharePoint-Ordner), `betrieb_stand()`
- Details: Entscheide 0012, 0016 und 0027, `docs/anmeldung.md`, `docs/integrationen.md`

- 0048: `auswahlwerte`, `regionen`, `standorte` (ändern nur Admin), `aenderungsprotokoll` (lesen), `papierkorb()`, `papierkorb_wiederherstellen()`, `region_fuer_plz()`

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`
- `src/services/integrationen.ts` (Verbinden, Testen, Stand der Dienste, Datensicherung)
- `src/services/aktualisierung.ts`, `src/stores/aktualisierung.ts` (Updates und Autostart der Desktop-App)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `bereiche.ts` – Bereiche dieses Moduls; Bereiche anderer Module kommen über deren `einstellungen` (Route `src/app/settings.tsx`)
- `components/` – `Einstellungen` (Rahmen mit Gruppen und Suche), `Personen`, `Rollen`, `Auswahllisten`, `Regionen`, `Protokoll`, `Papierkorb`, `ZustaendigkeitenBereich`, Mein Konto mit `MicrosoftKarte` und `AppKarte`, `Verbindungen*`, `Datensicherung`, `WiederherstellenDialog`, `Betrieb`
- `lib/` – `bereiche.ts` (Suche, Gruppen), `auswahllisten.ts`, `regionen.ts` (PLZ-Regeln lesen/schreiben), `protokoll.ts`, `sicherung.ts` (nächster Termin, Inhalt, Grösse), `betrieb.ts` (Prüfpunkte grün/gelb/rot)
- `hooks/` – `useBenutzer`, `useVerbindungen`, `useSicherungen`
- `services/` – `stammdaten.ts` (Auswahllisten, Regionen, Standorte, Protokoll, Papierkorb), `benutzer.ts`, `verbindungen.ts`, `sicherung.ts`
- `types.ts`, `schema.ts`, `index.ts`
