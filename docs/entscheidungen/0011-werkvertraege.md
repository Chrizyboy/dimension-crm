# 0011 – Werkverträge als eigener Bereich

**Kontext:** Chris (21.10.2026): «Werkverträge fehlen». In V233 war der Werkvertrag nur ein Feld am Projekt (`werkvertrag {erstelltAm, status}`, `vertragLang`, `vertragStandort`, `unterzeichnetAm`), dazu PDFs im SharePoint-Ordner «werkvertrag».

**Entscheid:** Eigene Tabelle `werkvertraege` und eigener Bereich «Werkverträge» / «Contrats d’entreprise» unter Verkauf, direkt nach Offerten. Ein Werkvertrag hat:

- Nummer wie die Offerte
- Firma (GmbH Muri oder Sàrl Bulle) und Sprache
- Version und Vertragswert
- Zahlungskonditionen in Prozent (z. B. 50/30/20 oder 80/20), daraus entsteht der Zahlungsplan
- Status: Entwurf, erstellt, versendet, unterschrieben, storniert
- Unterschriftsdatum und PDF

Die Oberfläche kommt in Phase 7 mit den Offerten. Die digitale Unterschrift (Vorschlag Skribble) wird dort entschieden.

**Folgen:** Der Import legte 83 Werkverträge an: 71 unterschriebene (mit Datum) und 12 erstellte (nur PDF oder Entwurf), 12 davon mit verknüpftem PDF aus SharePoint. Die Firma bleibt leer, wo V233 keinen Standort hatte, statt sie zu raten. Der Versand an Kundinnen und Kunden braucht eine Freigabe (CLAUDE.md Regel 6).
