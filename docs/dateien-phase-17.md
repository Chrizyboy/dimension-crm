# Dateien aus Phase 17 – in einfachen Worten

## Datenbank

- **`supabase/migrations/20261108000100_fahrzeuge_geraete.sql`** – Tabellen `fahrzeuge`, `geraete`, `ressourcen_eintraege`, Auswahllisten (Geräte-Arten, Eintrag-Arten), Einstellung `ressourcen`, Funktionen «Eintrag erfassen» und «Übergeben».
- **`supabase/migrations/20261108000200_personal.sql`** – Tabellen `qualifikationen` und `personal_akten` (privat), Auswahlliste Kurse und Ausweise, privater Speicher `personal`, Sicht `fristen` und die Erinnerung `fristen_melden`.
- **`supabase/tests/ressourcen.test.sql`** – 34 Prüfungen: Fristen, Kilometer, Zustand, Übergabe, Rechte auf Ausweise und Akte, Erinnerung einmal pro Frist.
- **`supabase/functions/zeitplan/index.ts`** – Ruft die Erinnerung jede Stunde auf.

## Fahrzeuge & Geräte (`src/modules/fleet/`)

- **`components/Fuhrpark.tsx`** – Die Seite mit den Reitern Fahrzeuge, Geräte, Fristen.
- **`FahrzeugListe.tsx`**, **`GeraeteListe.tsx`**, **`FristenListe.tsx`**, **`fahrzeugSpalten.tsx`**, **`geraetSpalten.tsx`** – Die Listen mit Filtern.
- **`FahrzeugAkte.tsx`**, **`GeraetAkte.tsx`**, **`Verlauf.tsx`**, **`FristBadge.tsx`** – Akte als Seitenpanel mit Fristen und Verlauf.
- **`FahrzeugDialog.tsx`**, **`GeraetDialog.tsx`**, **`EintragDialog.tsx`**, **`UebergebenDialog.tsx`** – Anlegen, ändern, Eintrag erfassen, übergeben.
- **`HeuteKarte.tsx`** – Karte «Fristen» auf Mein Tag.
- **`lib/fristen.ts`** (+ Test) – Rechnet «vorbei / bald / später».
- **`services/ressourcen.ts`**, **`hooks/`** – Laden und Speichern.

## Team & Ausweise (`src/modules/staff/`)

- **`components/Team.tsx`**, **`Matrix.tsx`**, **`ZellenBadge.tsx`** – Übersicht «wer darf was».
- **`PersonAkte.tsx`**, **`AusweisDialog.tsx`**, **`AkteDialog.tsx`** – Person mit Ausweisen und Personal-Akte.
- **`lib/matrix.ts`** (+ Test) – Welcher Ausweis gilt, was fehlt, Vorschlag «gültig bis».
- **`services/personal.ts`**, **`hooks/`** – Laden, Speichern, Dateien.

## Übrige

- **`src/app/fleet.tsx`**, **`src/app/staff.tsx`** – Adressen `#/fleet` und `#/staff`.
- **`src/lib/navigation.ts`**, **`src/components/shared/ModulIcon.tsx`**, **`src/layouts/Startseite.tsx`** – Seitenleiste, Icons, Karte auf Mein Tag.
- **`src/i18n/de.json`**, **`fr.json`** – Texte `fuhrpark.*`, `team.*` und die Fehlertexte `fachfehler.ressourcen_*`.
- **`e2e/ressourcen.spec.ts`** – Browser-Test: Fahrzeug, Gerät am Handy, Team und Akte.
- **`docs/entscheidungen/0028-fahrzeuge-geraete-personal.md`** – Der Entscheid.
