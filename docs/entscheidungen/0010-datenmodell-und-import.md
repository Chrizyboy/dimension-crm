# 0010 – Datenmodell und wiederholbarer Import der Vorlage

**Kontext:** V233 speicherte alles in 33 Sammlungen ohne festes Schema. Es gab keine Kunden-Tabelle, Beträge standen teils als Text, und «projects» war Offerte, Auftrag und Baustelle in einem. Phase 3 verlangt: «Echte Daten aus der Vorlage sind vollständig drin, Zählung stimmt.»

**Entscheid:**

- Kette **Kontakt → Objekt → Verkaufschance → Offerte → Werkvertrag → Projekt → Anlage**. Pro Kundennummer entsteht ein Kontakt, pro Adresse ein Objekt. Jede Zeile aus «projects» wird eine Offerte. Angenommene oder unterschriebene werden zusätzlich ein Projekt.
- Jede Fachtabelle wird mit `intern.richte_fachtabelle_ein(tabelle, recht)` eingerichtet. Das gibt ihr Standardspalten, Papierkorb (`geloescht_am`), Protokoll, `geaendert_am` und RLS. Eine Lösch-Regel bekommt sie nicht. So vergisst keine Tabelle eine Regel, und ein Test prüft das für alle.
- Rechte vorläufig: `basis` (jede aktive Person), `preise` (Einkaufspreise), `finanzen` (Liquidität), `admin`. Rollen-Feinschliff folgt in Phase 4.
- Jede importierte Zeile behält `alt_id` und den vollständigen alten Datensatz (`alt_daten`). Damit geht kein Feld verloren, auch wenn es noch keine eigene Spalte hat. Passwort-Hashes werden nicht übernommen.
- Der Import (`npm run import:vorlage`) ist **wiederholbar**. Er aktualisiert anhand von `alt_id`, und leere Änderungen landen nicht im Protokoll. Er läuft vor dem Umzug (Phase 16) nochmals mit den Live-Daten.
- Eine Abgleichsliste (`import_abgleich`) hält jede alte Zeile mit ihrem Ziel fest. Der Zählbericht vergleicht pro Sammlung Export und Übernahme. Unbekannte Statuswerte gelten als Fehler.
- Auswahlwerte (Stufen, Status, Kategorien) liegen als Daten in `auswahlwerte`. Die alten Texte stehen in `eigenschaften.vorlage`.
- Dateien kommen in den privaten Speicher «dokumente». SharePoint-Verweise bleiben Verweise.

**Folgen:** Probelauf am 21.10.2026: 32 von 32 Sammlungen und 90 von 90 Dateien stimmen, Dauer 10 s. Daraus entstanden 658 Kontakte, 649 Objekte, 68 Verkaufschancen (5 im Papierkorb), 608 Offerten, 255 Projekte, 83 Werkverträge und 828 Dokumente. Die Offertnummer 100843 kam doppelt vor; die zweite heisst jetzt «100843-P0038». Der Import braucht den service_role-Schlüssel. Er läuft deshalb nur lokal oder mit `--umzug` und nie aus der App.
