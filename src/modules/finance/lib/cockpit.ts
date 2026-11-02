import type { Finanzdaten, Reiter, Zahlung } from '../types'
import { plusTage } from './datum'

/** Ein Punkt der Liste «Heute zu tun» im Cockpit: Text-Schlüssel mit Werten, Dringlichkeit und Ziel-Reiter. */
export interface ZuTun {
  schluessel: string
  werte: Record<string, string | number>
  ton: 'kritisch' | 'warnung' | 'info'
  reiter: Reiter
  rappen?: number
}

const offenBetrag = (z: Zahlung) => z.offen_rappen ?? z.betrag_rappen ?? 0

/**
 * Was Buchhaltung und Geschäftsleitung heute erledigen sollten, das Dringendste zuerst: Skonto läuft ab, Betreibung
 * droht, Freigaben, Zahllauf wartet, Visum zu lange offen, Kontostand alt, MWST fällig, Posten ohne Gesellschaft.
 */
export function heuteZuTun(d: Finanzdaten, heute: string, ichId: string | null): ZuTun[] {
  const liste: ZuTun[] = []
  const offen = d.zahlungen.filter((z) => z.status === 'offen')

  const skonto = offen.filter(
    (z) => z.skonto_bis && z.skonto_rappen && z.skonto_bis >= heute && z.skonto_bis <= plusTage(heute, 2) && !z.zahllauf_id,
  )
  if (skonto.length)
    liste.push({
      schluessel: 'skonto',
      werte: { count: skonto.length, betrag: skonto.reduce((s, z) => s + (z.skonto_rappen ?? 0), 0) },
      ton: 'kritisch',
      reiter: 'zahllauf',
    })
  const betreibung = offen.filter((z) => z.prioritaet === 'betreibung')
  if (betreibung.length)
    liste.push({
      schluessel: 'betreibung',
      werte: { count: betreibung.length, betrag: betreibung.reduce((s, z) => s + offenBetrag(z), 0) },
      ton: 'kritisch',
      reiter: 'lieferanten',
    })
  const freigabe = offen.filter((z) => z.pruefung === 'freigabe')
  if (freigabe.length)
    liste.push({
      schluessel: 'freigabe',
      werte: { count: freigabe.length, betrag: freigabe.reduce((s, z) => s + offenBetrag(z), 0) },
      ton: 'warnung',
      reiter: 'lieferanten',
    })
  for (const zl of d.zahllaeufe.filter((x) => x.status === 'zur_freigabe')) {
    const z = d.zahlungen.filter((x) => x.zahllauf_id === zl.id)
    liste.push({
      schluessel: zl.vorbereitet_von === ichId ? 'zahllaufWartet' : 'zahllaufFreigeben',
      werte: {
        count: z.length,
        betrag: z.reduce((s, x) => s + offenBetrag(x), 0),
        datum: zl.ausfuehren_am,
        firma: d.firmen.find((f) => f.id === zl.firma_id)?.name ?? '',
      },
      ton: 'warnung',
      reiter: 'zahllauf',
    })
  }
  const freigegeben = d.zahllaeufe.filter((x) => x.status === 'freigegeben' && x.ausfuehren_am <= heute)
  if (freigegeben.length)
    liste.push({ schluessel: 'zahllaufAusfuehren', werte: { count: freigegeben.length }, ton: 'warnung', reiter: 'zahllauf' })
  const visumAlt = offen.filter(
    (z) => z.pruefung === 'visum' && Boolean(z.erstellt_am) && (z.erstellt_am ?? '').slice(0, 10) < plusTage(heute, -5),
  )
  if (visumAlt.length)
    liste.push({ schluessel: 'visumAlt', werte: { count: visumAlt.length }, ton: 'warnung', reiter: 'lieferanten' })
  const klaeren = offen.filter((z) => z.pruefung === 'klaeren')
  if (klaeren.length) liste.push({ schluessel: 'klaeren', werte: { count: klaeren.length }, ton: 'warnung', reiter: 'lieferanten' })
  for (const k of d.konten.filter((x) => x.aktiv)) {
    if (!k.stand_am || k.stand_am < plusTage(heute, -4))
      liste.push({
        schluessel: k.stand_am ? 'kontoAlt' : 'kontoFehlt',
        werte: { konto: k.name, datum: k.stand_am ?? '' },
        ton: 'warnung',
        reiter: 'abschluss',
      })
  }
  if (d.konten.length === 0) liste.push({ schluessel: 'kontenFehlen', werte: {}, ton: 'warnung', reiter: 'abschluss' })
  for (const m of d.mwst) {
    if (m.bezahlt_am || m.zahllast_rappen <= 0 || m.bis >= heute || m.faellig_am > plusTage(heute, 45)) continue
    liste.push({
      schluessel: m.verbindlich ? 'mwst' : 'mwstSchaetzung',
      werte: {
        periode: m.periode,
        firma: d.firmen.find((f) => f.id === m.firma_id)?.name ?? '',
        betrag: m.zahllast_rappen,
        datum: m.faellig_am,
      },
      ton: 'info',
      reiter: 'abschluss',
    })
  }
  const ohneFirma = offen.filter((z) => !z.firma_id).length
  if (ohneFirma && d.firmen.length > 1)
    liste.push({ schluessel: 'ohneFirma', werte: { count: ohneFirma }, ton: 'info', reiter: 'lieferanten' })
  return liste
}

