import type { TFunction } from 'i18next'
import { formatChf, formatDatum, formatDatumZeit } from '@/lib/format'
import { adressText } from '../lib/links'
import { dauerText } from '../lib/zeit'
import type { Nachtrag, Pruefpunkt, Rapport } from '../types'
import { bildAdressen, ladeBilder, ladeNachtraege, ladePruefpunkte } from './baustelle'
import { neuesPdf, type Schreiber } from './pdf'

/** Was der Rapport im PDF braucht, ausser ihm selbst. */
export interface RapportPdfDaten {
  nachtraege: Nachtrag[]
  pruefpunkte: Pruefpunkt[]
  unterschrift: ArrayBuffer | null
  fotos: ArrayBuffer[]
}

/** Nachträge, Prüfpunkte, Unterschrift und Fotos (höchstens zwölf) eines Rapports laden. */
export async function rapportPdfDaten(r: Rapport, mitFotos = true): Promise<RapportPdfDaten> {
  const [nachtraege, pruefpunkte, bilder] = await Promise.all([
    ladeNachtraege('alle', r.id),
    r.art === 'ibn' ? ladePruefpunkte() : Promise.resolve([]),
    ladeBilder(r.id),
  ])
  const pfade = bilder.flatMap((b) => (b.speicher_pfad ? [b.speicher_pfad] : []))
  const adressen = await bildAdressen(pfade)
  const holen = async (pfad: string | null) => {
    const url = pfad ? adressen.get(pfad) : undefined
    return url ? fetch(url).then((x) => (x.ok ? x.arrayBuffer() : null)) : null
  }
  const unterschriftBild = bilder.find((b) => b.id === r.unterschrift_kunde?.dokument_id)
  const fotos = mitFotos ? bilder.filter((b) => b.ordner === 'fotos').slice(0, 12) : []
  return {
    nachtraege,
    pruefpunkte,
    unterschrift: unterschriftBild ? await holen(unterschriftBild.speicher_pfad) : null,
    fotos: (await Promise.all(fotos.map((f) => holen(f.speicher_pfad)))).filter((b): b is ArrayBuffer => Boolean(b)),
  }
}

/** Den Rapport auf die Seiten des Schreibers setzen (eigenes PDF oder Teil des Anlagedossiers). */
export async function rapportSeiten(s: Schreiber, r: Rapport, d: RapportPdfDaten, t: TFunction, sprache: 'de' | 'fr') {
  s.titel(
    r.art === 'ibn'
      ? t('baustelle.pdf.ibnTitel', { nummer: r.nummer })
      : t('baustelle.pdf.titel', { nummer: r.nummer, art: t(`baustelle.art.${r.art}`) }),
    formatDatum(r.datum),
  )
  s.angabe(t('baustelle.pdf.kunde'), r.kunde ?? '')
  s.angabe(t('baustelle.pdf.adresse'), adressText({ strasse: r.objekt_strasse, plz: r.objekt_plz, ort: r.objekt_ort }))
  if (r.projekt_nummer) s.angabe(t('baustelle.pdf.projekt'), r.projekt_nummer)
  if (r.service_nummer) s.angabe(t('baustelle.pdf.service'), r.service_nummer)
  s.angabe(t('baustelle.pdf.monteur'), r.person ?? '')
  if (r.stunden) s.angabe(t('baustelle.pdf.zeit'), dauerText(Math.round(r.stunden * 60)))
  if (r.verrechnung) s.angabe(t('baustelle.pdf.verrechnung'), t(`baustelle.verrechnung.${r.verrechnung}`))

  s.zwischentitel(t('baustelle.pdf.arbeiten'))
  s.absatz(r.arbeiten ?? '-')
  if (r.material.length) {
    s.zwischentitel(t('baustelle.pdf.mehrmaterial'))
    for (const m of r.material) s.absatz(`${m.menge ?? ''} ${m.einheit ?? ''}  ${m.text}`.trim())
  }
  if (r.art === 'ibn') {
    s.zwischentitel(t('baustelle.pdf.pruefpunkte'))
    for (const p of d.pruefpunkte) {
      const w = r.pruefpunkte[p.schluessel]
      const wert =
        typeof w === 'boolean' ? t(w ? 'baustelle.pdf.ja' : 'baustelle.pdf.nein') : w ? `${w} ${p.einheit ?? ''}` : '-'
      s.platz(15)
      s.text(sprache === 'fr' ? p.fr : p.de, 50)
      s.text(wert, 545, { rechts: true, fett: true })
      s.y -= 15
    }
  }
  if (d.nachtraege.length) {
    s.zwischentitel(t('baustelle.pdf.nachtraege'))
    for (const n of d.nachtraege) {
      const teile = [
        n.stunden != null ? t('baustelle.nachtrag.stundenWert', { stunden: n.stunden }) : null,
        n.betrag_rappen != null ? formatChf(n.betrag_rappen, { mitWaehrung: true }) : null,
      ].filter(Boolean)
      s.absatz(`${n.nummer}: ${n.beschreibung}${teile.length ? ` (${teile.join(', ')})` : ''}`)
    }
  }

  s.zwischentitel(t('baustelle.pdf.unterschrift'))
  const u = r.unterschrift_kunde
  if (u?.ohne) s.absatz(t('baustelle.rapport.ohneUnterschrift', { grund: u.ohne }))
  else if (u) {
    if (d.unterschrift) s.y -= (await s.bild(d.unterschrift, 'png', 50, 220, 80)) + 4
    s.absatz(`${u.name ?? ''}, ${formatDatumZeit(u.am)}`)
    if (d.nachtraege.length) s.absatz(t('baustelle.pdf.bestaetigt'), { groesse: 8 })
  } else s.absatz(t('baustelle.rapport.offen'))

  if (d.fotos.length) {
    s.zwischentitel(t('baustelle.pdf.fotos'))
    for (let i = 0; i < d.fotos.length; i += 2) {
      const paar = d.fotos.slice(i, i + 2)
      s.platz(190)
      const y0 = s.y
      let h = 0
      for (const [j, f] of paar.entries()) {
        s.y = y0
        h = Math.max(h, await s.bild(f, 'jpg', 50 + j * 252, 243, 182).catch(() => 0))
      }
      s.y = y0 - h - 10
    }
  }
}

/** Rapport als eigenes PDF. */
export async function rapportPdf(r: Rapport, t: TFunction, sprache: 'de' | 'fr'): Promise<Uint8Array> {
  const s = await neuesPdf(`${r.nummer} ${t(`baustelle.art.${r.art}`)}`, sprache)
  await rapportSeiten(s, r, await rapportPdfDaten(r), t, sprache)
  return s.doc.save()
}
