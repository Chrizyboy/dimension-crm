import { FileDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { herunterladen } from '@/lib/datei'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { berichtZeilen, monatsGrenzen, vormonat } from '../lib/bericht'
import { vorjahr } from '../lib/zeitraum'
import { ladeFakten, ladeZusatz } from '../services/kennzahlen'
import { monatsberichtPdf } from '../services/monatsbericht'
import type { KennzahlenEinstellungen } from '../types'

/** Zeilen eines Zeitraums (Grund und Zusatz), für den Bericht ohne Zwischenspeicher. */
async function zeilen(von: string, bis: string) {
  const [g, z] = await Promise.all([ladeFakten(von, bis), ladeZusatz(von, bis).catch(() => [])])
  return [...g, ...z]
}

/**
 * Knopf «Monatsbericht PDF» (K4 A): erstellt den Bericht des Vormonats (oder des Monats aus der Glocke,
 * `bericht=JJJJ-MM`) für beide Firmen, mit Vorjahresmonat und Ziel, und lädt ihn herunter.
 */
export function MonatsberichtKnopf({
  e,
  heute,
  finanzen,
  monatAusAdresse,
  onErledigt,
}: {
  e: KennzahlenEinstellungen
  heute: string
  finanzen: boolean
  monatAusAdresse?: string | undefined
  onErledigt: () => void
}) {
  const { t, i18n } = useTranslation()
  const [laedt, setLaedt] = useState(false)
  const gestartet = useRef(false)

  const erstellen = async (monat: string) => {
    setLaedt(true)
    try {
      const { von, bis } = monatsGrenzen(monat)
      const [jetzt, vj] = await Promise.all([zeilen(von, bis), zeilen(vorjahr(von), vorjahr(bis))])
      const liste = berichtZeilen(jetzt, vj, e, monat, heute, finanzen)
      const monatText = `${monat.slice(5)}.${monat.slice(0, 4)}`
      const bytes = await monatsberichtPdf(liste, {
        titel: t('kz.bericht.titel', { monat: monatText }),
        untertitel: t('kz.bericht.untertitel'),
        spalten: [t('kz.bericht.kennzahl'), monatText, t('kz.vergleich.vorjahr'), t('kz.bericht.ziel')],
        zeilen: Object.fromEntries(liste.map((z) => [z.id, t(`kz.bericht.z.${z.id}`)])),
        fuss: t('kz.bericht.fuss', { datum: formatDatum(heute) }),
      })
      herunterladen(bytes as BlobPart, `${t('kz.bericht.datei')}-${monat}.pdf`, 'application/pdf')
    } catch (f) {
      meldeFehler(f, 'kennzahlen')
    } finally {
      setLaedt(false)
      onErledigt()
    }
  }

  // Aus der Glocke: Bericht einmal automatisch erstellen.
  useEffect(() => {
    if (monatAusAdresse && /^\d{4}-\d{2}$/.test(monatAusAdresse) && !gestartet.current) {
      gestartet.current = true
      void erstellen(monatAusAdresse)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Öffnen mit Monat in der Adresse
  }, [monatAusAdresse])

  return (
    <Button
      variant="secondary"
      size="sm"
      laedt={laedt}
      lang={i18n.language}
      onClick={() => void erstellen(vormonat(heute))}
      data-testid="kz-monatsbericht"
    >
      <FileDown aria-hidden="true" />
      {t('kz.bericht.knopf')}
    </Button>
  )
}
