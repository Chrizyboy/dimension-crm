# Dateien aus Phase 4 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261023000100_anmeldung_rollen.sql`** – Die Tabelle `rollen` mit sieben Startrollen (Administration, Verkauf, Innendienst, Projektleitung, Montage, Buchhaltung, Noch zuordnen). Rechte kommen jetzt aus Rolle plus Zusatzrechten der Person. E-Mails werden immer klein gespeichert.
- **`…0200_anmeldung_konto.sql`** – Alles rund ums Konto: nur Admins ändern Personen und Rollen, die letzte Admin-Person bleibt, nur erfasste Personen bekommen ein Login, das Konto wird bei der ersten Anmeldung mit der Person verknüpft. Dazu `meine_anmeldung()` (wer bin ich, was darf ich) und `aendere_mein_konto()` (nur eigene Profilfelder). Das Änderungsprotokoll verrät keine Daten mehr, die man sonst nicht sehen darf.
- **`supabase/templates/anmeldecode.html`, `einladung.html`** – Die zweisprachigen Mails mit dem Anmeldecode und der Einladung.
- **`supabase/functions/einladen/index.ts`** – Server-Funktion für «Person einladen». Sie prüft, ob die aufrufende Person Admin ist, legt die Person an und schickt die Einladung. Den geheimen Schlüssel sieht nur der Server.
- **`supabase/config.toml`** – Code 10 Minuten gültig, Mail-Vorlagen, Anmelde-Hook, Microsoft vorbereitet (ausgeschaltet, bis die App-Registrierung da ist).
- **`supabase/seed.sql`** – Drei erfundene Testpersonen (Admin, Verkauf, Buchhaltung), keine echten Daten.
- **`supabase/tests/anmeldung.test.sql`** – 16 Prüfungen: fremde Adressen abgewiesen, Montage sieht keine Finanzen, niemand befördert sich selbst, die letzte Admin-Person bleibt.

## App

- **`src/services/anmeldung.ts`** – Code anfordern, Code prüfen, Microsoft-Anmeldung, Abmelden. Fehler von Supabase werden in verständliche Gründe übersetzt.
- **`src/stores/anmeldung.ts`** – Merkt sich, wer angemeldet ist, und lädt die eigenen Rechte nach jeder Anmeldung.
- **`src/types/anmeldung.ts`** – Die Form von «wer bin ich» und die möglichen Anmeldezustände.
- **`src/lib/rechte.ts`** – Zwei kleine Regeln: hat jemand ein Recht, darf jemand einen Bereich sehen.
- **`src/hooks/useSichtbareModule.ts`** – Liefert nur die Bereiche, die man sehen darf. Seitenleiste, Handy-Leiste, Befehlspalette und Startseite nutzen ihn.
- **`src/layouts/AnmeldeTor.tsx`** – Steht vor der ganzen App: zeigt Ladebild, Anmeldeseite oder «kein Zugang» und übernimmt Sprache und Darstellung der Person.
- **`src/layouts/Anmeldeseite.tsx`** – Die Anmeldeseite: Microsoft-Knopf (falls eingerichtet), sonst E-Mail und danach der 6-stellige Code.
- **`src/layouts/KeinZugriff.tsx`** – Freundliche Seite, wenn man eine Adresse aufruft, die man nicht sehen darf.
- **`src/app/konto.tsx`, `src/app/settings.tsx`** – Die Seiten «Mein Konto» und «Einstellungen» (nur Administration).
- **`src/modules/settings/`** – Benutzerverwaltung mit den Reitern Personen und Rollen, Einladen, Person bearbeiten, Rolle bearbeiten und «Mein Konto» mit den Profilfeldern aus V233.

## Tests und Werkzeuge

- **`e2e/anmeldung.spec.ts`** – Browser-Test mit echter lokaler Datenbank: liest den Code aus Mailpit und prüft, dass Verkauf und Buchhaltung nur ihre Bereiche sehen.
- **`playwright.config.ts`, `.github/workflows/ci.yml`** – Ein zweiter App-Build mit Datenbank für diesen Test, auch in GitHub.
- **`scripts/import/umwandeln.mjs`** – Übersetzt die alten Register-Rechte aus V233 in Bereiche des neuen CRM.
- **`docs/anmeldung.md`** – Schritt für Schritt: Microsoft, Hook, Mails und SMTP im echten Betrieb einrichten.
