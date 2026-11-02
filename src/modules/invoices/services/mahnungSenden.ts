import type { TFunction } from 'i18next'
import { formatChf, formatDatum } from '@/lib/format'
import { mailVorbereiten } from '@/services/ausgang'
import { rechnungPdf } from '@/services/rechnungPdf'
import { ladeRechnung, rechnungPdfAblegen } from '@/services/rechnungsdaten'
import { heuteZuerich, plusTage } from '../lib/rechnung'
import type { MahnlaufZeile, RechnungVoll } from '../types'
import { mahnen } from './rechnungen'

/**
 * Den freigegebenen Mahnlauf ausführen. Per Mail: PDF (Erinnerung = die Rechnung, Mahnung = PDF mit Stufe und
 * neuer Frist) bei der Rechnung ablegen und die Mail freigegeben in den Ausgangskorb legen; die Stufe zählt die
 * Datenbank erst beim Senden. Per Post: Stufe sofort setzen (rechnung_mahnen) und das PDF zum Drucken liefern.
 * Freigeben darf nur die Freigabe-Person; das prüft die Datenbank bei jeder Mail und bei rechnung_mahnen.
 */
export async function mahnungAusfuehren(
  z: MahnlaufZeile,
  t: (sprache: 'de' | 'fr') => TFunction,
  mahnfristTage: number,
): Promise<{ weg: 'mail' | 'post'; pdf?: Uint8Array }> {
  const r = await ladeRechnung(z.rechnung_id)
  const ts = t(r.sprache)
  const email = z.email?.trim()
  if (z.versandweg === 'mail' && email) {
    await perMail(r, z.stufe, email, ts, mahnfristTage)
    return { weg: 'mail' }
  }
  await mahnen(r.id)
  const neu = await ladeRechnung(r.id)
  return { weg: 'post', pdf: await rechnungPdf(neu, ts, z.stufe) }
}

/** Vorschau, wie die Erinnerung oder Mahnung aussieht (ohne etwas zu setzen). */
export async function mahnungVorschau(
  z: MahnlaufZeile,
  t: (sprache: 'de' | 'fr') => TFunction,
  mahnfristTage: number,
): Promise<Uint8Array> {
  const r = await ladeRechnung(z.rechnung_id)
  return rechnungPdf(mitStufe(r, z.stufe, mahnfristTage), t(r.sprache), z.stufe)
}

/** Rechnung, wie sie nach der Mahnung aussieht (Stufe, heute gemahnt, neue Mahnfrist). */
function mitStufe(r: RechnungVoll, stufe: number, mahnfristTage: number): RechnungVoll {
  if (!stufe) return r
  const heute = heuteZuerich()
  return { ...r, mahnstufe: stufe, gemahnt_am: heute, mahnfrist: plusTage(heute, mahnfristTage) }
}

async function perMail(r: RechnungVoll, stufe: number, an: string, ts: TFunction, mahnfristTage: number) {
  const vorschau = mitStufe(r, stufe, mahnfristTage)
  const pdf = await rechnungPdfAblegen(r, await rechnungPdf(vorschau, ts, stufe), stufe)
  const werte = {
    nummer: r.nummer ?? '',
    titel: r.titel,
    betrag: formatChf(r.offen_rappen, { mitWaehrung: true }),
    faellig: r.faellig_am ? formatDatum(r.faellig_am) : '',
    frist: vorschau.mahnfrist ? formatDatum(vorschau.mahnfrist) : '',
    stufe,
  }
  await mailVorbereiten(
    {
      an,
      betreff: ts(stufe ? 'rechnungen.mailtext.mahnungBetreff' : 'rechnungen.mailtext.erinnerungBetreff', werte),
      text: ts(stufe ? 'rechnungen.mailtext.mahnungText' : 'rechnungen.mailtext.erinnerungText', werte),
      sprache: r.sprache,
      art: stufe ? 'mahnung' : 'zahlungserinnerung',
      kontakt_id: r.kontakt_id,
      ...(r.projekt_id ? { projekt_id: r.projekt_id } : {}),
      bezug_tabelle: 'rechnungen',
      bezug_id: r.id,
      schluessel: stufe ? `rechnung:${r.id}:${String(stufe)}` : `erinnerung:${r.id}`,
      anhaenge: [{ dokument_id: pdf.id, name: pdf.name }],
    },
    true,
  )
}

/** Mehrere PDFs für die Post zu einem Druck zusammenfügen (pdf-lib erst hier geladen). */
export async function pdfsZusammen(teile: Uint8Array[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const ganz = await PDFDocument.create()
  for (const teil of teile) {
    const doc = await PDFDocument.load(teil)
    for (const seite of await ganz.copyPages(doc, doc.getPageIndices())) ganz.addPage(seite)
  }
  return ganz.save()
}
