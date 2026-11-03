# 0049 Adressbuch nur für Geschäftspartner, mit Rollen, ElCom-Verzeichnis und UID-Register

Datum: 03.11.2026 · Entscheid von Chris (vier Pop-up-Karten im Thread «Adressbuch vollständig machen», alle A)

## Ausgangslage

Das Adressbuch war eine zweite Kundenliste mit einem Filter nach Kontaktart. Für die Rollen, die es wirklich
brauchen (Innendienst bei Netzgesuchen, Projektleitung mit Subunternehmern, Einkauf mit Lieferanten, Verkauf mit
Vermittlern), zeigte es nichts ausser Name, Telefon und Mail.

## Entscheid

1. **Nur Geschäftspartner** (Karte 1). Kunden bleiben im Bereich Kunden; im Adressbuch zeigt der Schalter
   «Auch Kunden zeigen» sie dazu, ein Klick öffnet die Kundenakte. Der Papierkorb zeigt weiter alle Kontakte.
2. **ElCom-Verzeichnis laden** (Karte 2): Netzbetreiber je Gemeinde aus den offenen Daten der ElCom (LINDAS),
   Gemeinde je PLZ aus geo.admin.ch. Neue Gebäude bekommen ihren Netzbetreiber automatisch, wenn genau einer passt.
3. **UID-Register** (Karte 3): «Neuer Eintrag» schlägt die Firma mit UID, Rechtsform und Adresse vor.
4. **Provision für Vermittler** (Karte 4): Prozent vom Auftrag exkl. MWST, vorgemerkt bei Unterschrift; ist die
   Schlussrechnung bezahlt, bekommt die Buchhaltung die Aufgabe «Provision auszahlen».

## Umsetzung

- Rollen pro Kontakt in `kontakt_rollen` (mehrere je Firma), Felder je Rolle als Daten in `auswahlwerte`
  `partnerrolle` (Regel 8), Werte in `kontakt_rollen.angaben`. Lieferant und Subunternehmer verbinden sich per
  Trigger `intern.partnerrolle_verbinden` mit `lieferanten`/`subunternehmer` (gleiche Firma, nichts doppelt).
- Postadresse, UID, Webseite in `partner_angaben`; Nachweise mit Ablauf in `partner_nachweise` (Arten als
  Auswahlliste `partnernachweis`); Bewertung 1–5 auf `subunternehmer_auftraege`.
- Liste aus Sicht `adressbuch_uebersicht` (eine Zeile je Partner, «Das Wichtigste» je Rolle), Akte als ganze Seite
  aus `partner_akte()` in einer Abfrage, Doppelte über `partner_dubletten()`.
- Netz: `netzbetreiber_gemeinden`, `plz_gemeinden` (Nachschlagetabellen, ersetzt beim Einlesen), `netzbetreiber_fuer`,
  Trigger auf `objekte`, `netzbetreiber_zuordnen`. Einlesen nur Administration über die Edge Function `adressbuch`
  in Schritten (Verzeichnis, PLZ, Zuordnen). Von Hand Eingetragenes bleibt.
- Provision: Trigger `intern.provision_bei_vertrag` (vor der Kunden-Gutschrift) und
  `intern.provision_bei_schlusszahlung`. Fristen: `partner_fristen_melden` im Zeitplan (stündlich, 30 Tage Vorlauf
  aus `einstellungen.adressbuch`).
- UID-Register (SOAP, öffentlich) und LINDAS/geo.admin nur in der Edge Function, ersetzbar über `UID_URL`,
  `LINDAS_URL`, `GEO_ADMIN_URL`. In der Cloud-Sandbox gesperrt, also erst im Betrieb geprüft.

## Folgen

- Kontakte mit Kontaktart Partner, Architekt, Elektriker, Lieferant oder Behörde wurden beim Einspielen zu Rollen.
- Zusammenführen von Kontakten (Bereich Kunden) muss die neuen Tabellen mit umhängen.
