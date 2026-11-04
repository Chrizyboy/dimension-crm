/** Ein QR-Etikett: wohin der Code führt und was daneben steht. */
export interface Etikett {
  link: string
  titel: string
  nummer: string | null
}

/** Feste Adresse der Web-App: Etiketten aus der Desktop-App müssen auch am Handy öffnen. */
export const WEB_APP = 'https://work.dimension-solaire.ch/'

/**
 * Adresse hinter dem QR-Code. Aus dem Browser gedruckt nimmt sie die aktuelle Adresse (auch lokal zum Testen),
 * aus der Desktop-App (tauri://, file://) die Web-App, weil das Handy die Desktop-Adresse nicht öffnen kann.
 */
export function etikettLink(
  bezug: { fahrzeug?: string; geraet?: string },
  ort: { protocol: string; origin: string; pathname: string },
): string {
  const basis = ort.protocol.startsWith('http') ? `${ort.origin}${ort.pathname}` : WEB_APP
  const ziel = bezug.fahrzeug ? `fahrzeug=${bezug.fahrzeug}` : `ansicht=geraete&geraet=${bezug.geraet ?? ''}`
  return `${basis}#/fleet?${ziel}`
}

/** Liest Fahrzeug oder Gerät aus einem gescannten Code; fremde Codes ergeben null (nie blind öffnen). */
export function ausCode(code: string): { fahrzeug?: string; geraet?: string } | null {
  const m = /#\/fleet\?(.+)$/.exec(code.trim())
  if (!m?.[1]) return null
  const p = new URLSearchParams(m[1])
  const uuid = /^[0-9a-f-]{36}$/i
  const geraet = p.get('geraet')
  const fahrzeug = p.get('fahrzeug')
  if (geraet && uuid.test(geraet)) return { geraet }
  if (fahrzeug && uuid.test(fahrzeug)) return { fahrzeug }
  return null
}

/** Etiketten pro A4-Bogen (3 × 8, 70 × 37 mm, z. B. Avery Zweckform 3475) und Platz auf dem Bogen. */
export const BOGEN = { spalten: 3, zeilen: 8, breiteMm: 70, hoeheMm: 37 } as const

/** Position eines Etiketts (links unten, in Millimetern ab links oben) für die laufende Nummer. */
export function platz(i: number): { seite: number; xMm: number; yMm: number } {
  const proSeite = BOGEN.spalten * BOGEN.zeilen
  const n = i % proSeite
  const oben = (297 - BOGEN.zeilen * BOGEN.hoeheMm) / 2
  return {
    seite: Math.floor(i / proSeite),
    xMm: (n % BOGEN.spalten) * BOGEN.breiteMm,
    yMm: oben + Math.floor(n / BOGEN.spalten) * BOGEN.hoeheMm,
  }
}