/** Offene Kundenrechnungen nach Alter der Fälligkeit (nicht fällig, 1–30, 31–60, über 60 Tage). */
export function nachAlter(rechnungen: Finanzdaten['rechnungen'], heute: string) {
  const stufen = [
    { schluessel: 'nichtFaellig', anzahl: 0, rappen: 0 },
    { schluessel: 'bis30', anzahl: 0, rappen: 0 },
    { schluessel: 'bis60', anzahl: 0, rappen: 0 },
    { schluessel: 'ueber60', anzahl: 0, rappen: 0 },
  ]
  for (const r of rechnungen) {
    const f = r.faellig_am
    const i = !f || f >= heute ? 0 : f >= plusTage(heute, -30) ? 1 : f >= plusTage(heute, -60) ? 2 : 3
    const s = stufen[i]
    if (!s) continue
    s.anzahl++
    s.rappen += r.offen_rappen
  }
  return stufen
}

/**
 * Vorschlag für einen Zahllauf einer Gesellschaft am Datum: geprüfte, offene Rechnungen, die bis eine Woche nach
 * dem Datum fällig sind, deren Skonto noch läuft oder die gemahnt sind. Skonto und Betreibung zuerst.
 */
export function zahllaufKandidaten(zahlungen: Zahlung[], firmaId: string, datum: string) {
  const bis = plusTage(datum, 7)
  return zahlungen
    .filter(
      (z) =>
        z.status === 'offen' &&
        z.pruefung === 'bereit' &&
        !z.zahllauf_id &&
        z.firma_id === firmaId &&
        z.kategorie !== 'Lohn' &&
        (!z.faellig_am ||
          z.faellig_am <= bis ||
          (z.skonto_bis !== null && z.skonto_bis >= datum) ||
          z.prioritaet === 'mahnung' ||
          z.prioritaet === 'betreibung'),
    )
    .map((z) => {
      const mitSkonto = Boolean(z.skonto_bis && z.skonto_bis >= datum && z.skonto_rappen)
      return { z, mitSkonto, rappen: offenBetrag(z) - (mitSkonto ? (z.skonto_rappen ?? 0) : 0) }
    })
    .sort(
      (a, b) =>
        Number(b.z.prioritaet === 'betreibung') - Number(a.z.prioritaet === 'betreibung') ||
        Number(b.mitSkonto) - Number(a.mitSkonto) ||
        (a.z.faellig_am ?? '0').localeCompare(b.z.faellig_am ?? '0'),
    )
}
