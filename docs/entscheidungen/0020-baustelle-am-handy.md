# 0020 – Baustelle am Handy: ein Rapport für alles, offline zuerst, Zeiten als Datei an den Lohn

**Kontext:** V233 hatte Rapporte und Zeiten nur im Büro; Monteure schrieben auf Papier oder per WhatsApp, Fotos
lagen auf privaten Handys. Die ERP-Analyse (Entscheid 0009, von Chris am 21.10.2026 freigegeben) verlangt eine
Handy-Ansicht mit Tagesplan, Tagesrapport (Arbeiten, Mehrmaterial, Fotos, Unterschrift), Zeiterfassung mit
Start/Stopp und Export für den AbaNinja-Lohn, Nachträge (Regie) mit Freigabe des Kunden, IBN-Protokoll,
Anlagedossier, Service-Rapport mit Verrechnung und Garantiefall beim Hersteller, auch ohne Netz.
Phase 9b wurde von Chris am 22.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Ein Rapport für alles** (`rapporte.art`: montage, service, wartung, ibn) statt eigener Formulare. Die Art
  blendet nur Abschnitte ein: Prüfpunkte bei der IBN, Verrechnung bei Service und Wartung, «Montage fertig» bei
  der Montage. Nummern R0001 … vergibt die Datenbank.
- **Offline zuerst:** Jede Änderung am Handy geht in eine Warteschlange im Browser (IndexedDB) und wird gesendet,
  sobald Netz da ist (beim Wiederkommen und alle 30 Sekunden). IDs entstehen am Handy, alle Abläufe in der
  Datenbank sind wiederholbar (doppelt gesendet = einmal gespeichert). Solange etwas wartet, zeigt die App den
  Stand vom Handy. Lehnt der Server einen Eintrag ab, bleibt er sichtbar mit Grund und kann verworfen werden.
  Prüfpunkte werden einzeln gesendet und in der Datenbank zusammengeführt, damit schnelles Tippen nichts
  überschreibt.
- **Fotos und Unterschrift sind Dokumente** (`dokumente`, Bezug Rapport, Ordner `fotos`/`unterschrift`), am
  Handy auf höchstens 1600 Pixel verkleinert. So gelten Papierkorb, Protokoll und später die SharePoint-Ablage.
- **Abschluss mit Unterschrift** (oder Grund ohne Unterschrift). Er macht den Rapport fest, bestätigt die
  offenen Nachträge des Rapports, stoppt die laufende Zeit und setzt die Folgen in der Datenbank: Montage fertig
  = Baustelle «IBN ausstehend», IBN = Anlage mit IBN-Datum und Projekt abgeschlossen, Service = Eintrag im
  Verlauf und auf Wunsch Fall erledigt. Wieder öffnen nur mit Recht `preise`.
- **Zeiten:** Start/Stopp am Handy, Nachtragen und Korrigieren im Büro. Das Büro prüft (gibt frei) und
  exportiert als CSV (Semikolon, UTF-8 mit BOM, eine Zeile je Zeit). Das genaue Importformat von AbaNinja-Lohn
  ist noch nicht bekannt; die Spalten werden angepasst, sobald eine Beispieldatei vorliegt. Exportierte Zeiten
  sind fest.
- **Nachträge (Regie)** am Rapport oder am Projekt, mit Stunden und Material. Der Kunde bestätigt mit der
  Unterschrift des Rapports. Den Betrag setzt das Büro (Recht `preise`); verrechnet wird in Phase 10.
- **IBN-Protokoll:** Prüfpunkte als Daten (`einstellungen.ibn_pruefpunkte`, Ja/Nein oder Messwert mit Einheit),
  das PDF in der Sprache des Kunden. **Anlagedossier:** ein PDF aus IBN-Protokoll und gewählten Dokumenten
  (Pläne, Sicherheitsnachweis, Garantien), beim Projekt abgelegt und per Mail über den Ausgangskorb (Regel 6).
  Datenblätter der Hersteller sind fremde Adressen (kein Zusammenfügen im Browser möglich) und stehen darum
  als Liste mit Link im Dossier.
- **Garantiefall beim Hersteller** (`garantiefaelle`) im Service-Fall: Komponente, Seriennummer, RMA, Stand mit
  Datum je Schritt, Gutschrift.
- **Handy-Leiste:** «Baustelle & Rapporte» unter den ersten vier Bereichen, wenn die Person ihn sehen darf.

**Folgen:** Monteure brauchen ein Konto (Rolle Montage). Fotos bleiben bis zur SharePoint-Ablage nur in
Supabase. Ohne Netz geht nichts verloren, solange der Browser-Speicher des Handys nicht gelöscht wird; die App
zeigt, wie viele Einträge warten. Die Rechnung aus Service-Rapporten und Nachträgen folgt in Phase 10.
