# 0039 – Einkauf & Material vollständig

**Datum:** 02.11.2026 · **Stand:** angenommen (Chris: «jedes Modul einzeln muss seinen Zweck erfüllen»)

## Ausgangslage

Einkauf (Phase 9a, Entscheid 0019) konnte Bestellungen anlegen, freigeben, per Mail senden und den Wareneingang
buchen. Es fehlte, was der Einkauf im Alltag braucht: ein Blick, was heute zu tun ist; Bestellungen über mehrere
Baustellen bündeln; wissen, bis wann bestellt sein muss; die Auftragsbestätigung prüfen; die Lieferantenrechnung
abgleichen. Die Vorschau mit Beispieldaten (Leitstand, Materialplan, Bestellen, Bestell-Akte) lag Chris vor.

## Entscheid

1. **Leitstand** ist die Startansicht: jede Bestellung in ihrem Schritt (`bestellungen_liste.schritt`: freigabe,
   ab_offen, unterwegs, eingang, rechnung, fertig), dazu «zu bestellen» je Lieferant. Rot heisst: Montage in Gefahr
   (Ware kommt nach dem Baubeginn oder ist nicht bestellt).
2. **Bestellen je Lieferant:** `einkauf_bedarf` sammelt den Bedarf aller Projekte und des Lagers (unter
   Mindestmenge) mit dem günstigsten Lieferanten. `sammelbestellung()` reserviert zuerst Freies im Lager und legt
   den Rest in einen Entwurf je Lieferant und Lagerort, auf Verpackungseinheiten gerundet (Rest als Lagerposition).
3. **Bestellen bis** = Baubeginn − Lieferzeit (Preisliste, sonst Lieferant, sonst Einstellung) − Puffer, in
   Arbeitstagen. `materialplan` zeigt Deckung je Projekt.
4. **Freigabegrenze:** über `einkauf.freigabe_grenze_rappen` (Standard CHF 5'000) geben nur die Personen aus
   `einkauf.freigabe_durch` (Standard Andy) oder die Administration frei. Darunter gibt der Einkauf selbst frei.
   «Zur Freigabe vorlegen» schickt eine Glocke.
5. **Auftragsbestätigung:** Nummer, Termin, Total und je Position Menge und Preis (`bestellung_ab_erfassen`, gibt
   die Zahl der Abweichungen zurück). Die KI (Aktion `auftragsbestaetigung`, Stufe «schnell») liest Mailtext oder
   PDF vor; übernommen wird erst mit «Speichern». Der bestätigte Termin ersetzt den Liefertermin.
6. **Lieferung:** Tracking, Hinweis Anlieferung, Kontakt vor Ort, Lieferscheine (beim Wareneingang), «nachgefragt».
7. **Rechnungsabgleich:** passende Kreditoren aus AbaNinja (`bestellung_rechnungen`); geprüft mit
   `bestellung_rechnung`, das auch `kreditor_zahlungen.geprueft` setzt. Weicht der Betrag mehr als CHF 50 oder 1 %
   vom Erwarteten (inkl. MWST) ab, braucht es eine Notiz.
8. **Konditionen je Lieferant:** Fracht, frachtfrei ab, Mindestwert, Lieferzeit, Zahlungsziel, Skonto,
   Bestellschluss, Bestellweg (Mail, Webshop, Telefon). Kennzahlen (Einkauf 12 Monate, Pünktlichkeit, Lieferzeit)
   aus `lieferanten_kennzahlen`. EK-Änderungen merkt sich die Preisliste (`ek_vorher_rappen`).
9. **Glocke statt Mail:** `einkauf_melden()` läuft stündlich im Zeitplan (AB fehlt nach `ab_erinnern_tage`,
   Montage in Gefahr, «bestellen bis» erreicht), einmal pro Anlass (`intern.einkauf_gemeldet`).

Einstellung `einkauf` ändert nur die Administration (eigener Schutz-Trigger, Fehler `einkauf.kein_recht`).

## Folgen

- Bestellung geht weiterhin nur nach menschlicher Freigabe raus (Ausgangskorb), Regel 6 bleibt.
- Schritt 2 (Lagerplätze, Rüstliste, Rückgabe, Inventur, Handy-Wareneingang, Reklamationen) folgt separat.
- Test: `supabase/tests/einkauf_ausbau.test.sql`.
