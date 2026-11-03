import type { TFunction } from 'i18next'
import { formatDatum } from '@/lib/format'
import { adresse } from '../lib/anzeige'
import { eingaben, rechne } from '../lib/rechner'
import type { Grossprojekt, GrossprojektRegeln } from '../types'
import type { Absender } from './dokumente'
import { fuss, neuesPdf } from './pdfBausteine'

const zahl = (n: number) =>
  Math.round(n)
    .toLocaleString('de-CH')
    .replace(/\u2019/g, "'")

/**
 * Dossier für Youdera: alles, was der Partner für ein Angebot braucht (Objekt, Anlage, Verbrauch, wer entscheidet,
 * Unterlagen, Besichtigung). Nur Fakten, keine Marge. Sprache Deutsch, ausser der Text wird anders übergeben.
 */
export async function dossierPdf(
  g: Grossprojekt,
  regeln: GrossprojektRegeln | undefined,
  absender: Absender,
  t: TFunction,
  sprache: 'de' | 'fr',
): Promise<Uint8Array> {
  const d = (k: string, o?: Record<string, unknown>) => t(`grossprojekte.dossier.${k}`, o ?? {})
  const s = await neuesPdf(d('titel', { nummer: g.nummer }), sprache, absender)
  const e = eingaben(g, regeln)
  const r = rechne(e)
  const ja = (b: boolean) => (b ? d('ja') : d('nein'))

  s.text(d('titel', { nummer: g.nummer }), 50, { groesse: 16, fett: true })
  s.text(formatDatum(new Date()), 545, { rechts: true, grau: true })
  s.y -= 18
  s.text(g.bauherr ?? g.titel, 50, { groesse: 11, fett: true })
  s.y -= 14
  s.text(adresse(g), 50, { grau: true })
  s.y -= 10

  s.abschnitt(d('objekt'))
  s.zeile(d('parzelle'), [g.parzelle, g.egid ? `EGID ${g.egid}` : null].filter(Boolean).join(' · ') || '–')
  s.zeile(d('nutzung'), g.nutzung ? t(`grossprojekte.nutzung.${g.nutzung}`) : '–')
  s.zeile(d('baujahr'), g.baujahr ? String(g.baujahr) : '–')
  s.zeile(
    d('dach'),
    g.dachflaeche_m2
      ? `${zahl(g.dachflaeche_m2)} m²${g.dach_klasse ? ` · ${t(`grossprojekte.klasse.${g.dach_klasse}`)}` : ''}`
      : '–',
  )
  s.zeile(
    d('heizung'),
    g.heizung ? [t(`grossprojekte.heizung.${g.heizung}`), g.heizung_jahr].filter(Boolean).join(' · ') : '–',
  )
  s.zeile(d('geschuetzt'), ja(g.geschuetzt))

  s.abschnitt(d('anlage'))
  s.zeile(d('leistung'), `${zahl(e.kwp)} kWp`)
  s.zeile(d('ertrag'), `${zahl(r.ertrag_kwh)} kWh/a (${zahl(e.kwh_pro_kwp)} kWh/kWp)`)
  s.zeile(d('verbrauch'), `${zahl(e.verbrauch_kwh)} kWh/a${g.rechnung.verbrauch_kwh ? '' : ` (${d('schaetzung')})`}`)
  s.zeile(d('eigen'), `${String(e.eigenverbrauch_prozent)} % · ${zahl(r.eigen_kwh)} kWh/a`)
  s.zeile(d('strompreis'), `${e.strompreis_rp.toFixed(1)} Rp./kWh`)
  s.zeile(d('zielpreis'), `${e.preis_rp.toFixed(1)} Rp./kWh`)
  s.zeile(d('investition'), `CHF ${zahl(r.investition_rappen / 100)} (${zahl(e.chf_pro_kwp)} CHF/kWp)`)
  s.zeile(d('rolle'), d('rolleWert', { firma: absender.firma }))

  s.abschnitt(d('kunde'))
  if (g.kontakte.length === 0) s.zeile(d('keineKontakte'), '')
  for (const k of g.kontakte) {
    s.zeile(
      `${k.name}${k.funktion ? `, ${k.funktion}` : ''} (${t(`grossprojekte.rolle.${k.rolle}`)})`,
      [k.telefon, k.email].filter(Boolean).join(' · '),
    )
  }

  s.abschnitt(d('unterlagen'))
  for (const u of regeln?.pipeline?.unterlagen ?? []) {
    const am = g.unterlagen[u.id]
    s.zeile(sprache === 'fr' ? u.fr : u.de, am ? `${d('vorhanden')} ${formatDatum(am)}` : d('fehlt'), {
      ...(am ? { gruen: true } : { grau: true }),
    })
  }

  const b = g.besichtigung
  s.abschnitt(d('besichtigung'))
  if (!b.am) s.zeile(d('nochNicht'), '')
  else {
    s.zeile(d('besichtigtAm'), [formatDatum(b.am), b.von].filter(Boolean).join(' · '))
    for (const p of regeln?.pipeline?.besichtigung ?? []) {
      const x = b.punkte?.[p.id]
      if (!x) continue
      s.zeile(sprache === 'fr' ? p.fr : p.de, x.stand === 'ok' ? d('ok') : d('problem'), {
        ...(x.stand === 'ok' ? { gruen: true } : {}),
      })
      if (x.notiz) s.absatz(x.notiz, 62, 470, { grau: true, groesse: 8.5 })
    }
    if (b.notiz) s.absatz(b.notiz, 50, 495, { grau: true })
  }

  s.y -= 12
  s.platz(40)
  s.text(d('kontakt'), 50)
  s.y -= 13
  s.text([absender.person, absender.person_email ?? absender.email].filter(Boolean).join(' · '), 50, { fett: true })
  fuss(s, absender)
  return s.doc.save()
}
