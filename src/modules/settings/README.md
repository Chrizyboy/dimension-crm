# Modul: Einstellungen (`settings`)

**Zweck:** Benutzer, Rollen und Rechte verwalten, das eigene Konto pflegen und die Verbindungen zu Microsoft 365, AbaNinja und SMS einrichten und prüfen.

**Stand:** Phase 4 gebaut (Benutzer, Rollen, Mein Konto), Phase 8: Reiter «Verbindungen» und Microsoft in «Mein Konto».

## Daten

- liest und schreibt `personen`, `rollen`, `rollen_rechte` (über die Funktionen aus Phase 4), `einstellungen` (Abschnitte `microsoft`, `sms`, `abaninja`)
- liest `integrationen`, `integrations_protokoll`, `zeitplan_laeufe()`, Microsoft-Verbindungen ohne Token über `meine_microsoft_verbindung()` und `microsoft_verbindungen()`
- Details: Entscheide 0012 und 0016, `docs/anmeldung.md`, `docs/integrationen.md`

## Abhängigkeiten

- `src/services/supabase`, `meldungen`, `fehler`, `fachfehler`
- `src/services/integrationen.ts` (Verbinden, Testen, Stand der Dienste)

## Ereignisse

- **sendet:** keine
- **hört auf:** keine

## Ordner

- `components/` – Benutzerverwaltung (Reiter Benutzer, Rollen, Verbindungen), Mein Konto mit `MicrosoftKarte`, `Verbindungen*`
- `hooks/` – `useBenutzer`, `useVerbindungen`
- `services/` – `benutzer.ts`, `verbindungen.ts`
- `types.ts`, `schema.ts`, `index.ts`
