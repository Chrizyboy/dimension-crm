# 0008 – Eindeutige Bereichsnamen mit Untertitel

**Kontext:** Chris: «benenne die jeweiligen Tools so, dass bei niemandem Verwirrung entstehen kann». In V233 waren z. B. «Verkauf» und «Offerten» oder «Kontakte» und «Kunden» schwer auseinanderzuhalten.

**Entscheid:** Jeder Bereich hat einen eindeutigen Namen in DE und FR und einen Untertitel, der in einem Satz sagt, was man dort tut. Umbenannt: «Verkauf» → «Anfragen & Leads», «Kontakte» → «Adressbuch», «Bauplanung» → «Projekte & Montage». Der Untertitel erscheint im Tooltip der Seitenleiste, in der Befehlspalette und auf der Platzhalterseite. Ein Test prüft, dass kein Name doppelt vorkommt und jeder Untertitel gefüllt ist.

**Folgen:** Neue Module brauchen zwingend einen Untertitel (`meta.untertitel`). Die ganze Liste steht in der App unter Design-System → «Bereiche und Namen» und kann dort mit Chris abgestimmt werden.
