import type { Abwesenheit, Einsatz, EinsatzArt, Person, Projekt, Subunternehmer } from '../types'
import { alsDatum, alsIso, plusTage, ueberschneidet } from './zeitplan'

/**
 * Zeilen und Balken des Zeitplans, unabhängig von der Darstellung (PC-Raster, Handy-Agenda, Druck).
 * Zwei Sichten: «Baustellen» (eine Zeile je Baustelle) und «Team» (eine Zeile je Person, dazu Subunternehmer).
 * Konflikte (abwesend oder doppelt eingeplant) werden hier einmal berechnet und überall gleich gezeigt.
 */

/** Was ein Balken zeigt: ein Einsatz oder eine Abwesenheit (nur in der Team-Sicht). */
export type BalkenArt = EinsatzArt | 'abwesend'

/** Eine Person mit Konflikt in einem Einsatz und der Grund. */
export interface Konflikt {
  kuerzel: string
  grund: 'abwesend' | 'doppelt'
}

/** Ein Balken im Zeitplan. */
export interface PlanBalken {
  id: string
  art: BalkenArt
  von: string
  bis: string
  /** Text im Balken (Team-Kürzel oder Kunde). */
  text: string
  projekt: Projekt | null
  einsatz: Einsatz | null
  /** Personen mit Konflikt: abwesend oder am selben Tag auf einer anderen Baustelle. */
  konflikt: Konflikt[]
  /** Spur innerhalb der Zeile, wenn sich Balken überlappen (0 = oben). */
  spur: number
}

/** Eine Zeile im Zeitplan. */
export interface PlanZeile {
  id: string
  titel: string
  unter: string
  projekt: Projekt | null
  balken: PlanBalken[]
  spuren: number
}

/** Zeilen unter einer Überschrift (Standort oder Team/Subunternehmer). */
export interface PlanGruppe {
  id: string
  titel: string
  zeilen: PlanZeile[]
}

/** Rollen, die in der Team-Sicht immer eine Zeile bekommen, auch ohne Einsatz. */
const MONTAGE_ROLLEN = new Set(['montage', 'monteur'])

/** Überlappende Balken auf Spuren verteilen, damit nichts verdeckt wird; gibt die Anzahl Spuren zurück. */
export function spurenVerteilen(balken: PlanBalken[]): number {
  const enden: string[] = []
  for (const b of [...balken].sort((a, c) => a.von.localeCompare(c.von) || c.bis.localeCompare(a.bis))) {
    const frei = enden.findIndex((e) => e < b.von)
    b.spur = frei === -1 ? enden.length : frei
    enden[b.spur] = b.bis
  }
  return Math.max(1, enden.length)
}

/**
 * Konflikte eines Einsatzes: Personen, die in der Zeit abwesend sind oder an einem gemeinsamen Tag in einem
 * anderen festen Einsatz stehen. «Voraussichtlich» zählt nicht als Doppelbelegung.
 */
export function einsatzKonflikte(
  e: Einsatz,
  alle: Einsatz[],
  abwesend: Abwesenheit[],
): { person: string; grund: Konflikt['grund'] }[] {
  return e.personen.flatMap((p): { person: string; grund: Konflikt['grund'] }[] => {
    if (abwesend.some((a) => a.person_id === p && ueberschneidet(a, e))) return [{ person: p, grund: 'abwesend' }]
    const doppelt =
      e.art !== 'geplant' &&
      alle.some((x) => x.id !== e.id && x.art !== 'geplant' && x.personen.includes(p) && ueberschneidet(x, e))
    return doppelt ? [{ person: p, grund: 'doppelt' }] : []
  })
}

/** Konflikte als Satz («LB abwesend, MK doppelt eingeplant»), mit der Übersetzung der Ansicht. */
export function konfliktText(k: Konflikt[], t: (schluessel: string, werte: { wer: string }) => string): string {
  return k.map((x) => t(`projekte.zeitplan.grund_${x.grund}`, { wer: x.kuerzel })).join(', ')
}

interface Eingabe {
  projekte: Projekt[]
  einsaetze: Einsatz[]
  abwesend: Abwesenheit[]
  personen: Person[]
  subunternehmer: Subunternehmer[]
}

function helfer({ projekte, einsaetze, abwesend, personen, subunternehmer }: Eingabe) {
  const kuerzel = (id: string) => personen.find((p) => p.id === id)?.kuerzel ?? '?'
  const sub = (id: string | null) => subunternehmer.find((s) => s.id === id)?.name ?? null
  const projekt = (id: string) => projekte.find((p) => p.id === id) ?? null
  const team = (e: Einsatz) =>
    e.art === 'extern' ? (sub(e.subunternehmer_id) ?? e.notiz ?? '') : e.personen.map(kuerzel).join(' ')
  const balken = (e: Einsatz, text: string): PlanBalken => ({
    id: e.id,
    art: e.art,
    von: e.von,
    bis: e.bis,
    text,
    projekt: projekt(e.projekt_id),
    einsatz: e,
    konflikt: einsatzKonflikte(e, einsaetze, abwesend).map((k) => ({ kuerzel: kuerzel(k.person), grund: k.grund })),
    spur: 0,
  })
  return { kuerzel, sub, projekt, team, balken }
}

