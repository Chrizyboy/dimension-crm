import type { TFunction } from 'i18next'
import { formatDatum } from '@/lib/format'
import { adressText } from '../lib/links'
import type { Rapport } from '../types'
import { db } from './baustelle'
import { neuesPdf } from './pdf'
import { rapportPdfDaten, rapportSeiten } from './rapportPdf'

/** Ein Dokument, das ins Anlagedossier kann (PDF oder Bild aus Projekt, Offerte, Lead, Kunde, Rapporten). */
export interface DossierQuelle {
  id: string
  name: string
  ordner: string | null
  mime_typ: string | null
  speicher_pfad: string | null
  vorgewaehlt: boolean
}

/** Angaben zur Anlage und zum Kunden für das Deckblatt. */
export interface DossierAngaben {
  projekt: { id: string; nummer: string; kontakt_id: string | null }
  kunde: { name: string; email: string | null; sprache: 'de' | 'fr' }
  anlage: {
    leistung_kwp: number | null
    ibn_am: string | null
    garantie_bis: string | null
    komponenten: { art: string; modell: string | null; anzahl?: number | null }[]
  } | null
  datenblaetter: { artikel: string; url: string }[]
  quellen: DossierQuelle[]
}

/** Ordner, die üblicherweise ins Dossier gehören (Pläne, Sicherheitsnachweis, Garantien, Datenblätter). */
const STANDARD = /plaene|plan|sina|garantie|datenblatt|schema|abnahme/i

