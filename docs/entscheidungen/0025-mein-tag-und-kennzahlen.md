# 0025 – Mein Tag und Kennzahlen: eine Abfrage pro Seite, jede Zahl mit ihren Einträgen

**Kontext:** V233 hatte «Heute» (Begrüssung, Termine heute und morgen, Aufgaben mit Abhaken und «+ Aufgabe»,
Offerten nachfassen, Wiedervorlagen, Bewilligungen und Fristen, Zahlungen in 7 Tagen, Aftersales, Service und
Kontrollen, «Übersicht per Mail an mich», Knopf zum Dashboard) und ein «Dashboard» (Zeitraum Monat, Quartal, Jahr,
12 Monate, alles; Firma beide, Muri, Bulle; fünf Kacheln; grosse Tabelle nach Standort und nach Person; Diagramm
«Gesendete Offerten»; Lead-Quellen mit änderbaren Kosten pro Lead; jede Zahl mit Drill-down). Der Bau-Auftrag ergänzt
«Für mich / Von mir vergeben» und die offene Pipeline pro Region, die ERP-Lückenanalyse (0009) Auftragsbestand,
Auslastung und Marge je Projekt. Phase 14 wurde von Chris am 24.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Startseite = «Mein Tag».** Die leere Adresse führt auf `#/today`. Systemstatus und Bauplan liegen eingeklappt
  unten, nur für die Administration. Die Karten der Bereiche (Projekte, Service, Wartung, Einkauf, Baustelle,
  Finanzen, Spesen), das KI-Briefing und die Ausschreibungen bleiben als «Team und Betrieb»; die Startseite in
  `src/layouts/` setzt sie zusammen, weil Module sich nicht gegenseitig importieren.
- **Eine Abfrage für «Mein Tag»:** `heute_fuer_mich()` (security invoker) liefert alle Listen mit Gesamtzahl und
  höchstens 20–30 Zeilen. Was niemandem zugeteilt ist, sieht zusätzlich die Administration (wie V233); neue Leads
  ohne Zuständige sieht auch, wer am selben Standort arbeitet. Zahlungen nur im eigenen Projekt oder mit Recht
  `finanzen`. Leere Karten bleiben weg, damit Monteure nicht Verkaufslisten sehen.
- **Aufgaben «von mir vergeben»:** `aufgaben.erstellt_von` = ich, `person_id` ≠ ich. Gleicher Filter im Bereich
  Aufgaben (`#/tasks?wer=vergeben`).
- **Übersicht per Mail** geht über den Ausgangskorb (Regel 6): Der Text steht vor dem Senden im Dialog, der Klick
  auf «An mich senden» ist die Freigabe.
- **Kennzahlen als Detail-Zeilen:** `kennzahlen_fakten(von, bis)` gibt jede gezählte Sache als Zeile zurück
  (Schlüssel, Standort, Person, Betrag, Quelle, Name, Nummer). Die App zählt, summiert und filtert daraus; ein Klick
  zeigt genau diese Zeilen mit Total. So stimmen Zahl und Liste immer überein, und neue Zeilen in der Tabelle
  brauchen keine neue Abfrage. Gezählt wird mit den Rechten der Person (RLS).
- **Abschlussquote** = angenommen von allen entschiedenen Offerten (angenommen + verloren/archiviert) im Zeitraum.
  Auftragswert = Vertragswert des Projekts, sonst Offertbetrag plus MWST (`mwst_satz()`).
- **Lead-Quellen:** Kosten pro Lead in `einstellungen.kennzahlen.quellen_kosten_rappen`, ändern darf jede Person
  (wie V233) über `kennzahlen_quellen_kosten`; die Kosten aus V233 (`vorlage.kosten`) wurden übernommen.
- **Betrieb:** `kennzahlen_betrieb(von, bis)`: Auftragsbestand (Projekte «auftrag» und «im Bau»: Vertrag minus
  verrechnet), Auslastung (8 Wochen, Rollen aus `einstellungen.kennzahlen.auslastung_rollen` und alle mit Einsatz;
  5 Tage pro Woche minus Abwesenheiten), Marge je Projekt aus der Nachkalkulation nur mit Recht `preise` oder
  `finanzen`.
- **Diagramm** mit zwei geprüften Farben (`reihe-1` Muri, `reihe-2` Bulle; Farbsehschwäche und Kontrast in Hell und
  Dunkel geprüft), Legende, Hover-Zahl und «Als Tabelle».

**Folgen:** Neue Kennzahl = neuer Schlüssel in `kennzahlen_fakten` und eine Zeile in `GRUPPEN`
(`src/modules/dashboard/lib/auswertung.ts`). Viele alte importierte Projekte stehen noch auf «Auftrag»; der
Auftragsbestand zeigt nur Projekte mit Rest > 0.
