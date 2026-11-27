# 0061 – Werkvertrag aus der Offerte, Auftragsbestätigung und Kundenziele (27.11.2026)

## Ausgangslage

Beim Batterie-Auftrag eines Kunden (November 2026) passte der Werkvertrag nicht genau zur unterschriebenen Offerte:
Optionen standen als «optional» im Vertrag, obwohl der Kunde sie nicht bestellt hatte, die Ziele des Kunden
(Solarstrom abends nutzen, Auto mit Überschuss laden) standen nirgends, und der Termin las sich wie «ein Einsatz».
Chris wollte die Lehren daraus fest im CRM haben.

## Entscheid

- **Dokument 1:1 aus der Offerte:** Die Positionen kommen aus `offerten.stueckliste` (Eturnity). Feste Positionen
  und angekreuzte Optionen (`angaben.gewaehlt`, nach Bezeichnung) sind der bestellte Umfang; nur nicht bestellte
  Optionen erscheinen im Abschnitt «Nicht bestellte Optionen». Ohne Stückliste bleibt der bisherige Text.
- **Werkvertrag bleibt Standard** (Chris, 27.11.2026: «Immer Werkvertrag wie heute»). Die **Auftragsbestätigung**
  (`angaben.art = 'auftragsbestaetigung'`) wird pro Auftrag gewählt: gleicher Inhalt, eigener Titel, ohne
  Unterschriftsfeld des Kunden, AGB als Bestandteil der unterschriebenen Offerte. Kein Einstellungs-Standard dafür.
- **Kundenziele / vereinbarte Funktionen** (`angaben.ziele`): Vorlagen als Schlüssel (`lib/ziele.ts`, im Dokument in
  der Vertragssprache) oder freier Text. Immer als Funktion, nie als garantierter Prozentwert; das Dokument hängt den
  Hinweis selbst an. Dazu `angaben.bemerkungen` (Bemerkungen des Kunden) und der Montagetermin (`beginn`).
- **Nie «ein Einsatz»:** Der Termin-Hinweis sagt immer, dass Montage, Anschluss durch den Elektriker und
  Inbetriebnahme an verschiedenen Tagen stattfinden können.
- **Prüfliste vor dem Versand:** Positionen = unterschriebene Offerte, Kundenziele, Montagetermin und Sprache müssen
  abgehakt sein, bevor «Mail vorbereiten» geht. Fehlt ein Wert, steht ein Hinweis dabei; bewusst ohne geht.
- **Stand des Auftrags** in der Akte: Offerte unterschrieben → Dokument versendet → (Werkvertrag unterschrieben) →
  Anzahlung bezahlt → Montage → Inbetriebnahme → Schlussrechnung. Nur Anzeige, gerechnet aus Vertrag, Zahlungsplan und
  Fahrplan des Projekts (`services/auftragsdaten.ts`); nichts wird dafür von Hand gesetzt.
- `intern.werkvertrag_angaben` lässt die neuen Schlüssel durch (Migration `werkvertrag_auftragsbestaetigung`).

## Offen

- **Rechtlich prüfen lassen:** Ob eine vom Kunden unterschriebene Offerte mit AGB allein schon als Werkvertrag
  (Art. 363 ff. OR) genügt und die Auftragsbestätigung damit reicht, ist nicht juristisch geklärt. Bis dahin bleibt
  der unterschriebene Werkvertrag der Standard.
