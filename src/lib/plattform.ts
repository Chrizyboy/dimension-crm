/** Läuft das CRM gerade als Windows-App (Tauri)? Sonst: Browser oder installierte PWA am Handy. */
export function istDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Kurzbezeichnung der Plattform für Anzeige und Fehlerberichte. */
export function plattformName(): 'desktop' | 'web' {
  return istDesktopApp() ? 'desktop' : 'web'
}
