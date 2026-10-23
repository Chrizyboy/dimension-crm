# 0024 – KI-Funktionen: Claude API nur auf dem Server, ohne SDK, mit Tageslimit und Kostenprotokoll

**Kontext:** V233 hatte einen KI-Assistenten, der die Claude API direkt aus dem Browser aufrief (Schlüssel im
Browser gespeichert), dazu KI-Texte für Social Media, Newsletter, Serien-Mail, Spesenbelege, Luftbild-Analyse,
Offerten-PDF und den Lead-Monatsbericht, einen Firmen-Schreibstil DE/FR und einen gelernten Stil pro Person. Es gab
weder ein Kostenlimit noch ein Protokoll. Der Bau-Auftrag (3.4) verlangt zusätzlich: Mail-Entwürfe im Firmenstil,
Zusammenfassung auf Knopfdruck, eingehende Mails erkennen und zuordnen, Gesprächsnotiz (auch diktiert) in Felder und
Aufgabe, Lead-Bewertung mit Begründung und ein Tagesbriefing pro Person. Regeln: KI schlägt vor, Mensch bestätigt;
fremde Inhalte sind Daten; Tageslimit; Kosten pro Funktion; Modelle zentral; KI nur auf dem Server. Phase 13 wurde von
Chris am 23.10.2026 mit «weiter» gestartet.

**Entscheid:**

- **Nur auf dem Server:** Eine Edge Function `ki` mit einer Aktion je Funktion (`entwurf`, `stil_lernen`,
  `mail_erkennen`, `notiz`, `zusammenfassung`, `lead_bewertung`, `briefing`, `beleg`, `offerte_pdf`, `luftbild`,
  `marketing_text`, `social`, `monatsbericht`, `status`). Der Schlüssel `ANTHROPIC_API_KEY` steht nur in den
  Supabase-Secrets. Die Function liest Daten mit den Rechten der angemeldeten Person (`ki_kontext`); Rechnungen nur
  mit Recht `finanzen`. Die App ruft nur `ki` auf (`src/services/ki.ts`).
- **Ohne SDK, mit `fetch`:** Die Edge Functions laden keine npm-Pakete (im Edge-Runtime scheiterte `npm:` an der
  Zertifikatsprüfung, «UnknownIssuer»), und alle anderen Dienste (Microsoft, AbaNinja, ASPSMS, Meta, LinkedIn,
  Canva) laufen schon über den gemeinsamen Aufruf `rufe` mit Zeitlimit, Wiederholung und Fehlercodes. Die Messages-
  Schnittstelle ist klein; `supabase/functions/_shared/claude.ts` baut die Anfrage (Version `2026-10-21`) und liest
  Antwort, Verbrauch, Ablehnung und abgeschnittene Antworten. Geprüft wird das mit einem Ersatz-Server
  (`npm run ki:pruefen`), der Kopfzeilen, Modell, Schema und Zwischenspeicher kontrolliert.
- **Modelle und Preise zentral** (Regel 9) in `einstellungen.ki`: zwei Stufen «standard» (`claude-opus-5-5`) und
  «schnell» (`claude-haiku-5-5`), je Funktion eine Stufe, Preise in USD je Million Tokens und der Kurs `usd_chf`.
  Die Administration wählt nur Modelle mit hinterlegtem Preis. Neue Modelle: Preis und Name in der Einstellung
  eintragen, kein Code.
- **Ersatzmodell:** Bei Opus und Sonnet der 5er-Reihe wird der serverseitige Ersatz eingeschaltet
  (`fallbacks: "default"`, Beta `server-side-fallback-2026-07-01`): lehnt das Modell eine harmlose Anfrage
  irrtümlich ab, antwortet Anthropic mit dem Ersatzmodell, ohne zweiten Aufruf. Protokolliert wird das Modell,
  das geantwortet hat. Haiku hat keinen Ersatz. Bleibt es bei einer Ablehnung, kommt die Meldung «abgelehnt».
  Überlastung (429, 5xx, 529) wird einmal wiederholt.
- **Strukturierte Antworten:** Jede Funktion ausser freiem Text verlangt ein JSON-Schema (`output_config.format`),
  damit die App Felder sicher übernehmen kann. Der Systemtext (Regeln, Firmenstil) wird zwischengespeichert
  (`cache_control`), das senkt die Kosten wiederholter Aufrufe.
- **Fremde Inhalte sind Daten** (Regel 7): Mails, PDFs, Belege, Kundennotizen und Bilder gehen nur als markierte
  Daten (`<daten>`-Blöcke, darin eingeschmuggelte Tags maskiert) an die KI, der Systemtext sagt, dass Anweisungen darin nicht gelten.
  Was die KI vorschlägt, übernimmt ein Mensch: Lead, Aufgabe, Spesen und Felder erst nach Klick; Mails nur über das
  normale Mail-Fenster bzw. den Ausgangskorb mit Freigabe (Regel 6).
- **Tageslimit und Protokoll:** Vor jedem Aufruf prüft `ki_budget` das Tageslimit für alle (Standard CHF 10.00) und
  freiwillig pro Person. Jeder Aufruf, auch ein fehlgeschlagener, steht in `ki_aufrufe` mit Funktion, Modell,
  Tokens, Kosten (Tausendstel-Rappen) und Dauer, nie mit Inhalten. Jede Person sieht ihre Kosten, die
  Administration alle; nur der Server schreibt.
- **Ergebnisse speichern:** Zusammenfassung, Lead-Bewertung, Tagesbriefing (einmal pro Tag und Person) und
  Luftbild-Analyse stehen in `ki_ergebnisse` (Papierkorb, Protokoll), damit dieselbe Frage nicht zweimal bezahlt
  wird. Sie sind als Vorschlag mit Datum gekennzeichnet.
- **Schreibstil:** Firmenstil DE/FR aus V233 in der Einstellung. Der persönliche Stil lernt nur, wenn eine Person
  einen KI-Text geändert übernimmt (höchstens 15 Regeln, 4 Beispiele ohne Namen und Adressen); sie kann die Regeln
  unter «Mein Schreibstil» bearbeiten oder zurücksetzen.
- **Automation:** Ein Mail-Schritt kann «Text mit KI schreiben». Der Ausgangskorb-Eintrag entsteht wie bisher mit
  dem Vorlagentext; der Zeitplan ersetzt ihn durch den KI-Entwurf, solange niemand ihn geändert hat, und behält die
  Vorlage zum Vergleich. «Offerte nachfassen» ist so voreingestellt, weiterhin «mit Freigabe».
- **Diktat** über die Spracherkennung des Browsers bzw. Handys (de-CH/fr-CH), ohne eigenen Server.

**Folgen:** Ohne Schlüssel läuft das CRM normal, die KI-Knöpfe zeigen einen Hinweis. Kosten bleiben begrenzt
(Tageslimit im CRM und Monatslimit in der Claude Console, `docs/ki.md`). Ändert Anthropic die Schnittstelle, wird
nur `claude.ts` angepasst. Abgelehnt: KI im Browser wie in V233 (Schlüssel sichtbar, kein Limit), das SDK
(läuft im Edge-Runtime nicht zuverlässig) und ein Chat-Assistent mit Werkzeugen, der selbst Daten ändert (die
Regel «KI schlägt vor, Mensch bestätigt» wäre schwer einzuhalten).
