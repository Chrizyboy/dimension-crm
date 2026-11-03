import type { TFunction } from 'i18next'
import { formatDatum } from '@/lib/format'
import { adresse } from '../lib/anzeige'
import { eingaben, rechne } from '../lib/rechner'
import type { Grossprojekt, GrossprojektRegeln } from '../types'
import type { Absender } from './dokumente'
import { fuss, neuesPdf } from './pdfBausteine'

const chf = (rappen: number) =>
  `CHF ${Math.round(rappen / 100)
    .toLocaleString('de-CH')
    .replace(/\u2019/g, "'")}`
const zahl = (n: number) =>
  Math.round(n)
    .toLocaleString('de-CH')
    .replace(/\u2019/g, "'")

/**
 * Potenzialanalyse für den Kunden in seiner Sprache: Anlage, Stromkosten heute und mit Solarstrom, Ersparnis, nächste
 * Schritte. Nennt nur Dimension Solaire (Antwort Chris 03.11.2026), nie den Finanzierungspartner und nie unsere
 * Marge. Zahlen aus dem Rechner der Akte, damit PDF und Bildschirm übereinstimmen.
 */
export async function potenzialPdf(
  g: Grossprojekt,
  regeln: GrossprojektRegeln | undefined,
  absender: Absender,
  t: TFunction,
): Promise<Uint8Array> {
  const p = (k: string, o?: Record<string, unknown>) => t(`grossprojekte.pdf.${k}`, o ?? {})
  const s = await neuesPdf(p('titel'), g.sprache, absender)
  const e = eingaben(g, regeln)
  const r = rechne(e)
  const jahre = g.youdera.laufzeit_jahre ?? regeln?.annahmen?.laufzeit_jahre ?? 25

  s.text(p('titel'), 50, { groesse: 17, fett: true })
  s.y -= 20
  s.text(g.bauherr ?? g.titel, 50, { groesse: 11, fett: true })
  s.text(formatDatum(new Date()), 545, { rechts: true, grau: true })
  s.y -= 14
  s.text(adresse(g), 50, { grau: true })
  s.y -= 24
  s.absatz(p('einleitung', { firma: absender.firma }), 50, 495)

  s.abschnitt(p('anlage'))
  if (g.dachflaeche_m2) s.zeile(p('dach'), `${zahl(g.dachflaeche_m2)} m²`)
  s.zeile(p('leistung'), `${zahl(e.kwp)} kWp`)
  s.zeile(p('ertrag'), `${zahl(r.ertrag_kwh)} kWh`)
  s.zeile(p('eigen'), `${zahl(r.eigen_kwh)} kWh`)

  s.abschnitt(p('kosten'))
  s.zeile(p('heute'), chf(r.heute_rappen))
  s.zeile(p('mit'), chf(r.mit_rappen))
  s.zeile(p('preise', { netz: e.strompreis_rp.toFixed(1), solar: e.preis_rp.toFixed(1) }), '')
  s.y -= 4
  s.zeile(p('ersparnis'), chf(r.ersparnis_rappen), { fett: true, gruen: r.ersparnis_rappen > 0 })
  s.zeile(p('ueberLaufzeit', { jahre }), chf(r.ersparnis_rappen * jahre), { fett: true })
  s.zeile(p('investition'), p('investitionWert'))

  s.abschnitt(p('vorteile'))
  for (const k of ['vorteil1', 'vorteil2', 'vorteil3', 'vorteil4']) s.absatz(`•  ${p(k)}`, 56, 485)

  s.abschnitt(p('weiter'))
  for (const [i, k] of ['schritt1', 'schritt2', 'schritt3', 'schritt4'].entries()) {
    s.absatz(`${String(i + 1)}.  ${p(k)}`, 56, 485)
  }

  s.y -= 10
  s.absatz(p('hinweis'), 50, 495, { groesse: 8, grau: true })
  s.y -= 14
  s.platz(50)
  s.text(p('kontakt'), 50)
  s.y -= 14
  s.text(absender.person ?? absender.firma, 50, { fett: true })
  s.y -= 13
  const wege = [absender.telefon, absender.person_email ?? absender.email].filter(Boolean).join(' · ')
  if (wege) s.text(wege, 50, { grau: true })
  fuss(s, absender)
  return s.doc.save()
}

/** Dateiname, z. B. «Potenzialanalyse GP-2026-0012.pdf». */
export function potenzialName(g: Pick<Grossprojekt, 'nummer'>, t: TFunction): string {
  return `${t('grossprojekte.pdf.titel')} ${g.nummer}.pdf`
}
