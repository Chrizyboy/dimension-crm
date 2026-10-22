import type { ImportZeile } from '../types'

type Zelle = string | number | boolean | Date | null | undefined

/** Schreibweisen der Hersteller im Excel → Name in der Preisliste (V233 PC_BRAND). */
const HERSTELLER: Record<string, string> = {
  'Ja-Soalr': 'JA Solar',
  Fonius: 'Fronius',
  Longi: 'LONGi',
  Trina: 'Trina Solar',
  Solitek: 'SoliTek',
  Jinko: 'Jinko Solar',
}

/** Gruppen im Blatt «UK» → Kategorie und Systemname (V233 PC_UK). */
const UNTERKONSTRUKTION: Record<string, [string, string]> = {
  'UK Inndach Soltop': ['indach_systeme', 'Soltop SwissSolarRoof'],
  'SolarModul FIT54': ['indach_systeme', 'Gasser Ceramic FIT54'],
  'SolarZiegel PAN': ['indach_systeme', 'Gasser Ceramic Solarziegel PAN'],
  'UK K2': ['unterkonstruktion', 'K2 Systems'],
  'Ernst Schweizer': ['unterkonstruktion', 'Ernst Schweizer (Flachdach)'],
  'UK Soltop Duramont Short Profil de serrage': ['unterkonstruktion', 'Soltop Duramont (Trapezblech)'],
}

/** Kategorie eines Artikels aus dem Blatt «WR» nach seinem Namen (V233 pcKatWr). */
export function kategorieAusWrName(name: string): string {
  const s = name.toLowerCase()
  if (/optimi[sz]er|merc-600/.test(s)) return 'optimierer'
  if (/charger|evac|evdc|easee|charge |charge$|rfid|cableholder|ladekabel/.test(s)) return 'ladestationen'
  if (
    /kabelset home batt|top cover kit|floor stand|luna|battery|batterie|bat-|bat 10|b-box|sonnenbatterie|reserva|modubasic/.test(
      s,
    )
  )
    return 'batteriespeicher'
  if (/gak|ac-schalter/.test(s)) return 'schutz_verteilung'
  if (/q-cable|q-term|q-seal|q-conn|et-clip|q-disc|q-25-raw|cable set|kit de c|installation kit/.test(s))
    return 'kabel_montagezubehör'
  if (
    /dongle|smartassistant|power sensor|smartguard|meter|gateway|solarmanager|brconnect|system controller|backup interface|sensor/.test(
      s,
    )
  )
    return 'energiemanagement_zaehler'
  return 'wechselrichter'
}

/** Leistung in Wp aus dem Modulnamen, z. B. «JA Solar JAM54D40 440 Wp» oder «A480-MAH54Mw» (V233 pcWp). */
export function wpAusName(name: string): number | null {
  const muster = [
    /(\d{3})\s*W(?:p)?\b/,
    /-(\d{3})M\b/,
    /\bA(\d{3})-/,
    /TSM-(\d{3})/,
    /-(\d{3})\//,
    /JKM(\d{3})/,
    /-(\d{3})M/,
    /\b(\d{3})M\b/,
  ]
  for (const m of muster) {
    const t = m.exec(name)
    if (t?.[1]) return Number(t[1])
  }
  return null
}

const zahl = (z: Zelle): number | null => (typeof z === 'number' && Number.isFinite(z) ? z : null)
const leer = (z: Zelle) => z === null || z === undefined || z === ''

/**
 * Liest die Blätter «VK Berechnung Module / WR / UK» (V89, V233 pcParseWorkbook). Spalten: Art.-Nr., Name,
 * Brutto-EK, Rabatt, EK, Marge, (frei), Skonto. Eine Zeile nur mit Text in Spalte A ist ein Gruppentitel und
 * setzt den Hersteller für die folgenden Zeilen. Fehlt der EK, gilt Brutto × (1 − Rabatt).
 */
export function leseVkBerechnung(
  blaetter: readonly { sheet: string; data: readonly (readonly Zelle[])[] }[],
): ImportZeile[] {
  const aus: ImportZeile[] = []
  for (const b of blaetter) {
    const s = b.sheet.toLowerCase()
    if (!s.includes('berechnung')) continue
    const art = s.includes('modul') ? 'mod' : s.includes('wr') ? 'wr' : s.includes('uk') ? 'uk' : null
    if (!art) continue
    let gruppe: string | null = null
    const zeilen = b.data.filter((z) => z.some((c) => !leer(c)))
    zeilen.forEach((z, i) => {
      if (i === 0) return
      const [a, name, brutto, rabatt, ek, marge, , skonto] = z
      if (!leer(a) && leer(name) && typeof a !== 'number' && leer(brutto) && leer(ek)) {
        if (i > 1) gruppe = String(a).trim()
        return
      }
      if (leer(name)) return
      const n = String(name).trim()
      const g = gruppe ?? ''
      const [kategorie, hersteller] =
        art === 'mod'
          ? ['module', HERSTELLER[g] ?? g]
          : art === 'wr'
            ? [kategorieAusWrName(n), HERSTELLER[g] ?? g]
            : (UNTERKONSTRUKTION[g] ?? ['unterkonstruktion', g])
      const b0 = zahl(brutto)
      const r0 = zahl(rabatt)
      const ekFr = zahl(ek) ?? (b0 !== null ? b0 * (1 - (r0 ?? 0)) : null)
      aus.push({
        artikelnummer: leer(a) ? '' : String(a).trim(),
        name: n,
        kategorie,
        hersteller_gruppe: hersteller,
        leistung_w: kategorie === 'module' || /PV-Modul|Solarmodul|Solarziegel/.test(n) ? wpAusName(n) : null,
        ek_rappen: ekFr === null ? null : Math.round(ekFr * 100),
        marge: zahl(marge) ?? 0.25,
        skonto: zahl(skonto) ?? 0.015,
        rabatt: r0,
      })
    })
  }
  return aus
}
