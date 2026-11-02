import type { Eingang, Offerte, OffertPhase } from '../types'
import { heuteIso, nachfassStand, tageZwischen } from './nachfassen'

/** Arbeitstage (Mo–Fr) von a bis b, a nicht mitgezählt; negativ wird 0. */
export function arbeitstageZwischen(a: string, b: string): number {
  let n = 0
  const d = new Date(`${a.slice(0, 10)}T12:00:00Z`)
  const ende = Date.parse(`${b.slice(0, 10)}T12:00:00Z`)
  while (d.getTime() < ende) {
    d.setUTCDate(d.getUTCDate() + 1)
    const tag = d.getUTCDay()
    if (tag !== 0 && tag !== 6) n++
  }
  return n
}

/** Was auf einer Karte im Arbeitsvorrat warnt, das Dringendste zuerst. */
export type VorratHinweis =
  | { art: 'ueberfaellig'; tage: number }
  | { art: 'rueckfrage'; text: string | null }
  | { art: 'freigabe'; grund: 'rabatt' | 'marge' }
  | { art: 'nachfassen'; tage: number }
  | { art: 'abgelaufen' }

/** Eine Karte im Arbeitsvorrat: ein Lead im Eingang oder eine Offerte. */
export interface VorratKarte {
  schluessel: string
  phase: OffertPhase
  /** Offerte öffnen (offerte) oder den Eintrag in «Neue Offerten» (lead). */
  ziel: { offerte: string } | { lead: string }
  nummer: string | null
  name: string
  ort: string | null
  standort: 'muri' | 'bulle' | null
  betragRappen: number | null
  kwp: number | null
  person: string | null
  chance: number | null
  /** Datum, ab dem die Karte in der Spalte wartet (Termin, Angebot, Entscheid). */
  seit: string | null
  richtofferte: boolean
  hinweis: VorratHinweis | null
  variante: string | null
  anzahlVarianten: number
}

function eingangPhase(e: Eingang): OffertPhase {
  if (e.status === 'pruefung') return 'pruefen'
  if (e.status === 'bearbeitung') return 'planung'
  return 'zu_offerieren'
}

function wartetSeit(e: Eingang): string | null {
  return e.terminAm?.slice(0, 10) ?? e.zurOfferteAm
}

/**
 * Karten des Arbeitsvorrats: Leads im Eingang (zu offerieren, in Planung, prüfen) und Offerten bis «gewonnen».
 * Hat ein Lead schon eine Offerte, gilt deren Phase (z. B. «prüfen» wegen Freigabe). Gewonnene nur der letzten
 * `gewonnenTage` Tage, verlorene nie.
 */
export function vorratKarten(
  offerten: Offerte[],
  eingang: Eingang[],
  ziel: { arbeitstage: number; gewonnenTage?: number },
  heute = heuteIso(),
): VorratKarte[] {
  const nachId = new Map(offerten.map((o) => [o.id, o]))
  const karten: VorratKarte[] = []
  for (const e of eingang) {
    const o = e.offerteId ? nachId.get(e.offerteId) : undefined
    const seit = wartetSeit(e)
    const tage = seit ? arbeitstageZwischen(seit, heute) : 0
    const phase = o && o.phase === 'pruefen' ? 'pruefen' : eingangPhase(e)
    const hinweis: VorratHinweis | null =
      e.status === 'rueckfrage'
        ? { art: 'rueckfrage', text: e.rueckfrage }
        : o?.freigabeGrund
          ? { art: 'freigabe', grund: o.freigabeGrund }
          : tage > ziel.arbeitstage
            ? { art: 'ueberfaellig', tage }
            : null
    karten.push({
      schluessel: `l:${e.id}`,
      phase,
      // Wartet die Offerte auf eine Freigabe, öffnet die Karte die Offert-Akte (dort ist «Freigeben»).
      ziel: o?.freigabeGrund ? { offerte: o.id } : { lead: e.id },
      nummer: e.offerteNummer,
      name: e.name,
      ort: e.ort,
      standort: e.standort,
      betragRappen: e.betragRappen,
      kwp: e.kwp,
      person: e.von ?? e.terminPersonName,
      chance: null,
      seit,
      richtofferte: e.richtofferte,
      hinweis,
      variante: o?.variante ?? null,
      anzahlVarianten: o?.varianten.length ?? 0,
    })
  }
  const grenzeGewonnen = ziel.gewonnenTage ?? 14
  for (const o of offerten) {
    if (o.imEingang || o.phase === 'verloren') continue
    if (o.phase === 'gewonnen' && (!o.entscheidAm || tageZwischen(o.entscheidAm, heute) > grenzeGewonnen)) continue
    const n = nachfassStand(o, heute)
    const hinweis: VorratHinweis | null = o.freigabeGrund
      ? { art: 'freigabe', grund: o.freigabeGrund }
      : n && (n.art === 'faellig' || n.art === 'heute')
        ? { art: 'nachfassen', tage: n.tage }
        : o.abgelaufen
          ? { art: 'abgelaufen' }
          : null
    karten.push({
      schluessel: `o:${o.id}`,
      phase: o.phase,
      ziel: { offerte: o.id },
      nummer: o.nummer,
      name: o.name,
      ort: o.ort,
      standort: o.standort,
      betragRappen: o.betragRappen,
      kwp: o.kwp,
      person: o.verantwortlichName,
      chance: o.phase === 'gewonnen' ? null : o.chance,
      seit: o.phase === 'gewonnen' ? o.entscheidAm : o.angebotAm,
      richtofferte: false,
      hinweis,
      variante: o.variante,
      anzahlVarianten: o.varianten.length,
    })
  }
  return karten
}

