# 0022 – Marketing: Zielgruppe als Sicht, Versand über den Ausgangskorb, direktes Posten auf Meta und LinkedIn

**Kontext:** V233 hatte unter Marketing «Kunden anschreiben» (Filter nach Gruppe, Kanton, Sprache, Standort,
Anlage; Serienbrief, Serien-Mail, Adressliste), Social Media (Ideen, Texte je Netzwerk und Sprache, Bild über
Canva, Plan und «gepostet») und Newsletter (Thema, Zielgruppe, Text, Versand, Abmeldungen) mit Textvorlagen und
einem CI-Stil. Gepostet wurde dort von Hand. Entscheid aus Phase 0: direkt über die APIs von Meta und LinkedIn
posten (kein Metricool). Phase 11 wurde von Chris am 23.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Zielgruppe als Sicht `marketing_zielgruppe`** (eine Zeile je Kontakt, mit `security_invoker`, also mit den
  Rechten der angemeldeten Person): Gruppe aus dem Stand der Geschäfte (Kunde, Offerte offen, Interessent,
  verloren, kein Interesse, ohne), Standort aus Projekt, Offerte oder Verkaufschance, Kanton auch aus dem
  PLZ-Verzeichnis, Anlage (Batterie, Wallbox, Wärmepumpe, seit), Werbesperre, Einwilligung und Versandgrund.
  Gefiltert wird in der App, weil die Liste klein ist (gut 700) und Filter live umschalten.
- **Versand nur über den Ausgangskorb** (Phase 8, Regel 6): Serien-Mail und Newsletter gehen einzeln über das
  Outlook der Person, die auf «Senden» drückt; dieser Klick ist die Freigabe. `marketing_senden` überspringt
  Gesperrte und doppelte Adressen und merkt sich jede Mail (Schlüssel Art:Kampagne:Adresse), damit ein zweiter
  Klick nichts doppelt schickt. Serienbrief ist ein PDF (pdf-lib) zum Drucken; vermerkt wird er trotzdem.
- **Abmelden:** Jeder Kontakt hat einen zufälligen `abmelde_schluessel`. Der Link in jeder Mail führt auf die Edge
  Function `abmelden` (ohne Anmeldung), die nur die Werbesperre setzt und die Sprache für die Bestätigung kennt.
  Newsletter nur an Kunden oder mit Einwilligung (Datum und Nachweis), so verlangen es revDSG und UWG.
- **Social Media:** Ein Firmenkonto je Dienst (Meta = Facebook-Seite + Instagram, LinkedIn-Firmenseite, Canva),
  verbunden durch eine Admin-Person; Tokens verschlüsselt in `intern.social_konten`, nie in der App. Ablauf:
  Entwurf → **Freigeben und planen** (prüft Text je Netzwerk, Länge, Instagram-Bild und Verbindung) → der
  Zeitplan veröffentlicht zur Zeit → Ergebnis je Netzwerk mit Link. Bei Fehlern wird beim nächsten Mal nur das
  fehlgeschlagene Netzwerk gepostet. Nach einer Zeitüberschreitung heisst es «unklar» statt «Fehler», damit niemand
  doppelt postet.
- **Canva** über die Connect-API: leeres Design im Format anlegen, in Canva mit dem Markenkit gestalten, PNG zurück
  in die Ablage. Eigene Fotos gehen immer.
- **Vorlagen als Daten** in `einstellungen.marketing` (Absender und Ort je Firma, Brief- und Mailtexte DE/FR,
  Abmelde-Satz, Themen, Regeln je Netzwerk, CI-Stil). Den CI-Stil ändert nur die Administration.
- **KI-Texte** (V233 «Text mit KI») kommen mit dem Assistenten in Phase 13; bis dahin zeigt die Oberfläche einen
  Hinweis, und die Regeln je Netzwerk stehen schon in den Vorlagen.

**Folgen:** Meta und LinkedIn verlangen eine eigene App mit Prüfung (Meta: Live-Schaltung, LinkedIn: Community
Management API); bis das durch ist, bleiben Posts Entwürfe und werden wie bisher von Hand gepostet («Als erledigt
ablegen»). Echte Dienste sind in der Cloud-Sandbox gesperrt; geprüft wird gegen Ersatz-Server
(`npm run marketing:pruefen`). Dabei kam ein Fehler aus Phase 8 ans Licht: Server-Aktionen mit Recht «basis»
wurden für Nicht-Admins abgelehnt; behoben in `_shared/funktion.ts` mit Test.
