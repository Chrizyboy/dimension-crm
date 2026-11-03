# 0045 – Marketing vollständig: Kampagnen, Messen, Ergebnis, Social «von Hand» (2.11.2026)

## Ausgangslage

Marketing konnte Kunden anschreiben, Posts planen und Newsletter senden, aber niemand sah, **was es bringt**:
keine Kampagne als Ganzes, keine Kosten, kein «woher kommen die Aufträge?», keine Messen, keine Öffnungen oder
Klicks. Chris: «jedes Modul muss seinen Zweck erfüllen». Vorschau des Neuentwurfs mit allen Rollen, danach
Entscheide von Chris (2.11.): «Alles wie in der Vorschau», Kosten «aus AbaNinja zuordnen», Newsletter «Öffnungen
und Klicks zählen», Newsletter bleibt ein Reiter in Marketing.

## Entscheid

- **Kampagne als eigener Datensatz** (`marketing_kampagnen`): Ziel, Zeitraum, Budget, Ziel-Leads, Sprache,
  Verantwortlich, Kennzeichen. Leads, Versände, Posts, Newsletter und Lieferantenrechnungen zeigen darauf
  (`kampagne_id`). Die bisherige Tabelle `kampagnen` bleibt der Versand-Verlauf («Letzte Aktionen»).
- **Lead → Kampagne in der Datenbank** (Trigger `intern.kampagne_zuordnen`, nur beim Anlegen, nur wenn leer):
  1. Kennzeichen im Website-Feld «Kampagne» oder im Text («Kampagne: …», `utm_campaign=…`),
  2. Messe, die an diesem Tag (bis 3 Tage danach) läuft,
  3. Kontakt, der in den letzten 60 Tagen von einer Kampagne angeschrieben wurde,
  4. laufende Kampagne mit derselben Quelle. Von Hand änderbar.
- **Kosten aus AbaNinja**: Lieferantenrechnungen (`kreditor_zahlungen`), die nach Werbung aussehen (Stichworte in
  `einstellungen.marketing.kosten_stichworte`), ordnet die Buchhaltung einer Kampagne und einem Kanal zu
  (`marketing_kosten_zuordnen`, Recht `finanzen`). Gekaufte Leads rechnen mit `kennzahlen.quellen_kosten_rappen`.
  Kosten, Budget und Kosten pro Lead sieht nur, wer `preise` oder `finanzen` hat (`intern.marketing_kosten_sichtbar`).
- **Zahlen in der Datenbank**: `kampagnen_zahlen()` (erreicht → geöffnet → geklickt → Leads → Offerten →
  Aufträge, Auftragswert, Kosten), `marketing_quellen(jahr)`, `marketing_budget(jahr)`, `versand_ergebnisse(ids)`.
- **Öffnungen und Klicks** (Serien-Mail und Newsletter): Edge Function `zaehler` (ohne Anmeldung) zählt ein
  unsichtbares Bild und leitet Links weiter; gespeichert nur Zeitpunkt und Link (`marketing_ereignisse`), keine IP,
  kein Gerät. Weitergeleitet wird nur auf Links, die wirklich in der Mail stehen. Unter jeder gezählten Mail
  steht der Satz aus `einstellungen.marketing.datenschutz`. Abmelde-Links werden nie umgeleitet.
- **Messen & Events**: Kampagne mit Art «messe», Standdienst je Tag (Kürzel), Checkliste aus der Vorlage,
  Lead-Erfassung am Handy auch ohne Netz (Warteschlange im Gerät, `messe_lead_erfassen` wiederholbar mit ID vom
  Gerät, legt Lead, Einwilligung mit der Messe als Nachweis und die Aufgabe «anrufen» an), Dankes-Mail an alle
  Besucher über den Ausgangskorb (Klick = Freigabe).
- **Social Media als Board** (Idee → Entwurf → Zur Freigabe → Geplant → Veröffentlicht). Vorbereiten darf jede
  Person, planen und veröffentlichen die Administration («Zur Freigabe» gibt der Administration eine Glocke).
  Solange Meta und LinkedIn nicht verbunden sind (Chris: später), gilt ein freigegebener Post als «von Hand»: zur
  geplanten Zeit kommt die Glocke «Jetzt posten», danach trägt man die Links ein (`social_gepostet`).
- **Übersicht je Rolle**: «Heute zu tun» (Freigaben, Kosten zuordnen, Messe vorbereiten, Werbemittel nachbestellen,
  Kampagne ohne Lead, Saison-Thema), nächste 14 Tage, eigene Leads aus Marketing, Quellen und Budget.
- **Kalender**: alles, was nach aussen geht, Messen, Kampagnen-Ende und das Saison-Thema je Monat
  (`einstellungen.marketing.saison_themen`).
- **Zielgruppen speichern** (`marketing_zielgruppen`, Filter als Daten) und neuer Filter «Öl- oder Gasheizung»
  (Wärmepumpe-Potenzial). Die Heizung kommt aus dem Gebäuderegister (geo.admin.ch), stündlich 20 Gebäude im
  Zeitplan (`objekte.heizung`).
- **Werbe-Pause**: Serien-Mails überspringen, wer in den letzten `werbepause_tage` angeschrieben wurde
  (abschaltbar im Dialog; die Dankes-Mail nach der Messe ist davon ausgenommen).
- **Mediathek**: Fotos aus Rapporten mit Erlaubnis des Kunden (`rapporte.fotos_werbung`, Nachtragen/Entziehen nur
  mit Grund, steht im Verlauf), Titelbild, nur Ort und Anlage, nie der Name. Werbemittel mit Link (SharePoint),
  Version, Bestand und Mindestbestand.

## Folgen

- Neue Fachtabellen sind über `intern.richte_fachtabelle_ein` eingerichtet (Papierkorb, Protokoll, RLS) und damit
  automatisch in der Sicherung.
- In Betrieb nehmen: Migrationen hochladen, Edge Functions `zaehler`, `ausgang` und `zeitplan` neu
  veröffentlichen. Die Datenschutzerklärung der Website um das Zählen von Öffnungen und Klicks ergänzen.
- Tests: `supabase/tests/marketing_kampagnen.test.sql` (Kennzeichen, Zuordnung, Messe-Lead, Kosten nur mit Recht,
  Zählen nur echter Links, Social von Hand), `src/modules/marketing/lib/planung.test.ts`, Browser-Test `marketing`.
