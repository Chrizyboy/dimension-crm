# 0045 – «Mein Tag» ausbauen: handeln statt nur anzeigen (2.11.2026)

## Ausgangslage

Chris: das CRM fühle sich «nur nach Fassade an». «Mein Tag» zeigte Listen, man konnte aber ausser Aufgaben
abhaken nichts direkt erledigen, und jede Rolle sah fast dasselbe. Neuentwurf als Vorschau
(https://claude.ai/artifact/BcCoWDcVAQ3LDGEzedXP1e), danach Fragen M1–M7.

## Entscheid

- **M1 B:** Die Karten nach Bereich bleiben (keine gemischte Einheitsliste), bekommen aber Knöpfe und Gründe.
- **M2 A, Verschieben:** jede Zeile ausser Terminen und Freigaben auf morgen, nächste Woche (Montag) oder ein
  Datum (`tag_verschieben`). Eigene Aufgaben bekommen ein neues Fälligkeitsdatum. Alles andere (Nachfassen,
  Anfrage, Wiedervorlage, Frist, Zahlung, Fall, Kontrolle) wird nur für die Person bis zum Datum ausgeblendet
  (`tag_verschoben`); die Stand-Regeln im Verkauf (`setze_stand`) bleiben unberührt.
- **Gründe:** «seit 14 Tagen ohne Antwort» (Nachfassen), «Anfrage seit 2 Tagen offen», «Von Andy» (Aufgabe).
- **Wartet auf deine Freigabe:** eigene Mails/SMS/Briefe im Ausgangskorb (Status «wartet»).
- **M3 A, Wochenziele je Person** in `einstellungen.kennzahlen.ziele_personen` (Neue Anfragen, Besichtigungen, Offerten pro
  Woche; Aufträge pro Monat), gezählt aus `kennzahlen_fakten`, damit Zahl und Kennzahlen übereinstimmen. Setzen nur
  Administration oder Recht «finanzen» (`intern.darf_ziele_setzen`, Trigger `ziele_schuetzen`); wenn die Rolle
  Geschäftsleitung kommt, dort ergänzen.
- **M4 A, Team heute** für alle (`team_heute`, läuft als Besitzer): Baustelle, beim Kunden, Service, da oder
  abwesend, nie mit Grund der Abwesenheit oder Betreff aus dem Kalender.
- **M6 B:** Übersicht per Mail bleibt auf Knopfdruck.
- **M5 A, Wetter** für Montage und Projektleitung, Quelle **M7 B MeteoSwiss Open Data** (gratis, ohne Schlüssel,
  lokale Prognose je Postleitzahl auf data.geo.admin.ch, STAC-Sammlung `ch.meteoschweiz.ogd-local-forecasting`).
  Der Zeitplan (Job `wetter`, stündlich) holt nur die Tageswerte für die PLZ der Einsätze der nächsten Tage und
  der Standorte (`wetter_plz`) und speichert sie in `wetter_prognose` (`wetter_speichern`, nur Server). Die App
  liest `wetter_baustellen()`: meine Einsätze (Team oder Projektleitung) je Tag mit Prognose und «Achtung».
  Parameter-Codes, Anzahl Tage und Schwellen (Regen, Wind, Frost, Hitze) in `einstellungen.wetter` (nur
  Administration), damit ein geänderter Code von MeteoSwiss ohne neue Version passt. Quelle wird auf der Karte
  genannt (Bedingung von MeteoSwiss). In der Cloud-Sandbox ist data.geo.admin.ch gesperrt; der Abruf ist mit
  Ersatz-Daten getestet (`_shared/wetter.test.ts`), der echte Abruf zeigt sich nach dem Hochladen unter
  Einstellungen › Betrieb beim Job «wetter».
