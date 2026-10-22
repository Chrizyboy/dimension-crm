# 0019 – Einkauf: Materialliste je Projekt, Bestellung mit Freigabe und PDF, Lager nur in Bulle

**Kontext:** V233 hatte für den Einkauf nur die Zahlungen an Lieferanten (Finanzen, Phase 10); bestellt wurde
per Telefon, Webshop oder Mail ausserhalb der App. Die ERP-Analyse (Entscheid 0009, von Chris am 21.10.2026
freigegeben) verlangt: Bestellvorschlag aus der Stückliste, Bestellung als Mail mit PDF nach Freigabe,
Liefertermin, Wareneingang und ein einfaches Lager. Eigenes Lager nur in Bulle, Lagerorte bleiben Daten.
Phase 9a wurde von Chris am 22.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Materialliste je Projekt** (`projekt_material`): Vorschlag aus der Kalkulation der Offerte (ohne
  Dienstleistungen), sonst aus den Offert-Angaben (Module, Wechselrichter, Batterie; der ähnlichste Artikel
  wird vorgeschlagen und muss geprüft werden). Eine echte Eturnity-Stückliste gibt es nicht (Eturnity hat keine
  Abfrage-Schnittstelle, siehe docs/eturnity.md); kommt sie später per Webhook, füllt sie dieselbe Tabelle.
- **Bestellvorschlag:** Was fehlt, wird zuerst aus dem freien Lager am Standort des Projekts reserviert (heute nur
  Bulle). Der Rest wird zum Entwurf beim Lieferanten mit Preis (bevorzugter Lieferant, sonst der günstigste).
  Zeilen ohne Artikel oder ohne Lieferant meldet der Vorschlag, bestellt sie aber nicht. Projekte in Muri
  bekommen keine Reservierung aus Bulle von selbst und werden direkt auf die Baustelle geliefert; von Hand lässt
  sich Bulle-Ware trotzdem reservieren.
- **Freigabe und Versand getrennt (Regel 6):** Ein Entwurf wird freigegeben (Recht `preise`), danach sind die
  Positionen fest. Die Bestell-Mail entsteht nur für freigegebene Bestellungen (Datenbank prüft) und geht über
  den Ausgangskorb; ist sie gesendet, setzt die Datenbank die Bestellung auf «bestellt». Für Telefon und
  Webshop gibt es «Ohne Mail bestellt».
- **PDF im Browser mit `pdf-lib`** statt Druckdialog: Die Mail braucht eine echte Datei als Anhang, ohne dass
  jemand zuerst «Als PDF sichern» wählen muss. Die Bibliothek wird erst beim Erstellen geladen. Das PDF steht in
  der Sprache des Lieferanten, mit der bestellenden Firma (die des Lagers, sonst die des Projekt-Standorts) und
  wird bei den Dokumenten der Bestellung abgelegt. Preise stehen nicht im PDF (der Lieferant hat seine eigenen).
- **Wareneingang** mit Teillieferungen. Ware ans Lager erhöht den Bestand und wird für das Projekt reserviert;
  Ware auf die Baustelle zählt direkt beim Projekt. Jede Veränderung ist eine Lagerbewegung.
- **Lager:** Bestand, reserviert, frei, unterwegs (nur Bestellungen fürs Lager selbst) und Mindestmenge.
  «Nachbestellen» legt Entwürfe für alles unter der Mindestmenge an. Buchungen nur über `lager_buchen`
  (Eingang, Entnahme, Korrektur, Inventur, Reservierung, Freigabe); der Bestand fällt nie unter die
  Reservierungen.
- **Fahrplan-Schritt «Material»** folgt der Materialliste: alles da = erledigt («an Lager»), etwas bestellt oder
  reserviert = in Arbeit. Ohne Materialliste bleibt er von Hand.
- **Rechte:** Bestellungen und Positionen nur mit Recht `preise` (Einkaufspreise), wie `lieferantenpreise`.
  Materialliste und Lager sehen alle (die Monteure brauchen sie in Phase 9b).

**Folgen:** Lokal gibt es Preise fast nur von Krannich (229 von 254); Vorschläge gehen deshalb meist dorthin, bis
die Preise der anderen Lieferanten erfasst sind. Die Bestell-Adressen der vier Lieferanten fehlen noch und
werden unter «Lieferanten» eingetragen. Ein Lieferanten-Webshop oder EDI ist nicht Teil dieser Phase.
