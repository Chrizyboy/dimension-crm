# 0002 – Zusätzlich PWA fürs Handy

**Kontext:** Monteure und Verkauf nutzen das CRM unterwegs am Handy. Tauri liefert nur die Windows-App.

**Entscheid:** Dieselbe Oberfläche wird zusätzlich als installierbare Web-App (PWA, `vite-plugin-pwa`) ausgeliefert. Im Tauri-Build ist der Service Worker abgeschaltet. Freigegeben am 21.10.2026.

**Folgen:** Kein zweiter Code. Jede Ansicht muss auch schmal funktionieren; Playwright testet deshalb immer Desktop und Handy (Pixel 7).
