import { passtZurSuche } from '@/lib/kontakt'
import type { Geschaeft, StandBedarf, VerkaufFilter } from '../types'

/** Stände eines Leads ohne Offerte. «Termin gehabt» entsteht von selbst, wenn der Termin vorbei ist. */
const LEAD_STAENDE = ['lead_neu', 'lead_offen', 'lead_spaeter', 'termin', 'kein'] as const
/** Stände einer Offerte (Phase 7 baut die Offerte selbst, der Entscheid lässt sich schon hier festhalten). */
const OFFERT_STAENDE = ['offerte', 'pruefung', 'offeriert', 'nachfassen', 'vertagt', 'angenommen', 'verloren'] as const

/**
 * Wohin ein Geschäft gezogen werden darf. Projekte steuert die Bauplanung (Phase 9);
 * ein Lead kann erst «offeriert» werden, wenn es eine Offerte gibt.
 */
export function erlaubteZiele(g: Pick<Geschaeft, 'projektId' | 'offerteId' | 'verkaufschanceId'>): Set<string> {
  if (g.projektId) return new Set()
  if (g.offerteId) {
    const ziele = new Set<string>(OFFERT_STAENDE)
    if (!g.verkaufschanceId) ziele.delete('pruefung')
    return ziele
  }
  return new Set<string>([...LEAD_STAENDE, 'offerte', 'pruefung'])
}

/** Was beim Wechsel in einen Stand abgefragt werden muss (V170, V200). */
export function standBedarf(von: string, nach: string): StandBedarf {
  switch (nach) {
    case 'kein':
    case 'verloren':
      return 'grund'
    case 'lead_spaeter':
    case 'vertagt':
      return 'datumGrund'
    case 'termin':
      return 'termin'
    case 'offeriert':
      return 'gesendet'
    case 'offerte':
    case 'pruefung':
      // Ohne Besuch zur Offerte: das ist eine Richtofferte und braucht eine Notiz.
      return ['lead_neu', 'lead_offen', 'lead_spaeter'].includes(von) ? 'richtofferte' : 'nichts'
    default:
      return 'nichts'
  }
}

const TAG_MS = 86_400_000

/** Ganze Tage zwischen zwei Daten (ISO), positiv, wenn `bis` später ist. */
export function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(bis.slice(0, 10)) - Date.parse(von.slice(0, 10))) / TAG_MS)
}

/** Heute als ISO-Datum in Schweizer Zeit. */
export function heuteIso(jetzt: Date = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/**
 * Liegt ein neuer oder offener Lead zu lange? V233: rot ab 5 Tagen seit Eingang
 * oder seit dem Datum zum Nachfassen, ohne dass jemand etwas getan hat.
 */
export function istLiegengeblieben(g: Geschaeft, heute: string = heuteIso()): boolean {
  if (g.stand !== 'lead_neu' && g.stand !== 'lead_offen') return false
  const seit = g.wiedervorlageAm ?? g.eingangAm
  if (!seit) return false
  const zuletzt = g.letzterKontakt?.slice(0, 10)
  if (zuletzt && zuletzt >= seit) return tageZwischen(zuletzt, heute) >= 5
  return tageZwischen(seit, heute) >= 5
}

/** «in 3 Tagen», «morgen», «heute», «seit 2 Tagen fällig» (V180). */
export function inTagen(iso: string, heute: string = heuteIso()): { tage: number } {
  return { tage: tageZwischen(heute, iso) }
}

/** Passt ein Geschäft zu Suche und Filtern? Leere Filter lassen alles durch. */
export function passtZuFilter(g: Geschaeft, f: VerkaufFilter): boolean {
  if (f.standorte.length && !f.standorte.includes(g.standort ?? '')) return false
  if (f.personen.length && !f.personen.includes(g.terminPersonId ?? g.personId ?? '')) return false
  if (f.quellen.length && !f.quellen.includes(g.quelle ?? '')) return false
  if (f.regionen.length && !f.regionen.includes(g.regionId ?? '')) return false
  return passtZurSuche(g, f.suche)
}

/** Summen einer Spalte: Anzahl, Wert in Rappen, Leistung in kWp. */
export function summe(liste: readonly Geschaeft[]): { anzahl: number; rappen: number; kwp: number } {
  let rappen = 0
  let kwp = 0
  for (const g of liste) {
    rappen += g.wertRappen ?? 0
    kwp += g.kwp ?? 0
  }
  return { anzahl: liste.length, rappen, kwp: Math.round(kwp * 10) / 10 }
}

/** Ist das Geschäft ein offener Lead (noch keine Offerte, nicht verloren)? */
export function istOffenerLead(g: Geschaeft): boolean {
  return g.verkaufschanceId !== null && g.gruppe === 'lead' && g.stand !== 'kein'
}
