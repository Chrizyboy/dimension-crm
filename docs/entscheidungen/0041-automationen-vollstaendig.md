# 0041 Automationen vollständig: Schutz für Kunden, Sicht für alle Rollen

Datum: 02.11.2026 · Entscheid von Chris (Pop-up-Karten im Thread «Automationen vollständig machen»)

## Ausgangslage

Die Automationen (Phase 12, Entscheid 0023) liefen, aber nur die Administration sah, was sie tun. Mitarbeitende
wussten nicht, woher eine Aufgabe kommt, und konnten eine Erinnerung an einen Kunden nicht anhalten, wenn dieser
schon angerufen hatte. Mails konnten am Sonntagabend in den Ausgangskorb kommen und ein Kunde mehrere Nachrichten
am selben Tag bekommen.

## Entscheid

1. **Alles bauen** (Karte 1): Übersicht, Geplant, Probelauf, Editor-Ausbau, Schutz für Kunden, Sicht der
   Mitarbeitenden und vier neue Auslöser (Lead ohne Kontakt, Jahrestag der Anlage, Rechnung bezahlt, Garantie läuft ab).
2. **Versandfenster Mo–Fr 08:00–18:00** (Karte 2), Feiertage zählen nicht als Arbeitstage. Kontakt-Pause 3 Tage:
   höchstens eine automatische Nachricht pro Kunde in dieser Zeit (Zahlungserinnerungen ausgenommen). Je Automation
   «jederzeit» oder eine eigene Pause möglich.
3. **Stoppen für einen Fall** dürfen die zuständige Person, die Geschäftsleitung und die Administration (Karte 3),
   immer mit Grund. Der Grund steht als Notiz in der Zeitachse des Kunden.

## Umsetzung

- Motor in der Datenbank (`intern.automation_lauf_weiter`): Versandfenster, Kontakt-Pause, Warten in Arbeitstagen,
  «Prüfen» mit `sonst: ueberspringen`, Ersatz-Aufgabe ohne Adresse, neue Aktionen `wiedervorlage` und `notiz`.
- Steuern: `automation_lauf_stoppen/fortsetzen/verschieben/jetzt`, `automation_schritt_wiederholen` (nur Admin),
  Rechte in `intern.automation_darf_lauf`.
- Lesen: `automation_geplant`, `automation_warum`, `automation_uebersicht`, `automation_kennzahlen`,
  `automation_aenderungen`, `automation_probelauf` (rechnet ohne anzulegen oder zu senden).
- Neue Auslöser in `intern.automationen_durchsehen_ausbau` und `automation_katalog_ausbau` (getrennt von den
  Funktionen, die PR #45 neu fasst, damit sich beide nicht überschreiben).
- Oberfläche: Reiter Übersicht (Start), Automationen (nach Bereich), Geplant, Protokoll, Einstellungen mit
  Schutzregeln. Gemeinsame Bausteine `src/components/shared/automatik/` (Automatisch geplant, Warum?, Stopp-Dialog)
  und Dienst `src/services/automatik.ts` für Lead-, Offert- und Projekt-Akte sowie Aufgaben.

## Folgen

- Neue Nachrichten-Aktion: im Motor vor dem Versand durch Fenster und Pause schicken (Liste in `lauf_weiter`).
- Kürzel (z. B. «LP») kommen aus dem Thread «Einstellungen vollständig machen», nicht von hier.
