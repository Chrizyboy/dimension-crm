import { plattformName } from '@/lib/plattform'

type SentryModul = typeof import('@sentry/react')

// Sentry wird erst geladen, wenn eine DSN gesetzt ist. Ohne DSN baut Vite Sentry gar nicht erst in die App ein.
let sentry: SentryModul | undefined

/**
 * Startet die Fehlerüberwachung (Sentry, Rechenzentrum EU), falls VITE_SENTRY_DSN gesetzt ist.
 * Ohne DSN passiert nichts – lokal und in Tests wird also nichts gesendet.
 * Es werden nie Kundendaten mitgeschickt: keine Personendaten, keine Eingaben, keine Bildschirmaufnahmen.
 */
export async function starteFehlerueberwachung(): Promise<boolean> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return false
  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn,
    release: `dimension-crm@${__APP_VERSION__}`,
    environment: import.meta.env.MODE,
    // Datensparsam: keine Personen, Cookies, Kopfzeilen, Abfrage-Parameter oder Inhalte von Anfragen.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
    },
    tracesSampleRate: 0,
    initialScope: { tags: { plattform: plattformName() } },
    beforeSend(ereignis) {
      // Sicherheitsnetz: falls doch einmal Personendaten am Fehler hängen, vor dem Senden entfernen.
      delete ereignis.user
      if (ereignis.request) delete ereignis.request.data
      return ereignis
    },
  })
  sentry = Sentry
  return true
}

/** Meldet einen Fehler an die Überwachung und in die Konsole. Ohne aktive Überwachung nur Konsole. */
export function meldeFehler(fehler: unknown, bereich?: string): void {
  console.error(bereich ? `[${bereich}]` : '[Fehler]', fehler)
  sentry?.captureException(fehler, bereich ? { tags: { bereich } } : undefined)
}
