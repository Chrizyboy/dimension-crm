# 0026 – Feinschliff und Handbuch: messen, Tastatur, Zustände, Barrierefreiheit, Fehler melden

**Kontext:** Der Bau-Auftrag verlangt für Phase 15 «Feinschliff: Performance, Barrierefreiheit, Tastatur,
Leer-/Fehlerzustände» mit gezeigten Lighthouse-Werten, Tastenkürzel für alles Häufige (sichtbar in Tooltips),
Leer-, Fehler- und Ladezustände in jeder Ansicht und WCAG AA. Regel 1 verlangt zudem den V233-Helpdesk (Anleitung,
Prozesse mit Versionen, Erklärvideos, Tickets an Chris und Loris), der als Modul «Handbuch» für Phase 15 geplant war.
Phase 15 wurde von Chris am 24.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Messen statt raten:** `npm run messen` misst die Hauptseiten mit Lighthouse am PC und am Handy (Handy gedrosselt,
  ohne Zwischenspeicher und Service Worker). Vorher und nachher stehen im Bericht der Phase.
- **Tempo:** Die Sprachdateien werden nachgeladen (nur die aktive Sprache), die Schriften im HTML vorgeladen, die
  Karten «Team und Betrieb» auf «Mein Tag» erst beim Hinscrollen geladen. Das Hauptpaket schrumpft von 797 auf 482 KB.
- **Tastatur:** «?» zeigt alle Kürzel (überall, diese Ansicht, Sprünge). «G» und ein Buchstabe springt in einen
  Bereich (G T Mein Tag, G K Kunden …), angezeigt in der Befehlspalette und im Tooltip der Seitenleiste. Kürzel einer
  Ansicht meldet `useTaste(…, text)` an; nur dann erscheinen sie in der Übersicht. Kürzel gelten nie beim Schreiben
  und nie bei offenem Dialog.
- **Zustände:** Jede Liste zeigt beim Laden ein Gerüst, leer einen Satz mit dem nächsten Schritt, bei Fehler
  «Nochmal versuchen», Details und «Fehler melden» (mit vorgewähltem Bereich). `Datentabelle` hat dafür `fehler`.
- **Barrierefreiheit:** Geprüft mit axe (WCAG 2.1 A/AA plus Best Practice) auf allen Bereichen und Reitern, hell und
  dunkel, PC und Handy. Überschriften lückenlos (Kartentitel h2, Abschnitte h3), sichtbarer Text ist Teil des
  Namens, Tabellen mit Überlauf sind per Tastatur scrollbar, leere Kopfzellen haben einen versteckten Namen,
  Lesetext nie unter 12 px.
- **Handbuch (`#/knowledge`):** Reiter Anleitung (Bereiche, die man sehen darf, mit Kürzel), Prozesse (PDF DE/FR,
  Version, frühere Versionen), Videos (Sprache, Dauer, Vorschaubild) und Meldungen. Ablegen, neue Version und
  entfernen nur die Administration (wie V233: Chris und Loris), über `handbuch_speichern`/`handbuch_entfernen`;
  entfernen = Papierkorb.
- **Fehler melden statt Ticket-Mail:** V233 schickte jedes Ticket per Mail. Neu landet die Meldung in
  `rueckmeldungen` (Nummer T001 …, Bereich, Dringlichkeit, Browser/Fenster/Sprache, Bildschirmfotos) und die
  Administration bekommt eine Glocke (dringend = rot). Die Antwort sieht die meldende Person im Reiter und in der
  Glocke. So geht nichts ohne Freigabe nach aussen (Regel 6). Erreichbar über den Knopf im Handbuch, die
  Befehlspalette und jede Fehleranzeige.

**Folgen:** Neue Ansichten bringen Lade-, Leer- und Fehlerzustand mit und melden ihre Kürzel mit Text an. Neue
Abschnitte prüfen mit `heading-order` (Browser-Tests mit axe). Neue Video- oder Prozessarten brauchen eine Migration
für `handbuch_speichern`.
