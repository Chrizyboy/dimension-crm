# 0004 – `legacy-peer-deps` und TypeScript 6.0

**Kontext:** `@hookform/resolvers` deklariert optionale Peer-Abhängigkeiten (z. B. `effect`), die npm sonst als Konflikt meldet. `typescript-eslint` 8.72 unterstützt TypeScript nur bis 6.0.

**Entscheid:** `.npmrc` mit `legacy-peer-deps=true` und `save-exact=true` (alle Versionen exakt festgehalten). TypeScript auf 6.0.3 fixiert.

**Folgen:** Installationen sind reproduzierbar. Bei jedem grösseren Update prüfen, ob die Einstellung noch nötig ist, und TypeScript 7 nachziehen, sobald `typescript-eslint` es unterstützt.
