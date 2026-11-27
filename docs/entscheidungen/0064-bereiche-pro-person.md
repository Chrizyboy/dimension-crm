# 0064 – Bereiche pro Person, alles nur für die Administration

Stand: 27.11.2026

## Ausgangslage

Chris (27.11.2026): «man muss einfach individuell einstellen können, wer was sehen kann. Loris und Chris sehen alles,
rest muss von uns freigegeben werden.» Bisher sah mit dem Zusatz «gl» jede Person alle Bereiche, und wer weder eigene
Häkchen noch eine Rolle mit Bereichen hatte (Rolle «Mitarbeit»), sah ebenfalls alles.

## Entscheid

- Alle Bereiche sieht nur, wer das Recht «admin» hat (Rolle «Gesamtzugriff» oder Zusatz Administration: Chris, Loris).
  `darfModul` in `src/lib/rechte.ts`, gleich in `wirksameBereiche` (`src/modules/settings/lib/sichtbareBereiche.ts`).
- Alle anderen, auch die Geschäftsleitung, sehen nur die freigegebenen Bereiche: eigene Häkchen an der Person, sonst
  die der Rolle. Ohne beides nur, was `immer` gilt (Mein Tag, Aufgaben, Zeiterfassung, Team, Handbuch).
- «gl» bleibt ein Recht (Finanzen, Preise, Marge … in den freigegebenen Bereichen), öffnet aber keine Bereiche mehr.
- Freigeben unter Einstellungen › Personen › **Bereiche je Person** (Häkchen-Tabelle, wie die Nutzerverwaltung V234).
- Startwerte (Pop-up 27.11.2026 «Wie die Rolle vom 2.11.»): Migration `bereiche_pro_person` trägt die Rollen im
  Geschäft vom 2.11.2026 ein, nur wo noch «Mitarbeit» steht: Andy und José Projektleitung, Filipe Verkauf, Erich
  Buchhaltung, Davis Innendienst (seine eigene Auswahl bleibt).

## Folgen

Daten schützt weiter die Datenbank (RLS, Rechte); die Bereiche steuern nur, was in der Seitenleiste, auf Mein Tag und in
der Suche erscheint.
