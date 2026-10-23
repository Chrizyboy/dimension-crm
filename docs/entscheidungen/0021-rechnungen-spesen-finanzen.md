# 0021 – Rechnungen, Spesen und Finanzen: Regeln in der Datenbank, QR-Rechnung aus AbaNinja, Liquidität wie V233

**Kontext:** V233 hatte Rechnungen aus Zahlungsplänen (geplant, gestellt, überfällig, bezahlt), PDF, Mahnungen
Stufe 1–3, «Liste exportieren», AbaNinja (Liste, Entwurf, Zahlung), Firmenangaben je Standort, Spesen mit Beleg
und Mail an die Buchhaltung sowie die Liquiditätsplanung «Finanzen» (Wochenvorschau, Zahlungen mit Dringlichkeit
bis «Betreibung droht», Material je Baustelle, Fixkosten, erwartete Eingänge, Kontostand, Zahllauf). Die
ERP-Analyse (Entscheid 0009, freigegeben 21.10.2026) verlangt dazu Schlussrechnung mit Nachträgen,
Service-Rechnung, Lieferantenrechnungen je Projekt aus AbaNinja und Nachkalkulation. Buchhaltung, Lohn und MWST
bleiben in AbaNinja. Phase 10 wurde von Chris am 22.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Eine Tabelle `rechnungen`** für alle Arten (Anzahlung, Teilzahlung, Schluss, Service, Wartung, frei) mit
  Positionen als Liste. Nummer R2026-n, Fälligkeit (Datum + Zahlungsfrist der Firma), «fest nach dem Stellen»,
  Summen, Zahlungsstand, Mahnstufen und Storno setzt die Datenbank (`rechnung_*`). Die App ruft nur auf.
- **Entwurf aus der Quelle:** Tranche des Zahlungsplans (erste = Anzahlung, letzte = Schluss mit bestätigten
  Nachträgen), Service-Rapport (Stunden auf Viertelstunden × Stundensatz, Material zum Verkaufspreis, nicht bei
  Garantie, Kulanz oder Vertrag), Wartungsvertrag, Projekt mit Prozent oder Rest, frei. Beim Stellen bekommt die
  Tranche die Rechnungsnummer und die Nachträge werden «verrechnet»; beim Storno werden sie wieder frei.
- **QR-Rechnung normal aus AbaNinja:** «An AbaNinja» übergibt die gestellte Rechnung als Entwurf; versendet wird
  dort. Ohne AbaNinja erzeugt das CRM ein eigenes PDF mit Swiss-QR-Zahlteil (SPC 0200, geprüft durch Einlesen
  des QR-Codes) und schickt es per Mail über den Ausgangskorb (Regel 6). Mahnungen ebenso: erst Vorschau,
  eigene Mahnfrist (Standard 10 Tage), Fälligkeit bleibt.
- **Abgleich mit AbaNinja:** Die Server-Funktion liest, die App wendet mit dem eigenen Login an
  (`abaninja_abgleich_anwenden`): Zahlungen als Differenz zum offenen Betrag, Lieferantenrechnungen als Zahlungen
  in den Finanzen, mit Projekt, wenn die Projektnummer in der Referenz steht. Löschen und Bezahlen in AbaNinja
  selbst, weil die API dafür nichts Verlässliches bietet.
- **Firmenangaben** (IBAN, Bank, Zahlungsfrist, MWST-Nr.) ändern nur Personen mit Recht `finanzen`.
- **Spesen** gehören der Person, die sie erfasst; «Alle» sieht nur die Buchhaltung. Beleg als Foto (verkleinert)
  oder PDF in der Ablage. Storno mit Grund statt Löschen, ausbezahlt (am, von) nur Buchhaltung, danach fest.
  Mail an die Buchhaltung mit Liste und Belegen über den Ausgangskorb. Kategorien als Daten. Das Lesen des Belegs
  durch die KI kommt mit Phase 13.
- **Liquidität wie V233**, aber als geprüfte Rechnung in der App (`lib/vorschau.ts`, mit Tests): Woche 0 enthält
  Überfälliges und alles ohne Datum; Fixkosten erscheinen je Termin, bis sie als Zahlung erfasst sind; Material
  ohne Datum = Bautermin minus Vorlauf; Eingänge aus offenen Rechnungen («wahrscheinlich») und Tranchen ohne
  Rechnung («unsicher»), anpassbar nur für die Vorschau. Drei Szenarien. Kontostand eingetragen, heute =
  eingetragen minus seither bezahlt plus seither eingegangen. Löhne verdeckt, bis man sie zeigt.
- **Nachkalkulation** in der Datenbank (`nachkalkulation`): Umsatz (Vertrag + Nachträge), Material aus
  Lieferantenrechnungen, sonst Bestellungen, sonst Finanzen-Material, Arbeit = Stunden × interner Stundensatz.

**Folgen:** Die Zahlen der Finanzen stammen aus dem Excel-Import (V233) und sind als «ungeprüft» markiert, bis
sie jemand speichert. Bankbuchungen direkt aus dem E-Banking (V233 hatte einen Anfang über AbaNinja) kommen erst,
wenn ein Zugang feststeht; bis dahin wird der Kontostand von Hand eingetragen. Echte Konten (AbaNinja) sind in
der Cloud-Sandbox gesperrt; geprüft wird gegen Ersatz-Server (`npm run integrationen:pruefen`).
