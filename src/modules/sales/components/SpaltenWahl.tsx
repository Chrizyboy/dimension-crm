import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MehrfachFilter } from '@/components/shared/MehrfachFilter'
import { useSpaltenWahl } from '../hooks/useSpaltenWahl'
import { WAEHLBARE_SPALTEN, verteile } from '../lib/spalten'
import type { Geschaeft } from '../types'

/** Knopf «Spalten: 6 von 6» über der Pipeline: Schritte mit Häkchen ein- und ausblenden, mit Anzahl je Spalte. */
export function SpaltenWahl({ geschaefte }: { geschaefte: readonly Geschaeft[] }) {
  const { t } = useTranslation()
  const [sichtbar, setSichtbar] = useSpaltenWahl()
  const alle = useMemo(() => verteile(geschaefte, false), [geschaefte])
  // Alte Spalten-Namen (vor den sechs Schritten) zählen nicht: dann sieht man alle.
  const gewaehlt = sichtbar.filter((id) => WAEHLBARE_SPALTEN.some((s) => s.id === id))
  return (
    <MehrfachFilter
      beschriftung={t('verkauf.pipeline.spalten')}
      alleText={t('verkauf.pipeline.alleSpalten')}
      knopfText={t('verkauf.pipeline.spaltenAnzahl', { anzahl: gewaehlt.length || alle.length, von: alle.length })}
      className="lg:w-48"
      gewaehlt={gewaehlt}
      onChange={setSichtbar}
      optionen={alle.map(({ spalte, karten }) => ({
        wert: spalte.id,
        text: t(`verkauf.spalte.${spalte.id}`),
        anzahl: karten.length,
      }))}
    />
  )
}
