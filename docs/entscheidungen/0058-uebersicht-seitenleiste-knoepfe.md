# 0058 – Übersichtlicher: Seitenleiste in kleinen Gruppen, Knöpfe mit «Mehr», Filter ohne Nullen (4.11.2026)

## Ausgangslage

Chris: «Mach die UX besser, ich finde alles zu unübersichtlich.» Bestandsaufnahme mit dem Probe-Import vom 4.11. auf
einem Laptop-Bildschirm (1536 × 864, Windows mit 125 % Zoom):

- Die Seitenleiste hat 28 Bereiche in 5 Gruppen. Ab «Rechnungen» ist der Rest (Service, Finanzen, Spesen, Team,
  Automationen, Einstellungen, Handbuch, Assistent) nur mit Scrollen sichtbar.
- Jede Seite stapelt Titel, einen erklärenden Satz (oft zweizeilig), bis 5 Knöpfe, bis 8 Reiter, bis 7 Zahl-Kacheln,
  Suche und bis 9 Filter, bevor der Inhalt beginnt. Viele Filter und Kacheln zeigen «0».
- Akten haben bis 11 Knöpfe in einer Reihe (Offerte), die auf zwei Zeilen umbrechen.

Am 31.10. lehnte Chris eine helle Leiste und das Kürzen der Menüpunkte ab («nur sinnvoll umordnen»). Darum bleibt
jeder Bereich in der Leiste und jeder Knopf in der App; geändert wird nur Ordnung und was sofort sichtbar ist.

## Entscheid

- **Seitenleiste in acht kleinen Gruppen nach Arbeitsschritt:** Übersicht (Mein Tag, Posteingang, Aufgaben,
  Ausgangskorb, Kennzahlen) · Kontakte (Kunden, Adressbuch) · Verkauf (Anfragen & Leads, Offerten, Werkverträge,
  Preise) · Akquise (Ausschreibungen, Grossprojekte, Marketing) · Abwicklung (Projekte & Montage, Baustelle &
  Rapporte, Einkauf & Material, Service & Garantie, Wartungsverträge) · Finanzen (Rechnungen, Finanzen, Spesen) ·
  Betrieb (Team & Ausweise, Fahrzeuge & Geräte, Automationen, Einstellungen) · Hilfe (Handbuch, Assistent).
- **Gruppen klappen auf und zu** (Klick auf den Namen). Ohne eigene Wahl offen: «Übersicht» und die Gruppe des
  offenen Bereichs; dazu die Gruppen der eigenen Rolle (Verkauf: Kontakte + Verkauf, Innendienst: Kontakte + Abwicklung, Projektleitung/Montage: Abwicklung, Buchhaltung: Finanzen); wer höchstens 16 Bereiche sieht, hat alles offen. Die eigene Wahl bleibt im Gerät (`useUi.gruppenOffen`). Eine zugeklappte Gruppe zeigt den offenen
  Bereich trotzdem. Eingeklappte Leiste (nur Icons) und Befehlspalette zeigen weiterhin alle Bereiche.
- **Knopfleiste am PC höchstens 4 Elemente** (`KNOEPFE_AM_PC`): bis 4 Knöpfe stehen alle da, bei mehr die
  Hauptaktion, die zwei vorderen und «Mehr» für den Rest. Reihenfolge der Knöpfe bestimmt, was offen bleibt: häufige nach vorn.
- **Filterchips ohne Treffer bleiben weg**, solange sie nicht gewählt sind (nicht bei «nur einer zugleich»).
- **Beschreibung im Seitenkopf hinter dem «i»** neben dem Titel statt als eigene Zeile.

## Folgen

- Neue Module wählen eine der acht Gruppen (`npm run modul:neu`, Standard `hilfe`).
- In Knopfleisten die seltenen Knöpfe nach hinten stellen, sie landen unter «Mehr».
- Noch offen, Sache der Modul-Threads nach Chris' Antwort: Zahl-Kacheln mit 0 ausblenden, leere Karten auf «Mein Tag»
  zu einer Zeile zusammenfassen, Reiter je Bereich auf höchstens 5–6 (z. B. «Firmen & Einstellungen» in Rechnungen
  gehört nach Einstellungen).

## Runde 2 (4.11.2026, Empfehlung, Karte offen)

- **`Kennzahlleiste`** (gemeinsam, `src/components/shared/`): die erste Kachel (Gesamtzahl) steht immer, die übrigen
  nur, wenn sie nicht 0 oder gewählt sind. Projekte und Service nutzen sie.
- **Leere Karte «Kunden warten auf Antwort»** auf «Mein Tag» wird zu einer schmalen Zeile.
- **`Seitenkopf zeile`**: kurze Zeile, die sichtbar bleibt (Datum und was ansteht auf «Mein Tag»); `beschreibung`
  bleibt hinter dem «i».
- **Reiter höchstens sechs** (`REITER_HOECHSTENS` in `src/components/ui/reiter.tsx`): Bei mehr stehen die vorderen
  fünf und der gewählte da, der Rest unter «Mehr ▾» (Menü neben der Liste, weil eine `tablist` nur Reiter enthalten
  darf). Gilt automatisch für jede `ReiterListe`; Ansichten als Adresse (Verkauf, Offerten) nutzen `teileReiter` und
  `ReiterMehr`. Browser-Tests wählen Reiter mit `waehleReiter` aus `e2e/hilfen.ts`.
- **Leere Felder erst beim Bearbeiten** (`LeereFelder` in `src/components/shared/AkteAbschnitt.tsx`): gefüllte
  Angaben stehen da, leere klappen mit «+ n weitere Angaben» auf. Zuerst in Lead-Akte (Auswahlfelder unter
  «Interesse») und Offert-Akte («Chance und Angaben»).
