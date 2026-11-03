# 0045 Kunden vollständig: Akte als ganze Seite, Betreuung, Doppelte zusammenführen

Datum: 03.11.2026 · Entscheid von Chris (Pop-up-Karten im Thread «Kunden vollständig machen», gebaut mit der
Empfehlung A, Hochladen am 03.11. freigegeben)

## Ausgangslage

Die Kundenakte zeigte Kontaktdaten, Gebäude und Geschäfte, aber nichts nach dem Verkauf (Anlagen, Service,
Wartung, Rechnungen, Aufgaben, Mails). Es gab nur eine Person pro Kunde, keinen festen Betreuer, keine
Rechnungsadresse, keine Hinweise für die Montage vor Ort. Doppelte wurden nur markiert, nicht bereinigt.

## Entscheid

1. **Ganze Seite** (Karte 1, Schritt 1, PR #70): Ein Klick auf einen Kunden öffnet die Akte als Seite mit drei
   Spalten wie die Fall-Akte im Service. Das Adressbuch behält das Seitenpanel. Rechnungen und offene Beträge nur
   mit Recht `finanzen` (RLS), sonst ein Hinweis statt «keine».
2. **Fester Betreuer** (Karte 2): `kontakte.betreuer_id`. Leer heisst: wer das letzte Geschäft betreut. Die
   Zuteilung neuer Leads bleibt in `einstellungen.zustaendigkeiten` (Entscheid 0032), der Betreuer ändert sie nicht.
3. **Doppelte zusammenführen nur Administration** (Karte 3): `kontakt_zusammenfuehren(behalten, weg)`.
   - Jede Spalte, die per Fremdschlüssel auf `kontakte` zeigt, wird umgehängt, auch in Tabellen, die später
     dazukommen. Lose Bezüge (`aufgaben`, `dokumente` mit `bezug_tabelle = 'kontakte'`, `anschreiben`) ebenso.
   - Gestellte Rechnungen behalten sonst ihren Kunden. Beim Zusammenführen ist es derselbe Kunde, darum erlaubt
     `intern.rechnung_rechnen` die Änderung nur mit dem Merkmal `intern.zusammenfuehren` (gilt nur in der Funktion).
   - Ansprechpersonen (`kontakt_zugehoerigkeiten`, Entscheid des Adressbuch-Threads) ohne Doppelte, nur ein
     Hauptkontakt pro Firma.
   - Leere Felder des Behaltenen werden ergänzt, Werbesperre gilt, wenn einer gesperrt war.
   - Der Doppelte kommt in den Papierkorb (`zusammengefuehrt_in`), nie hart gelöscht. Der Verlauf bekommt einen
     Eintrag.
4. **Neue Felder**:
   - Am Kunden: Herkunft (Auswahlliste `quelle`, dieselbe wie bei Leads), abweichende Rechnungsadresse (JSON
     `{name, zusatz, strasse, plz, ort}`), Rechnungs-Mail, eigene Zahlungsfrist (leer = Frist der Firma), UID.
   - Am Gebäude: `vor_ort` (Zugang, Schlüssel, Parkplatz, Hund, Zähler) und `heizung`.
5. **Ansprechpersonen** zeigt die Kundenseite. Gepflegt werden sie im Adressbuch, ein Link führt dorthin.

## Noch offen

- Spalten Betreuer, Anlage und Offen in der Kundenliste sowie gespeicherte Ansichten. Dafür muss die Sicht
  `kunden_uebersicht` erweitert werden.
- Rechnungsadresse, Rechnungs-Mail und eigene Zahlungsfrist in `rechnung_entwurf` und im Rechnungs-PDF
  übernehmen. Das gehört zum Modul Rechnungen.
