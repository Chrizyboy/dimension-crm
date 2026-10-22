# 0018 – Projekte: ein Fahrplan statt drei Listen, Bau mit Rückgängig, Service und Wartung

**Kontext:** In V233 gab es für ein Projekt drei getrennte Formulare: den Projekt-Ablauf (V108), die
Bewilligungen (V48) und die Checkliste Elektriker. Sie mussten von Hand abgeglichen werden. Die Bauplanung
(V126, V127, V134) setzte mehrere Felder auf einmal, ohne Weg zurück. Service (V49) und Wartungsverträge hatten
kaum Struktur. Phase 9 wurde von Chris am 22.10.2026 mit «weiter» gestartet; die ERP-Punkte stammen aus der
freigegebenen ERP-Analyse (Entscheid 0009).

**Entscheid:**

- **Ein Fahrplan je Projekt** aus der Ablauf-Vorlage des Produkts (Daten, Regel 8). Bewilligungen und die
  Checkliste Elektriker sind markierte Schritte darin, keine eigenen Listen. Die alten Häkchen der Vorlage
  werden gelesen, bis jemand den Schritt neu setzt.
- **Was sich aus Daten ergibt, setzt niemand von Hand:** Vertrag, Bautermin, Montage und IBN folgen aus Vertrag,
  Einsätzen und Baustellen-Status; Anzahlung und Schlussrechnung aus dem Zahlungsplan, sobald er Tranchen hat.
  Die Datenbank lehnt das Setzen ab (`projekt.schritt_automatisch`).
- **Bau übernehmen mit Rückgängig:** Vor jeder Übernahme, Rücknahme oder «schon gebaut» merkt sich das Projekt
  den Stand davor (`bau_vorher`). «Rückgängig» stellt ihn her; neu entstandene Einsätze, Schritte und Anlagen
  gehen in den Papierkorb (Regel 5). Liegt der Bautermin in der Vergangenheit, gilt die Anlage als gebaut.
- **Anlage entsteht mit der IBN** (Leistung und Komponenten aus der Offerte). Service und Wartung hängen an der
  Anlage bzw. am Kunden.
- **Abwesenheiten aus Outlook** kommen nur als Zeitraum in die Planung, nie mit Betreff (Datenschutz).
- **Gesuche (TAG, Gemeinde, Förderung)** sind vorausgefüllte Datenblätter zum Beilegen oder Abschreiben, kein
  Nachbau der amtlichen Formulare, die sich je Netzbetreiber und Gemeinde unterscheiden.
- **Wartung:** Leistungskatalog als Einstellung, beim Abschluss in den Vertrag kopiert (spätere Änderungen am
  Katalog ändern keine bestehenden Verträge). «Wartung erledigt» setzt die nächste nach Rhythmus.
- **PDF über den Druckdialog** (A4 quer für den Zeitplan, A4 hoch für Vertrag und Gesuche), wie bei Offerte und
  Werkvertrag; kein eigener PDF-Server.

**Folgen:** Die importierten Projekte haben meist keinen Zahlungsplan und eine leere Checkliste; der Fahrplan
zeigt dort «Anzahlung offen» und Elektriker 0/7, bis jemand die Schritte setzt. Die 51 nachgetragenen Anlagen
haben kein IBN-Datum (fehlt in V233). Die Monteur-Ansicht am Handy folgt in Phase 9b, Material in 9a.