/** Alles für das Anlagedossier eines Projekts laden. */
export async function ladeDossier(projektId: string, sprache: 'de' | 'fr'): Promise<DossierAngaben> {
  const p = await db()
    .from('projekte')
    .select(
      'id, nummer, kontakt_id, offerte_id, verkaufschance_id, kontakt:kontakte(vorname, nachname, firma, email, sprache)',
    )
    .eq('id', projektId)
    .single()
  if (p.error) throw p.error
  const k = p.data.kontakt as {
    vorname: string | null
    nachname: string | null
    firma: string | null
    email: string | null
    sprache: string | null
  } | null
  const [anlage, material, rapporte] = await Promise.all([
    db()
      .from('anlagen')
      .select('leistung_kwp, ibn_am, garantie_bis, komponenten')
      .eq('projekt_id', projektId)
      .is('geloescht_am', null)
      .limit(1)
      .maybeSingle(),
    db()
      .from('projekt_material')
      .select('artikel:artikel(bezeichnung, datenblaetter)')
      .eq('projekt_id', projektId)
      .is('geloescht_am', null),
    db().from('rapporte').select('id').eq('projekt_id', projektId).is('geloescht_am', null),
  ])
  if (anlage.error) throw anlage.error
  if (material.error) throw material.error
  if (rapporte.error) throw rapporte.error

  const bezuege: [string, (string | null)[]][] = [
    ['projekte', [projektId]],
    ['offerten', [p.data.offerte_id]],
    ['verkaufschancen', [p.data.verkaufschance_id]],
    ['kontakte', [p.data.kontakt_id]],
    ['rapporte', rapporte.data.map((r) => r.id)],
  ]
  const quellen = (
    await Promise.all(
      bezuege.map(async ([tabelle, ids]) => {
        const gueltig = ids.filter((x): x is string => Boolean(x))
        if (!gueltig.length) return []
        const { data, error } = await db()
          .from('dokumente')
          .select('id, name, ordner, mime_typ, speicher_pfad')
          .eq('bezug_tabelle', tabelle)
          .in('bezug_id', gueltig)
          .in('mime_typ', ['application/pdf', 'image/jpeg', 'image/png'])
          .not('speicher_pfad', 'is', null)
          .is('geloescht_am', null)
        if (error) throw error
        // Fotos und Unterschriften der Rapporte stehen schon im IBN-Protokoll; das Dossier selbst nie doppelt.
        return data.filter((d) => !['fotos', 'unterschrift', 'dossier'].includes(d.ordner ?? ''))
      }),
    )
  ).flat()

  const gesehen = new Set<string>()
  const datenblaetter = material.data.flatMap((m) => {
    const a = m.artikel as { bezeichnung: string; datenblaetter: Record<string, unknown> | null } | null
    const url = a?.datenblaetter?.[sprache] ?? a?.datenblaetter?.de
    if (!a || typeof url !== 'string' || !/^https?:\/\//.test(url) || gesehen.has(url)) return []
    gesehen.add(url)
    return [{ artikel: a.bezeichnung, url }]
  })

  return {
    projekt: { id: p.data.id, nummer: p.data.nummer, kontakt_id: p.data.kontakt_id },
    kunde: {
      name: [k?.vorname, k?.nachname].filter(Boolean).join(' ') || k?.firma || '',
      email: k?.email ?? null,
      sprache: k?.sprache === 'fr' ? 'fr' : 'de',
    },
    anlage: anlage.data as DossierAngaben['anlage'],
    datenblaetter,
    quellen: quellen.map((q) => ({ ...q, vorgewaehlt: STANDARD.test(`${q.ordner ?? ''} ${q.name}`) })),
  }
}

/**
 * Anlagedossier als ein PDF: Deckblatt (Kunde, Anlage, Komponenten, Garantie, Inhalt), IBN-Protokoll mit
 * Unterschrift, Liste der Datenblätter (Links der Hersteller) und die gewählten Dokumente angehängt.
 */
export async function dossierPdf(
  ibn: Rapport,
  a: DossierAngaben,
  gewaehlt: DossierQuelle[],
  t: TFunction,
  sprache: 'de' | 'fr',
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const s = await neuesPdf(t('baustelle.dossier.pdfTitel', { nummer: a.projekt.nummer }), sprache)
  s.titel(t('baustelle.dossier.pdfTitel', { nummer: a.projekt.nummer }), formatDatum(new Date()))
  s.angabe(t('baustelle.pdf.kunde'), a.kunde.name)
  s.angabe(
    t('baustelle.pdf.adresse'),
    adressText({ strasse: ibn.objekt_strasse, plz: ibn.objekt_plz, ort: ibn.objekt_ort }),
  )
  if (a.anlage?.leistung_kwp) s.angabe(t('baustelle.dossier.leistung'), `${String(a.anlage.leistung_kwp)} kWp`)
  s.angabe(t('baustelle.dossier.ibn'), formatDatum(a.anlage?.ibn_am ?? ibn.datum))
  if (a.anlage?.garantie_bis) s.angabe(t('baustelle.dossier.garantie'), formatDatum(a.anlage.garantie_bis))
  for (const k of a.anlage?.komponenten ?? []) {
    if (k.modell || k.anzahl)
      s.angabe(
        t(`baustelle.dossier.komponente.${k.art}`, { defaultValue: k.art }),
        [k.anzahl ? `${String(k.anzahl)} x` : '', k.modell ?? ''].join(' ').trim(),
      )
  }
  s.zwischentitel(t('baustelle.dossier.inhalt'))
  for (const zeile of [
    t('baustelle.dossier.inhaltIbn'),
    ...(a.datenblaetter.length ? [t('baustelle.dossier.inhaltDatenblaetter')] : []),
    ...gewaehlt.map((q) => q.name),
  ]) {
    s.absatz(`• ${zeile}`)
  }

  s.neueSeite()
  await rapportSeiten(s, ibn, await rapportPdfDaten(ibn), t, sprache)

  if (a.datenblaetter.length) {
    s.neueSeite()
    s.titel(t('baustelle.dossier.datenblaetter'), t('baustelle.dossier.datenblaetterText'))
    for (const d of a.datenblaetter) {
      s.absatz(d.artikel)
      s.absatz(d.url, { groesse: 7.5, x: 62 })
      s.y -= 4
    }
  }

  const pfade = gewaehlt.flatMap((q) => (q.speicher_pfad ? [q.speicher_pfad] : []))
  const { data: links, error } = pfade.length
    ? await db().storage.from('dokumente').createSignedUrls(pfade, 600)
    : { data: [], error: null }
  if (error) throw error
  for (const q of gewaehlt) {
    const url = links.find((l) => l.path === q.speicher_pfad)?.signedUrl
    if (!url) continue
    const bytes = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null))
    if (!bytes) continue
    if (q.mime_typ === 'application/pdf') {
      const quelle = await PDFDocument.load(bytes, { ignoreEncryption: true }).catch(() => null)
      if (!quelle) continue
      for (const seite of await s.doc.copyPages(quelle, quelle.getPageIndices())) s.doc.addPage(seite)
    } else {
      s.neueSeite()
      s.titel(q.name)
      await s.bild(bytes, q.mime_typ === 'image/png' ? 'png' : 'jpg', 50, 495, 680).catch(() => 0)
    }
  }
  return s.doc.save()
}

/** Dossier bei den Dokumenten des Projekts ablegen (für Mail und Kundenakte); gibt Dokument und Namen zurück. */
export async function dossierAblegen(
  projekt: { id: string; nummer: string },
  bytes: Uint8Array,
): Promise<{ id: string; name: string }> {
  const name = `Anlagedossier-${projekt.nummer}.pdf`
  const pfad = `projekte/${projekt.id}/${String(Date.now())}-${name}`
  const datei = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const hoch = await db().storage.from('dokumente').upload(pfad, datei, { contentType: 'application/pdf' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: 'application/pdf',
      bytes: bytes.byteLength,
      ordner: 'dossier',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'projekte',
      bezug_id: projekt.id,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, name }
}