/** Sicht «Baustellen»: je Standort die Baustellen mit Einsätzen im Zeitraum, nach erstem Einsatz sortiert. */
export function baustellenSicht(
  e: Eingabe & { standorte: { id: string; name: string }[]; passt: (p: Projekt) => boolean },
): PlanGruppe[] {
  const h = helfer(e)
  const zeilen: PlanZeile[] = []
  for (const p of e.projekte) {
    if (!e.passt(p)) continue
    const eigene = e.einsaetze.filter((x) => x.projekt_id === p.id)
    if (eigene.length === 0) continue
    const balken = eigene.map((x) => h.balken(x, h.team(x)))
    zeilen.push({
      id: p.id,
      titel: p.kunde,
      unter: [p.ort, p.leistung_kwp ? `${String(p.leistung_kwp)} kWp` : null].filter(Boolean).join(' · '),
      projekt: p,
      balken,
      spuren: spurenVerteilen(balken),
    })
  }
  const erster = (z: PlanZeile) => z.balken.map((b) => b.von).sort()[0] ?? ''
  zeilen.sort((a, b) => erster(a).localeCompare(erster(b)))
  return e.standorte
    .map((s) => ({ id: s.id, titel: s.name, zeilen: zeilen.filter((z) => z.projekt?.standort_id === s.id) }))
    .filter((g) => g.zeilen.length > 0)
}

/**
 * Sicht «Team»: je Person eine Zeile mit ihren Baustellen und Abwesenheiten, darunter die Subunternehmer.
 * Monteure stehen immer da (auch frei), andere nur, wenn sie eingeplant sind.
 */
export function teamSicht(
  e: Eingabe & { passt: (p: Projekt) => boolean; abwesendText: (art: string) => string },
): PlanGruppe[] {
  const h = helfer(e)
  const einsaetze = e.einsaetze.filter((x) => {
    const p = h.projekt(x.projekt_id)
    return p ? e.passt(p) : false
  })
  const titel = (x: Einsatz) => h.projekt(x.projekt_id)?.kunde ?? ''
  const team: PlanZeile[] = e.personen
    .filter((p) => MONTAGE_ROLLEN.has(p.rolle ?? '') || einsaetze.some((x) => x.personen.includes(p.id)))
    .map((p) => {
      const balken = [
        // In der Zeile einer Person zählt nur ihr eigener Konflikt, nicht der eines Kollegen im selben Einsatz.
        ...einsaetze
          .filter((x) => x.personen.includes(p.id))
          .map((x) => {
            const b = h.balken(x, titel(x))
            return { ...b, konflikt: b.konflikt.filter((k) => k.kuerzel === p.kuerzel) }
          }),
        ...e.abwesend
          .filter((a) => a.person_id === p.id)
          .map<PlanBalken>((a) => ({
            id: `abw-${a.id}`,
            art: 'abwesend',
            von: a.von,
            bis: a.bis,
            text: e.abwesendText(a.art),
            projekt: null,
            einsatz: null,
            konflikt: [],
            spur: 0,
          })),
      ]
      return { id: p.id, titel: p.name, unter: p.kuerzel, projekt: null, balken, spuren: spurenVerteilen(balken) }
    })
  const subs = new Map<string, Einsatz[]>()
  for (const x of einsaetze.filter((y) => y.art === 'extern')) {
    const name = h.team(x) || '–'
    subs.set(name, [...(subs.get(name) ?? []), x])
  }
  const extern: PlanZeile[] = [...subs].map(([name, liste]) => {
    const balken = liste.map((x) => h.balken(x, titel(x)))
    return { id: `sub-${name}`, titel: name, unter: '', projekt: null, balken, spuren: spurenVerteilen(balken) }
  })
  return [
    { id: 'team', titel: 'team', zeilen: team },
    { id: 'extern', titel: 'extern', zeilen: extern },
  ].filter((g) => g.zeilen.length > 0)
}

/** Baustellen, die noch keinen Bautermin haben (Status «Termin ausstehend», kein fester Einsatz). */
export function zuPlanen(projekte: Projekt[]): Projekt[] {
  return projekte
    .filter((p) => p.status === 'im_bau' && (p.bau_status ?? 'ausstehend') === 'ausstehend' && !p.baubeginn)
    .sort((a, b) => (a.unterzeichnet_am ?? '').localeCompare(b.unterzeichnet_am ?? ''))
}

/** Einsatz um `tage` Kalendertage verschieben (`nurEnde`: nur das Ende, nie vor den Beginn). */
export function verschoben<T extends { von: string; bis: string }>(e: T, tage: number, nurEnde = false): T {
  const bis = alsIso(plusTage(alsDatum(e.bis), tage))
  if (nurEnde) return { ...e, bis: bis < e.von ? e.von : bis }
  return { ...e, von: alsIso(plusTage(alsDatum(e.von), tage)), bis }
}

/** Nummer des Tages im Einsatz und Anzahl Tage («Tag 2/3»), nur Werktage. */
export function tagImEinsatz(e: { von: string; bis: string }, tag: string): { nr: number; von: number } {
  let nr = 0
  let gesamt = 0
  for (let d = alsDatum(e.von); d <= alsDatum(e.bis); d = plusTage(d, 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue
    gesamt++
    if (alsIso(d) <= tag) nr = gesamt
  }
  return { nr: Math.max(1, nr), von: Math.max(1, gesamt) }
}
