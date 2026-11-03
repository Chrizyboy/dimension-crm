# 0041 – Team & Ausweise vollständig: Team, Kurse, Anforderungen

**Datum:** 02.11.2026 · **Entschieden von:** Chris (Fragen 1–6 als Karten; gebaut nach Empfehlung A, bis Chris
anders entscheidet)

## Ausgangslage

«Team & Ausweise» war eine Tabelle Person × Ausweis mit Seitenpanel. Es fehlte: wer gehört zum Team und ist heute wo,
wie plant man einen Kurs (wer bewilligt, was kostet er), was passiert nach dem Kurs, und wo stellt man ein, welche
Ausweise eine Rolle braucht (versteckt in einer Auswahlliste). Neuentwurf: https://claude.ai/artifact/3Bmxfevxm7NmsVBDBUtLnK

## Entscheid

- **Vier Reiter:** Team, Ausweise, Kurse, Anforderungen; Person als Seitenpanel mit Ausweisen, Kursen, Ausrüstung,
  Personal-Akte. Adresse `#/staff?reiter=…&person=…&kurs=…`.
- **Heute (4A):** `team_uebersicht()` liefert je Person Abwesenheit, Kurs, Montage-Einsatz oder Service-Termin. Alle
  sehen «abwesend bis …», den Grund nur die Person, Vorgesetzte und Recht «personal»/«finanzen».
- **Kurse (1A):** Mitarbeitende beantragen für sich (`kurs_speichern` setzt immer «beantragt»), Vorgesetzte
  bewilligen bis `einstellungen.team.bewilligung_grenze_rappen` (CHF 1'000.00), darüber Recht «personal».
  Glocke an die Bewilligenden, nach Bewilligung/Absage an die Betroffenen.
- **Kosten und Budget (2A):** Kosten je Kurs, Jahresbudget in `einstellungen.team.budget_rappen`. Kosten sehen nur
  Recht «personal»/«finanzen», Teilnehmende und ihre Vorgesetzten (`team_kurse()` lässt sie sonst weg).
- **Weiterbildungsvereinbarung (3A):** Betrag und «Bindung bis» am Kurs; offen ist linear abnehmend bis zum Ende,
  sichtbar im Panel der Person (Reiter Kurse).
- **Kurstag sperrt die Einsatzplanung:** angemeldet = je Person eine Abwesenheit «Weiterbildung» mit `kurs_id`
  (Trigger `kurs_abwesenheiten`, wandert bei Datumswechsel, Papierkorb statt Löschen). `wochenplan()` kennt sie.
- **Nach dem Kurs:** `kurs_besucht` trägt für alle, die dabei waren, den Ausweis mit «gültig bis» aus der Gültigkeit
  der Art ein (`qualifikationen.kurs_id`) und gibt die Aufgabe «Kursbestätigung hochladen».
- **Anforderungen:** Pflicht je Rolle und Gültigkeit über `ausweis_anforderung_speichern` (Administration oder Recht
  «personal»); neue Art = neue Zeile.

## Nachtrag 03.11.2026: Fragen 5 und 6 (Empfehlung A, Chris: «alle Threads fortsetzen»)

- **5 Pflicht je Tätigkeit als Warnung:** Tätigkeiten sind die Auswahlliste `taetigkeit` mit `ausweise`, `wer`
  («alle» = jede Person, «einer» = mindestens eine) und `immer` (gilt ohne Häkchen, z. B. Ersthelfer). Einsätze
  tragen `einsaetze.taetigkeiten`, gespeichert über `projekt_zeitplan_speichern` (neu mit `taetigkeiten`, fehlt der
  Schlüssel, bleibt der Wert). Die Lücke rechnet die App wie den Abwesenheits-Konflikt
  (`src/modules/projects/lib/ausweise.ts`): gelber Rahmen am Balken, Satz im Dialog. Keine Sperre. Pflicht ändern
  über `taetigkeit_anforderung_speichern` (Administration oder Recht «personal»), Reiter «Anforderungen».
- **6 Geburtstage und Dienstjubiläen:** `team_anlaesse()` liefert die nächsten `einstellungen.team.anlaesse.vorlauf_tage`
  (7) Tage, nur Tag und Monat, Jubiläum in vollen Jahren; 29. Februar fällt sonst auf den 28. Jede Person blendet
  sich über `team_anlass_zeigen` aus (`personen.profil.anlaesse_verbergen`). Karte «Geburtstage und Jubiläen» auf
  «Mein Tag» (`TeamHeute` aus `src/modules/staff`).
