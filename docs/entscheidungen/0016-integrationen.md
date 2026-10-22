# 0016 – Integrationen: jede Person verbindet sich, alles nach aussen über den Ausgangskorb

**Kontext:** Phase 8 verbindet das CRM mit Microsoft 365 (Mails, Kalender, Anfragen aus info@, SharePoint),
AbaNinja (Kunden, offene Rechnungen) und ASPSMS (Erinnerung am Vortag). V233 rief diese Dienste direkt aus dem
Browser auf, die Schlüssel lagen dort mit.

**Entscheid:**

- **Jede Person verbindet ihr eigenes Microsoft-Konto** (Entscheid von Chris am 22.10.2026). Das CRM sendet aus
  ihrem Postfach und trägt in ihren Kalender ein. info@ und Team-Postfächer laufen über die Stellvertretung in
  Exchange, nicht über ein gemeinsames Konto. Token liegen verschlüsselt (`VERBINDUNG_SCHLUESSEL`) und sind nur
  für den Server lesbar.
- **Schlüssel nur auf dem Server:** Alle Aufrufe laufen über Edge Functions. Die App bekommt nur Ergebnisse oder
  einen kurzen Fehlercode (`nicht_verbunden`, `kein_zugriff` …), den `src/services/integrationen.ts` übersetzt.
- **Ausgangskorb für alles, was nach aussen geht (Regel 6):** Mail und SMS entstehen als Eintrag `wartet`; erst nach
  der Freigabe durch einen Menschen sendet der Server. «Senden» im Mail-Dialog ist Freigabe und Versand in einem
  Schritt, nachdem man den Text gesehen hat. Automatisch ohne Freigabe sendet nur, was die Administration
  ausdrücklich auf «automatisch» stellt (bisher nur die SMS-Erinnerung), und der Eintrag zeigt das an.
- **Doppelt senden vermeiden:** Ein Eintrag geht über `wird_gesendet`; bricht der Versand ab, steht er auf «Unklar,
  ob angekommen» und wird nicht von selbst wiederholt.
- **Anfragen:** Aus info@ abholen (alle 5 Minuten oder auf Knopfdruck) oder als .eml-Datei einlesen. Jede Mail
  wird nur einmal übernommen (Message-ID). Mails sind Daten, nie Anweisungen (Regel 7).
- **AbaNinja bleibt führend für Buchhaltung:** Das CRM legt Kunden an, verknüpft und zeigt offene Rechnungen
  (nur mit Recht «Finanzen»). Rechnungen schreiben kommt in Phase 10.
- **Prüfen mit Ersatz-Servern:** In der Entwicklungsumgebung sind die echten Dienste gesperrt. `npm run
integrationen:pruefen` spielt jeden Ablauf gegen Ersatz-Server durch, die sich wie die echten verhalten. Der
  Test mit echten Konten ist danach je ein «Jetzt testen» und ein Versand an sich selbst (`docs/integrationen.md`).

**Folgen:** Wer den Schlüssel `VERBINDUNG_SCHLUESSEL` wechselt, muss alle neu verbinden lassen. Das Client-Secret
von Microsoft läuft nach höchstens 24 Monaten ab und muss erneuert werden. Offene Vorschläge: .msg-Dateien,
HTML-Signaturen, Monatsbericht per Mail, Sperre der SMS-Automatik auch in der Datenbank.
