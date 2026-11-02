import type { Ansicht, Kampagne, Newsletter, SocialPost, Werbekampagne, Zweisprachig } from '../types'

/** Ein Eintrag im Marketing-Kalender. */
export interface KalenderEintrag {
  id: string
  datum: string
  art: 'post' | 'mail' | 'messe' | 'frist' | 'thema'
  text: string
  ansicht: Ansicht
  /** Noch nicht freigegeben bzw. nur geplant (blasser). */
  offen?: boolean
}

const tag = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)

/** Alle Tage von bis (ISO), höchstens 31 (lange Kampagnen erscheinen nur an Start und Ende). */
function tage(von: string, bis: string): string[] {
  const aus: string[] = []
  const d = new Date(`${von}T12:00:00Z`)
  const ende = new Date(`${bis}T12:00:00Z`)
  while (d <= ende && aus.length < 31) {
    aus.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return aus
}

/**
 * Sammelt alles, was nach aussen geht, für den Kalender: Social-Posts (geplant oder veröffentlicht), Newsletter
 * (geplant oder gesendet), Serien-Mails und Briefe, Messen (jeder Tag), Ende einer Kampagne als Frist und je Monat
 * das Saison-Thema am 1.
 */
export function kalenderEintraege(d: {
  posts: readonly SocialPost[]
  newsletter: readonly Newsletter[]
  versaende: readonly Pick<Kampagne, 'id' | 'art' | 'betreff' | 'versendet_am'>[]
  kampagnen: readonly Werbekampagne[]
  themen: Record<string, Zweisprachig<string>> | undefined
  sprache: 'de' | 'fr'
  monat: string // JJJJ-MM
}): KalenderEintrag[] {
  const aus: KalenderEintrag[] = []
  for (const p of d.posts) {
    if (p.status === 'erledigt') continue
    const datum = tag(p.veroeffentlicht_am ?? p.geplant_am)
    if (!datum) continue
    aus.push({
      id: `post-${p.id}`,
      datum,
      art: 'post',
      text: p.thema ?? p.idee ?? '–',
      ansicht: 'social',
      offen: p.status !== 'veroeffentlicht',
    })
  }
  for (const n of d.newsletter) {
    const datum = tag(n.versendet_am ?? n.geplant_am)
    if (!datum) continue
    aus.push({ id: `nl-${n.id}`, datum, art: 'mail', text: n.thema, ansicht: 'newsletter', offen: n.status !== 'versendet' })
  }
  for (const v of d.versaende) {
    if (v.art === 'newsletter' || v.art === 'adressliste') continue
    const datum = tag(v.versendet_am)
    if (datum) aus.push({ id: `v-${v.id}`, datum, art: 'mail', text: v.betreff ?? v.art, ansicht: 'anschreiben' })
  }
  for (const k of d.kampagnen) {
    if (k.art === 'messe' && k.start_am) {
      for (const t of tage(k.start_am, k.ende_am ?? k.start_am))
        aus.push({ id: `m-${k.id}-${t}`, datum: t, art: 'messe', text: k.name, ansicht: 'messen' })
    } else if (k.ende_am && k.status !== 'abgeschlossen') {
      aus.push({ id: `f-${k.id}`, datum: k.ende_am, art: 'frist', text: k.name, ansicht: 'kampagnen' })
    }
  }
  const thema = d.themen?.[String(Number(d.monat.slice(5, 7)))]
  if (thema) aus.push({ id: `t-${d.monat}`, datum: `${d.monat}-01`, art: 'thema', text: thema[d.sprache], ansicht: 'social' })
  return aus.sort((a, b) => a.datum.localeCompare(b.datum) || a.art.localeCompare(b.art))
}

/** Raster eines Monats ab Montag: 5 oder 6 Wochen à 7 Tage (ISO-Daten, auch vom Vor- und Folgemonat). */
export function monatsRaster(monat: string): string[] {
  const erster = new Date(`${monat}-01T12:00:00Z`)
  const wochentag = (erster.getUTCDay() + 6) % 7 // Montag = 0
  const start = new Date(erster)
  start.setUTCDate(1 - wochentag)
  const letzter = new Date(Date.UTC(erster.getUTCFullYear(), erster.getUTCMonth() + 1, 0, 12))
  const anzahl = Math.ceil((wochentag + letzter.getUTCDate()) / 7) * 7
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** Monat verschieben (JJJJ-MM, ±n). */
export function monatPlus(monat: string, n: number): string {
  const d = new Date(`${monat}-01T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 7)
}
