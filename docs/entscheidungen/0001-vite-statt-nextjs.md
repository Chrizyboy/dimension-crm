# 0001 – Vite + TanStack Router statt Next.js

**Kontext:** Der Bau-Auftrag nannte Next.js. Die App läuft aber als Tauri-Desktop-App und als PWA, beide laden fertige Dateien ohne eigenen Webserver. Die Stärken von Next.js (Server-Rendering, Server-Routen) wären hier ungenutzt bzw. müssten abgeschaltet werden.

**Entscheid:** Vite als Build-Werkzeug, TanStack Router für typsichere Routen, TanStack Query für Daten. Server-Logik liegt in Supabase Edge Functions. Von Chris am 21.10.2026 freigegeben.

**Folgen:** Schnellerer Start und Build, einfachere Tauri-Einbindung, keine «halb abgeschalteten» Next-Funktionen. Ordner `src/app/` bleibt wie im Auftrag für die Routen.
