# 0035 – Zeitplan der Baustellen neu (1.11.2026)

## Ausgangslage

Der Zeitplan (Reiter «Zeitplan» unter Projekte & Montage) zeigte 16 Wochen auf einmal, jede Baustelle im Bau als
Zeile (auch ohne Einsatz), schmale Balken mit «–» und am Handy dasselbe Raster zum seitlichen Wischen. Chris:
«gefällt mir so irgendwie noch nicht, optimiere ihn maximal, für Desktop und Mobile».

## Entscheid

- **PC:** Raster mit zwei Sichten: **Baustellen** (je Standort) und **Team** (je Monteur, Abwesenheiten
  schraffiert, Subunternehmer unten). Zeitraum **2 Wochen / 6 Wochen (Standard) / Quartal**, bis 6 Wochen mit
  jedem Tag im Kopf. Nur Baustellen mit Einsatz im Zeitraum stehen im Raster; Baustellen ohne Termin stehen rechts
  unter **«Zu planen»** (ein Klick öffnet die Planung mit einem ersten Einsatz).
- **Ziehen:** Balken ziehen verschiebt den Einsatz tagesgenau, am rechten Rand ändert es das Ende. Gespeichert
  über die bestehende Funktion `projekt_zeitplan_speichern` (keine neue Migration), danach «Rückgängig» in der
  Meldung. Fertige Baustellen lassen sich nicht ziehen (sonst würde die Anlage erneut angelegt).
- **Konflikte** (abwesend oder am selben Tag doppelt eingeplant) werden einmal in `lib/zeitplanAnsicht.ts`
  berechnet und überall gleich rot gezeigt, mit Grund («LB abwesend», «MK doppelt eingeplant»).
- **Handy:** kein Raster, sondern eine Woche als Liste nach Tagen (Karte je Baustelle mit Team und «Tag 2/3»),
  Filter nach Person und Standort, «Zu planen» zum Aufklappen. Am Wochenende zeigt es schon die nächste Woche.
- Klick auf eine leere Stelle einer Baustelle plant dort einen neuen Einsatz. Tasten ← → und T.

## Folgen

- Keine Änderung an der Datenbank. Drucken (A4 quer) folgt der gewählten Sicht.
- `useSchmal()` (`src/hooks/`) unterscheidet Handy/PC, damit nicht beide Darstellungen im DOM liegen.
