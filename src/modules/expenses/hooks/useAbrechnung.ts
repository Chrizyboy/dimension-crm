import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { herunterladen } from '@/lib/datei'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { jePerson } from '../lib/spesen'
import { abrechnungPdf } from '../services/abrechnungPdf'
import type { Spese } from '../types'
import { useKategorieText } from './useKategorieText'

/** Spesenabrechnung als PDF erstellen und herunterladen (je Person eine Seite plus Belege). */
export function useAbrechnung() {
  const { t } = useTranslation()
  const kategorie = useKategorieText()
  const [laeuft, setLaeuft] = useState<string | null>(null)

  async function erstellen(spesen: Spese[], titel: string, schluessel: string) {
    setLaeuft(schluessel)
    try {
      const pdf = await abrechnungPdf(
        jePerson(spesen).map((p) => ({ person: p.person, spesen: p.spesen })),
        titel,
        {
          titel: t('spesen.pdf.titel'),
          kopf: [
            t('spesen.spalte.datum'),
            t('spesen.spalte.zweck'),
            t('spesen.spalte.kategorie'),
            t('spesen.spalte.projekt'),
            t('spesen.pdf.mwst'),
            t('spesen.pdf.betrag'),
          ],
          total: t('spesen.pdf.total'),
          vorsteuer: t('spesen.pdf.vorsteuer'),
          unterschriftPerson: t('spesen.pdf.unterschriftPerson'),
          unterschriftBuchhaltung: t('spesen.pdf.unterschriftBuchhaltung'),
          belege: t('spesen.spalte.beleg'),
          ohneBeleg: t('spesen.ohneBeleg'),
          kategorie,
        },
      )
      herunterladen(pdf as BlobPart, `${t('spesen.pdf.datei')} ${titel}.pdf`, 'application/pdf')
      melde('ok', { de: 'Abrechnung erstellt', fr: 'Décompte créé' })
    } catch (f) {
      meldeFehler(f, 'spesen')
      melde('kritisch', { de: 'Abrechnung nicht erstellt', fr: 'Décompte non créé' })
    } finally {
      setLaeuft(null)
    }
  }
  return { laeuft, erstellen }
}
