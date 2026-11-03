# 0042 – Ausschreibungen vollständig: Submission bis Zuschlag

Datum: 02.11.2026 · Thread «Ausschreibungen vollständig machen» · Vorschau: https://claude.ai/artifact/KhnKwqUYsFHAW8y9Vswy62

## Ausgangslage

Der Monitor (Entscheid 0017) fand Meldungen, teilte sie in drei Spuren und führte die Akquise (Anschreiben,
Bewilligen, Senden) sauber. Bei der eigenen Submission hörte er nach «Teilnehmen» auf: kein Go/No-Go mit Begründung,
keine Kriterien, keine Checkliste, keine zweite Prüfung, kein Öffnungsprotokoll, kein Projekt beim Zuschlag,
keine Nachweise und Referenzen, keine Auswertung.

## Entscheid

- **Leitstand** statt Liste: Zahlen, die auf jemanden warten, nächste Fristen, Board je Spur. Die Akte ist eine
  ganze Seite (`#/tenders?dossier=…`), nicht mehr ein Seitenblatt.
- **Go/No-Go** rechnet die Datenbank (`ausschreibung_gng`, 0–100 aus Thema, Grösse, Distanz, Eignung, Quote bei der
  Vergabestelle, Nachweisen). Schwellen in `einstellungen.ausschreibungen.gng`. Der Mensch entscheidet; der Vorschlag
  von damals bleibt gespeichert. «Nicht teilnehmen» nur mit Grund aus `nogo_gruende` (für die Auswertung).
  Montage-Kapazität rechnet das CRM nicht, die Akte erinnert daran.
- **Eckdaten** und Zuschlagskriterien (zusammen 100 %) über `submission_speichern`.
- **Checkliste** aus `einstellungen.ausschreibungen.checkliste`; «Nachweise» und «Prüfung» setzt das CRM selbst.
- **Vier-Augen-Prüfung** ab `pruefen_ab_rappen` (Standard CHF 100'000): `submission_pruefen` durch `pruefen`
  (Chris, Vertretung Andy), nie durch die verantwortliche Person. Ohne Prüfung kein «Eingereicht».
- **Eingereicht** braucht den Betrag (exkl. MWST). **Zuschlag/Absage** brauchen das Öffnungsprotokoll
  (`submission_protokoll`, Rang rechnet die Datenbank) oder einen Grund, warum es keines gibt.
- **Zuschlag** legt das Projekt an wie jeder Auftrag (`auftrag_erstellen`, Vertragswert inkl. MWST, ohne eigenen
  Werkvertrag) und hebt die Sperre der Vergabestelle auf. **Absage** setzt Gewinner und Beschwerdefrist.
- **Fristen-Agenda** nach Woche, mit internen Schritten rückwärts gerechnet (Prüfung 3 Arbeitstage, Post nach Regel).
- **Nachweise** je Firma in `firmen_nachweise` (Speicher `nachweise`), Gültigkeit aus der Art; der Zeitplan meldet
  30 Tage vor Ablauf eine Aufgabe (`nachweise_melden`). **Referenzen** in `submission_referenzen`, Vorschläge aus
  Projekten mit IBN, übernommen nur per Klick.
- **Auswertung**: Quote, Beträge, Abstand zum Zuschlag, Kantone, No-Go-Gründe, Mitbewerber, Trichter.
- **KI**: «Von Hand erfassen» liest eingefügten Publikationstext (Aktion `publikation`, Stufe «schnell»);
  der Text steht in einem `<daten>`-Block, die Felder sind ein Vorschlag zum Prüfen.

## Folgen

- Monitor sendet weiterhin keine Mail; Treffer nur im CRM, Andy bewilligt.
- Neue Fehler-Schlüssel `ausschreibung.*` sind in `fachfehler` übersetzt.
- Upload in die Cloud erst nach Freigabe durch Chris (`npx.cmd supabase db push`, `functions deploy ki zeitplan`).
