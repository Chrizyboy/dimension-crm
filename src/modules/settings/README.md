# Modul: Einstellungen (`settings`)

**Zweck:** Benutzer, Rollen und Rechte verwalten, das eigene Konto pflegen und die Verbindungen zu Microsoft 365, AbaNinja und SMS einrichten und prüfen.

**Stand:** Phase 4 gebaut (Benutzer, Rollen, Mein Konto), Phase 8: Reiter «Verbindungen» und Microsoft in «Mein Konto». Phase 16: Reiter «Datensicherung» und «Betrieb», Karte «Diese App» (Version, Updates, Autostart) in «Mein Konto».

## Daten

- liest und schreibt `personen`, `rollen`, `rollen_rechte` (über die Funktionen aus Phase 4), `einstellungen` (Abschnitte `microsoft`, `sms`, `abaninja`)
- liest `integrationen`, `integrations_protokoll`, `zeitplan_laeufe()`, Microsoft-Verbindungen ohne Token über `meine_microsoft_verbindung()` und `microsoft_verbindungen()`
- Phase 16: `sicherungen` und Bucket `sicherungen` (nur lesen; erstellen und wiederherstellen über die Edge Function `sicherung`), `einstellungen.sicherung` (Zeiten, Aufbewahrung, SharePoint-Ordner), `betrieb_stand()`
- Details: Entscheide 0012, 0016 und 0027, `docs/anmeldung.md`, `docs/integrationen.md`

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`
- `src/services/integrationen.ts` (Verbinden, Testen, Stand der Dienste, Datensicherung)
- `src/services/aktualisierung.ts`, `src/stores/aktualisierung.ts` (Updates und Autostart der Desktop-App)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Benutzerverwaltung (Reiter Benutzer, Rollen, Verbindungen, Datensicherung, Betrieb), Mein Konto mit `MicrosoftKarte` und `AppKarte`, `Verbindungen*`, `Datensicherung`, `WiederherstellenDialog`, `Betrieb`
- `lib/` – `sicherung.ts` (nächster Termin, Inhalt, Grösse), `betrieb.ts` (Prüfpunkte grün/gelb/rot)
- `hooks/` – `useBenutzer`, `useVerbindungen`, `useSicherungen`
- `services/` – `benutzer.ts`, `verbindungen.ts`, `sicherung.ts`
- `types.ts`, `schema.ts`, `index.ts`
