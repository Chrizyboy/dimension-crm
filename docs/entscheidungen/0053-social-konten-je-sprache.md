# 0053 – Social Media mit deutschem und französischem Konto (2.11.2026)

## Ausgangslage

Beim Einrichten von Meta sagte Chris: «wir haben bei Instagram und LinkedIn jeweils ein deutsches und ein
französisches Konto», bei Facebook ebenso je eine Seite. Das CRM kannte bisher nur ein Konto je Dienst
(Entscheid 0022) und postete bei «DE + FR» beide Texte untereinander auf dieses eine Konto.

## Entscheid

- **Eine Anmeldung je Dienst bleibt.** Meta liefert beim Verbinden alle Seiten, die die Person verwaltet (je
  Seite ein Seiten-Token, zusammen verschlüsselt), LinkedIn alle Firmenseiten, auf denen sie Admin ist. Instagram
  hängt bei Meta immer an einer Facebook-Seite, darum wählt man bei Instagram die Seite, an der das Konto hängt.
- **Zuordnung als Daten:** `intern.social_konten.konto.zuordnung = {"facebook": {"de": …, "fr": …}, "instagram": …,
"linkedin": …}`. Beim Verbinden schlägt der Server sie nach dem Namen vor (GmbH/Muri = Deutsch, Sàrl/Bulle =
  Französisch); ändern nur die Administration in Marketing › Social Media › Verbindungen
  (`social_zuordnung_setzen`, nur verbundene Konten). Beim Neu-Verbinden bleibt die gewählte Zuordnung.
- **Posten:** Deutsch geht nur ans deutsche Konto, Französisch nur ans französische. «DE + FR» mit zwei Konten:
  jedes Konto bekommt den Text in seiner Sprache; mit nur einem Konto wie bisher beide Texte untereinander
  (`postZiele` in `_shared/social_text.ts`). Das Ergebnis hat dann `teile.de`/`teile.fr`; ein zweiter Versuch
  postet nur das Konto, das noch fehlt.
- Ältere Verbindungen (eine Seite) laufen ohne neu verbinden weiter.

## Folgen

- Freigabe (`social_freigeben`) prüft wie bisher Texte je Sprache; keine Änderung an den Posts selbst.
- `npm run marketing:pruefen` prüft mit zwei Seiten und zwei Firmenseiten.
