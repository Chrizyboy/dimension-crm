# 0029 Helpdesk: Meldungen mit Freigabe per SMS und Knopf im CRM

Datum: 31.10.2026 · Entschieden von Chris

## Ausgangslage

Chris will, dass jede Meldung aus «Fehler melden» zu Claude kommt, Claude nichts ohne sein Ja ändert und ihm eine
Einschätzung als Pop-up schickt. Er ist nicht täglich in der Claude-App.

## Entscheid

- **Pop-up per SMS** über das schon angebundene ASPSMS, dazu Glocke und in der Windows-App eine Systemmeldung.
- **Antwort im CRM** mit den Knöpfen «Erledige es» oder «Nicht» (Link in der SMS).
- Claude arbeitet als **geplante Aufgabe stündlich 7 bis 19 Uhr** und erreicht die Datenbank nur über die Edge
  Function `helpdesk` mit eigenem Schlüssel (lesen, einschätzen, nach Entscheid abschliessen).

## Verworfen

- **WhatsApp Business:** braucht Meta-Business-Prüfung, eigene Nummer und genehmigte Vorlagen, kostet pro Gespräch.
  Später nachrüstbar, der Ablauf bleibt gleich.
- **Antwort per SMS:** ASPSMS empfängt keine Antworten ohne eigene Empfangsnummer.
- **Claude-App als Kanal:** Chris sieht sie nicht als Pop-up.
- **GitHub-Issues als Ablage:** das Repository ist öffentlich, Meldungen enthalten Namen.
