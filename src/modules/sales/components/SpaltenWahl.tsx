import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MehrfachFilter } from '@/components/shared/MehrfachFilter'
import { useSpaltenWahl } from '../hooks/useSpaltenWahl'
import { STANDARD_SPALTEN, verteile } from '../lib/spalten'
import type { Geschaeft } from '../types'

/** Knopf «Spalten: 9 von 12» über der Pipeline: Spalten mit Häkchen ein- und ausblenden, mit Anzahl je Spalte. */
export function SpaltenWahl({ geschaefte }: { geschaefte: readonly Geschaeft[] }) {
  const { t } = useTranslation()
  const [sichtbar, setSichtbar] = useSpaltenWahl()
  const alle = useMemo(() => verteile(geschaefte, []), [geschaefte])
  const standard = sichtbar.length === STANDARD_SPALTEN.length && STANDARD_SPALTEN.every((s) => sichtbar.includes(s))
  return (
    <MehrfachFilter
      beschriftung={t('verkauf.pipeline.spalten')}
      alleText={t('verkauf.pipeline.alleSpalten')}
      knopfText={t('verkauf.pipeline.spaltenAnzahl', { anzahl: sichtbar.length || alle.length, von: alle.length })}
      hervorheben={!standard}
      className="lg:w-48"
      gewaehlt={sichtbar}
      onChange={setSichtbar}
      optionen={alle.map(({ spalte, karten }) => ({
        wert: spalte.id,
        text: t(`verkauf.spalte.${spalte.id}`),
        anzahl: karten.length,
      }))}
    />
  )
}
