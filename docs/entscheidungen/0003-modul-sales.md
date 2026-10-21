# 0003 – Ein Modul `sales/` statt `leads/` + `deals/`

**Kontext:** In V233 ist ein Lead und die daraus entstehende Verkaufschance derselbe Datensatz mit Status. Zwei Module würden ständig dieselben Daten teilen und gegen die Regel «Module importieren sich nicht» verstossen.

**Entscheid:** Ein Modul `sales/` (Verkauf) für Leads, Pipeline, Touren und Kalender. Freigegeben am 21.10.2026.

**Folgen:** Klarere Grenzen. Die Seitenleiste zeigt «Verkauf»; Leads und Pipeline sind Ansichten darin.
