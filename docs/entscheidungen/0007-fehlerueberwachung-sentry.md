# 0007 – Fehlerüberwachung mit Sentry

**Kontext:** In V233 merkt niemand, wenn bei einer Mitarbeiterin ein Fehler auftritt, ausser sie meldet ihn. Der Bauprompt sieht Fehlerüberwachung vor; Chris hat «Sentry früh» als Vorschlag erhalten.

**Entscheid:** `@sentry/react` wird ab Phase 2 eingebaut, aber nur geladen und aktiv, wenn `VITE_SENTRY_DSN` gesetzt ist. Region Europa (`*.ingest.de.sentry.io`). Es werden keine Personendaten gesendet: `dataCollection` ist ganz ausgeschaltet und `beforeSend` entfernt Benutzer- und Anfragedaten.

**Folgen:** Ohne Eintrag passiert nichts (lokal, Tests, Vorschau). Für den Betrieb braucht es ein Sentry-Projekt in der EU-Region; der DSN ist öffentlich und darf in der App stehen, er ist kein Geheimnis.