/** Reihenfolge in einer Spalte: zuerst Hinweise (überfällig, Rückfrage, Freigabe, Nachfassen), dann ältere zuerst. */
export function sortiereKarten(a: VorratKarte, b: VorratKarte): number {
  if (!!a.hinweis !== !!b.hinweis) return a.hinweis ? -1 : 1
  return (a.seit ?? '9999').localeCompare(b.seit ?? '9999')
}

/** Kopfzahlen des Arbeitsvorrats. */
export interface VorratZahlen {
  offenRappen: number
  offenAnzahl: number
  offenKwp: number
  gewichtetRappen: number
  ueberfaellig: number
  nachfassenHeute: number
  terminBisOfferte: number | null
  quote90: number | null
}

/**
 * Kopfzahlen: offen offeriertes Volumen (offeriert + Verhandlung), gewichtet mit der Chance, überfällige Offerten
 * (Termin länger als Ziel her), heute nachzufassen, Ø Arbeitstage Termin bis Angebot und Quote der letzten 90 Tage.
 */
export function vorratZahlen(offerten: Offerte[], karten: VorratKarte[], heute = heuteIso()): VorratZahlen {
  const offen = offerten.filter((o) => o.phase === 'offeriert' || o.phase === 'verhandlung')
  const dauer = offerten
    .filter((o) => o.terminAm && o.angebotAm && tageZwischen(o.angebotAm, heute) <= 90)
    .map((o) => arbeitstageZwischen(o.terminAm ?? '', o.angebotAm ?? ''))
  const entschieden = offerten.filter(
    (o) =>
      (o.phase === 'gewonnen' || o.phase === 'verloren') && o.entscheidAm && tageZwischen(o.entscheidAm, heute) <= 90,
  )
  const gewonnen = entschieden.filter((o) => o.phase === 'gewonnen').length
  return {
    offenRappen: offen.reduce((s, o) => s + (o.betragRappen ?? 0), 0),
    offenAnzahl: offen.length,
    offenKwp: offen.reduce((s, o) => s + (o.kwp ?? 0), 0),
    gewichtetRappen: Math.round(offen.reduce((s, o) => s + ((o.betragRappen ?? 0) * o.chance) / 100, 0)),
    ueberfaellig: karten.filter((k) => k.hinweis?.art === 'ueberfaellig').length,
    nachfassenHeute: karten.filter((k) => k.hinweis?.art === 'nachfassen').length,
    terminBisOfferte: dauer.length ? Math.round((dauer.reduce((a, b) => a + b, 0) / dauer.length) * 10) / 10 : null,
    quote90: entschieden.length ? Math.round((gewonnen * 100) / entschieden.length) : null,
  }
}
