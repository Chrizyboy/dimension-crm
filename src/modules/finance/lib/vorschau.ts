import type {
  Bewegung,
  Finanzdaten,
  Kontostand,
  LiquiditaetEinstellungen,
  MaterialPosition,
  Prioritaet,
  Szenario,
  Wahrscheinlichkeit,
  Woche,
} from '../types'
import { fixTermine, kalenderwoche, montag, plusTage, wochenZwischen } from './datum'

/**
 * Liquiditätsvorschau wie in V233: alle offenen Ausgänge (Zahlungen, Material je Baustelle, Fixkosten) und
 * Eingänge (offene Rechnungen, Tranchen ohne Rechnung, von Hand erwartete) Woche für Woche ab dem Kontostand.
 * Woche 0 ist diese Woche, mit allem Überfälligen und allem ohne Datum. Reine Rechnung ohne Datenbank.
 */

const MWST_STANDARD = 8.1

/** Anzahl Wochen der Vorschau (4–26, Standard 12). */
export const wochenAnzahl = (e: LiquiditaetEinstellungen) => Math.max(4, Math.min(26, e.wochen ?? 12))

/** Franken (Zahl oder Text wie «1'234.50») in Rappen. */
export function rappen(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : Number(v.replace(/['’\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Betrag einer Material-Position in Rappen: EK plus Transport, bei «exkl.» mit MWST. */
export function materialRappen(p: MaterialPosition, mwst = MWST_STANDARD): number {
  const basis = rappen(p.ek) + rappen(p.transport)
  return Math.round(p.exkl ? basis * (1 + mwst / 100) : basis)
}

/** Kontostand in Rappen (neue Einträge in Rappen, ältere aus V233 in Franken). */
export function kontostandRappen(k: Kontostand): number {
  return k.betrag_rappen ?? rappen(k.betrag)
}

const PRIO = new Set<string>(['normal', 'wichtig', 'mahnung', 'betreibung'])
const prio = (p: string | null): Prioritaet => (p && PRIO.has(p) ? (p as Prioritaet) : 'normal')

/** Alle offenen Bewegungen; «aus» (nicht einrechnen) fällt weg. */
export function bewegungen(d: Finanzdaten, heute: string): Bewegung[] {
  const e = d.einstellungen
  const liste: Bewegung[] = []
  const dazu = (b: Omit<Bewegung, 'spaet'>) => {
    if (!b.rappen || b.wahrscheinlichkeit === 'aus') return
    liste.push({ ...b, spaet: Boolean(b.datum && b.datum < heute) })
  }
  const basis = { prioritaet: 'normal' as Prioritaet, wahrscheinlichkeit: 'sicher' as Wahrscheinlichkeit, lohn: false }

  for (const z of d.zahlungen) {
    if (z.status === 'bezahlt') continue
    dazu({
      ...basis,
      richtung: -1,
      rappen: z.offen_rappen ?? z.betrag_rappen ?? 0,
      datum: z.geplant_am ?? z.faellig_am,
      titel: z.firma ?? '–',
      zusatz: [z.text, z.rechnung_nr].filter(Boolean).join(' · '),
      quelle: 'zahlung',
      id: z.id,
      kategorie: z.kategorie ?? 'Sonstiges',
      prioritaet: prio(z.prioritaet),
      faellig: z.faellig_am,
      geplant: Boolean(z.geplant_am),
      lohn: z.kategorie === 'Lohn',
    })
  }

  const vorlauf = e.vorlauf ?? 5
  for (const m of d.material) {
    if (m.archiviert) continue
    m.positionen.forEach((p, idx) => {
      if (p.status === 'bezahlt') return
      // Ohne geplantes Datum: zahlbar bis, sonst einige Tage vor dem Bautermin (Vorkasse beim Grosshändler).
      const datum =
        p.geplantAm || m.geplant_am || m.zahlbar_bis || (m.bautermin ? plusTage(m.bautermin, -vorlauf) : null)
      dazu({
        ...basis,
        richtung: -1,
        rappen: materialRappen(p, e.mwst),
        datum,
        titel: `Material ${m.baustelle ?? ''}`.trim(),
        zusatz: [p.position, p.lieferant].filter(Boolean).join(' · '),
        quelle: 'material',
        id: m.id,
        idx,
        kategorie: 'Material',
        faellig: m.zahlbar_bis,
        geplant: Boolean(p.geplantAm || m.geplant_am),
      })
    })
  }

  // Fixkosten: jeder Termin im Zeitraum, ausser er ist schon als Zahlung erfasst (bezahlt oder verschoben).
  const horizont = plusTage(heute, 7 * wochenAnzahl(e) + 7)
  const erfasst = new Set(
    d.zahlungen.filter((z) => z.fixkosten_id).map((z) => `${z.fixkosten_id ?? ''}|${z.monat ?? ''}`),
  )
  for (const f of d.fixkosten) {
    if (!f.aktiv || !f.betrag_rappen) continue
    for (const datum of fixTermine(f, plusTage(heute, -40), horizont)) {
      const monat = datum.slice(0, 7)
      if (erfasst.has(`${f.id}|${monat}`)) continue
      dazu({
        ...basis,
        richtung: -1,
        rappen: f.betrag_rappen,
        datum,
        titel: f.bezeichnung ?? f.gruppe ?? 'Fixkosten',
        zusatz: [f.gruppe, f.detail].filter(Boolean).join(' · '),
        quelle: 'fix',
        id: f.id,
        monat,
        kategorie: f.gruppe ?? 'Fixkosten',
        faellig: datum,
        geplant: true,
        lohn: f.gruppe === 'Löhne',
      })
    }
  }

  const ov = e.ov ?? {}
  for (const r of d.rechnungen) {
    const a = ov[`rechnung:${r.id}`] ?? {}
    dazu({
      ...basis,
      richtung: 1,
      rappen: r.offen_rappen,
      datum: a.date ?? r.faellig_am,
      titel: r.kunde,
      zusatz: [r.projekt_nummer, r.nummer ? `Rechnung ${r.nummer}` : null].filter(Boolean).join(' · '),
      quelle: 'rechnung',
      id: r.id,
      kategorie: 'Kunde',
      wahrscheinlichkeit: a.prob ?? 'wahrscheinlich',
      faellig: r.faellig_am,
      geplant: Boolean(a.date),
    })
  }
  for (const t of d.tranchen) {
    const a = ov[`tranche:${t.id}`] ?? {}
    dazu({
      ...basis,
      richtung: 1,
      rappen: t.betrag_rappen,
      datum: a.date ?? t.faellig_am,
      titel: t.kunde ?? '–',
      zusatz: [t.projekt_nummer, t.bezeichnung, 'noch nicht verrechnet'].filter(Boolean).join(' · '),
      quelle: 'tranche',
      id: t.id,
      kategorie: 'Kunde',
      wahrscheinlichkeit: a.prob ?? 'unsicher',
      faellig: t.faellig_am,
      geplant: Boolean(a.date),
    })
  }
  for (const i of d.eingaenge) {
    if (i.status === 'eingegangen') continue
    dazu({
      ...basis,
      richtung: 1,
      rappen: i.betrag_rappen ?? 0,
      datum: i.erwartet_am,
      titel: i.kunde ?? '–',
      zusatz: i.text ?? '',
      quelle: 'eingang',
      id: i.id,
      kategorie: 'Kunde',
      wahrscheinlichkeit: (i.wahrscheinlichkeit as Wahrscheinlichkeit | null) ?? 'wahrscheinlich',
      faellig: i.erwartet_am,
      geplant: false,
    })
  }
  return liste
}

/** Zählt die Bewegung im Szenario? Ausgänge immer; «pess» nur sichere, «real» ohne unsichere, «opt» alle Eingänge. */
export function zaehlt(b: Bewegung, s: Szenario): boolean {
  if (b.richtung < 0) return true
  if (s === 'pess') return b.wahrscheinlichkeit === 'sicher'
  if (s === 'opt') return true
  return b.wahrscheinlichkeit !== 'unsicher'
}

/**
 * Kontostand heute: der eingetragene Saldo, minus seither bezahlte Zahlungen und Material, plus seither
 * eingegangene Kundenzahlungen und erwartete Eingänge. Ohne Eintrag: unbekannt (Warnung in der Übersicht).
 */
export function saldo(d: Finanzdaten): {
  bekannt: boolean
  rappen: number
  basis: number
  seit: string | null
  buchungen: number
} {
  const k = d.einstellungen.saldo
  if (!k || (k.betrag_rappen === undefined && k.betrag === undefined)) {
    return { bekannt: false, rappen: 0, basis: 0, seit: null, buchungen: 0 }
  }
  const basis = kontostandRappen(k)
  const seit = k.datum
  let delta = 0
  let n = 0
  for (const z of d.zahlungen) {
    if (z.status === 'bezahlt' && z.bezahlt_am && z.bezahlt_am > seit) {
      delta -= z.betrag_rappen ?? 0
      n++
    }
  }
  for (const m of d.material) {
    for (const p of m.positionen) {
      if (p.status === 'bezahlt' && p.bezahltAm && p.bezahltAm > seit) {
        delta -= materialRappen(p, d.einstellungen.mwst)
        n++
      }
    }
  }
  for (const i of d.eingaenge) {
    if (i.status === 'eingegangen' && i.eingang_am && i.eingang_am > seit) {
      delta += i.betrag_rappen ?? 0
      n++
    }
  }
  for (const z of d.kundenzahlungen) {
    if (z.datum > seit) {
      delta += z.betrag_rappen
      n++
    }
  }
  return { bekannt: true, rappen: basis + delta, basis, seit, buchungen: n }
}

/** Wochen der Vorschau mit Start- und Endstand; `tiefste` ist die Woche mit dem tiefsten Endstand. */
export function vorschau(
  d: Finanzdaten,
  heute: string,
  szenario: Szenario,
): {
  wochen: Woche[]
  tiefste: Woche | null
  ohneDatum: number
  bewegungen: Bewegung[]
  saldo: ReturnType<typeof saldo>
} {
  const w0 = montag(heute)
  const n = wochenAnzahl(d.einstellungen)
  const s = saldo(d)
  const wochen: Woche[] = Array.from({ length: n }, (_, i) => {
    const von = plusTage(w0, 7 * i)
    return { i, von, bis: plusTage(von, 6), kw: kalenderwoche(von), ein: 0, aus: 0, start: 0, ende: 0, bewegungen: [] }
  })
  const alle = bewegungen(d, heute).filter((b) => zaehlt(b, szenario))
  let ohneDatum = 0
  for (const b of alle) {
    if (!b.datum) ohneDatum++
    const i = !b.datum || b.datum < w0 ? 0 : wochenZwischen(w0, b.datum)
    const w = wochen[i]
    if (!w) continue
    w.bewegungen.push(b)
    if (b.richtung > 0) w.ein += b.rappen
    else w.aus += b.rappen
  }
  let stand = s.rappen
  let tiefste: Woche | null = null
  for (const w of wochen) {
    w.start = stand
    stand += w.ein - w.aus
    w.ende = stand
    if (!tiefste || w.ende < tiefste.ende) tiefste = w
  }
  return { wochen, tiefste, ohneDatum, bewegungen: alle, saldo: s }
}

/** Reihenfolge der Dringlichkeit: Betreibung droht, Mahnung, wichtig, normal. */
export const prioRang = (p: string | null) => ({ betreibung: 0, mahnung: 1, wichtig: 2 })[p ?? ''] ?? 3

/**
 * Zahllauf (V233 «Zahllauf planen»): vom verfügbaren Betrag zuerst Betreibungen und Mahnungen, dann nach
 * Fälligkeit, so lange das Geld reicht. Gibt die vorgeschlagenen IDs zurück.
 */
export function zahllaufVorschlag(
  offene: { id: string; rappen: number; prioritaet: string | null; faellig_am: string | null }[],
  verfuegbar: number,
): string[] {
  let rest = verfuegbar
  const gewaehlt: string[] = []
  const sortiert = [...offene].sort(
    (a, b) =>
      prioRang(a.prioritaet) - prioRang(b.prioritaet) || (a.faellig_am ?? '9').localeCompare(b.faellig_am ?? '9'),
  )
  for (const z of sortiert) {
    if (z.rappen <= rest) {
      gewaehlt.push(z.id)
      rest -= z.rappen
    }
  }
  return gewaehlt
}
