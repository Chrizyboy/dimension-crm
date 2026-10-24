# KI einrichten: Claude API, Kostenlimit, erster echter Test (Phase 13)

Diese Anleitung ist für den Betrieb. Sie braucht keine Programmierkenntnisse, aber Zugang zur
[Claude Console](https://console.anthropic.com) (Firmenkonto von Dimension Solaire) und zum Supabase-Projekt.

**Grundregel:** Der API-Schlüssel kommt nie in die App, in Git, in einen Chat oder in eine Mail. Er steht nur in den
**Supabase-Secrets** und wird nur in der Edge Function `ki` gelesen. Die App sieht nur, _ob_ die KI eingerichtet ist.

**Ohne Einrichtung** funktioniert das CRM wie bisher; die KI-Knöpfe zeigen dann «KI ist noch nicht eingerichtet».

---

## 1. Schlüssel bei Anthropic holen (einmal)

1. In der Claude Console anmelden › **Settings › Billing**: Zahlungsmittel hinterlegen und ein Guthaben laden
   (für den Anfang reichen USD 20–50).
2. Unter **Settings › Limits** ein **Monatslimit** setzen (z.B. USD 50). Das ist die zweite Sicherung neben dem
   Tageslimit im CRM.
3. **Settings › API Keys › Create Key**, Name «Dimension CRM». Den Schlüssel (beginnt mit `sk-ant-`) sofort kopieren,
   er wird nur einmal gezeigt.

## 2. Schlüssel in Supabase hinterlegen

Im Supabase-Dashboard › **Edge Functions › Secrets** › neuer Eintrag:

| Name                | Wert                        |
| ------------------- | --------------------------- |
| `ANTHROPIC_API_KEY` | der Schlüssel aus Schritt 1 |

Oder im Terminal: `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-…` (danach den Verlauf des Terminals löschen).
`ANTHROPIC_URL` bleibt im Betrieb leer, es ist nur für Tests mit dem Ersatz-Server.

Die Edge Functions `ki` und `zeitplan` neu veröffentlichen: `npx supabase functions deploy ki zeitplan`.

## 3. Einstellungen im CRM prüfen (Administration)

**KI-Assistent › Einstellungen:**

- **KI eingeschaltet:** Hauptschalter für alle.
- **Tageslimit (CHF):** Standard CHF 10.00 pro Tag für alle zusammen. Ist es erreicht, antwortet die KI bis Mitternacht
  nicht mehr (Meldung «Tageslimit erreicht»), das übrige CRM läuft normal.
- **Limit pro Person:** freiwillig, z.B. CHF 3.00, damit eine Person nicht das ganze Tageslimit braucht.
- **Modelle:** «Standard» (Texte, Zusammenfassungen, Bewertung, Briefing, Luftbild) und «Schnell» (Mails lesen,
  Notizen, Belege, PDF). Zur Wahl stehen nur Modelle, für die ein Preis hinterlegt ist. Welche Funktion welches
  nimmt und die Preise stehen in der Einstellung `ki` (Datenbank); neue Modelle oder Preise trägt die Entwicklung
  dort ein, nie im Programm.
- **Firmen-Schreibstil DE/FR:** aus V233 übernommen, hier änderbar.

**Was kostet es ungefähr?** (Preise Oktober 2026, Kurs 0.90)

| Funktion                        | Modell   | pro Aufruf ca. |
| ------------------------------- | -------- | -------------- |
| Mail-Entwurf, Antwort           | Standard | 2–5 Rappen     |
| Zusammenfassung, Lead-Bewertung | Standard | 2–4 Rappen     |
| Tagesbriefing (einmal pro Tag)  | Standard | 2–3 Rappen     |
| Luftbild-Analyse                | Standard | 3–6 Rappen     |
| Mail lesen, Notiz ordnen, Beleg | Schnell  | unter 1 Rappen |

Bei 5 Personen und normalem Gebrauch also etwa CHF 1–3 pro Tag. Jeder Aufruf steht unter **KI-Assistent › Kosten**
(ohne Inhalte, nur Funktion, Modell, Tokens und Kosten); jede Person sieht ihre eigenen, die Administration alle.

## 4. Erster echter Test (5 Minuten)

1. **KI-Assistent** öffnen: Oben steht kein gelber Hinweis mehr. Auf der Startseite erscheint «Dein Tag»
   (Tagesbriefing).
2. **Assistent › Nachfassen › Öffnen**, einen Wunsch eingeben («Nachfragen, ob Fragen offen sind»), **Entwurf
   schreiben**. Nach 5–20 Sekunden steht ein Text da. Einmal **Kürzer** drücken.
3. **Weiter zur Mail**: der Text landet im normalen Mail-Fenster. Nicht senden, sondern schliessen.
4. Einen Lead öffnen › Abschnitt KI › **Lead bewerten**: Stufe mit Begründung erscheint.
5. **KI-Assistent › Kosten**: Die drei Aufrufe stehen mit Kosten da.

Klappt Schritt 2 nicht:

| Meldung                     | Ursache und Lösung                                                     |
| --------------------------- | ---------------------------------------------------------------------- |
| «noch nicht eingerichtet»   | Secret fehlt oder Function nicht neu veröffentlicht (Schritt 2)        |
| «Schlüssel wurde abgelehnt» | Schlüssel falsch kopiert oder in der Console gelöscht: neuen erstellen |
| «gerade überlastet»         | Anthropic hat viel Betrieb oder das Monatslimit ist erreicht (Console) |
| «Tageslimit … erreicht»     | Limit im CRM erhöhen oder bis morgen warten                            |

## 5. Automation «Offerte nachfassen» mit KI

Die mitgelieferte Automation schreibt den Nachfass-Text jetzt mit KI (Schalter «Text mit KI schreiben» im Mail-Schritt).
Der Zeitplan ersetzt den Vorlagentext im Ausgangskorb durch den KI-Entwurf; im Ausgangskorb steht dann «KI-Entwurf»
und «Vorlagentext verwenden». Die Mail wartet wie bisher auf die Freigabe. Ist die KI aus oder das Limit erreicht,
bleibt der Vorlagentext stehen.

## Prüfen ohne echten Schlüssel

`npm run ki:pruefen` startet einen Ersatz-Server für die Claude API (`scripts/ki/ersatz-claude.mjs`) und prüft alle
Funktionen, Limit, Kosten und Rechte gegen die lokale Supabase. Es kostet nichts.
