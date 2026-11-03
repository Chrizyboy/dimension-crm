import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useNamen } from '../hooks/useRessourcen'
import { amTag } from '../lib/belegung'
import type { Belegung, Fahrzeug } from '../types'
import { Box } from './Box'
import { Kennzeichen } from './Kennzeichen'

/** Wer heute mit welchem Fahrzeug wo ist; freie Fahrzeuge unten, damit man sie für spontane Fahrten findet. */
export function HeuteUnterwegs({
  fahrzeuge,
  belegung,
  heute,
  onOeffnen,
}: {
  fahrzeuge: Fahrzeug[]
  belegung: Belegung[]
  heute: string
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const namen = useNamen()
  const heuteBelegt = amTag(belegung, heute)
  const zeilen = fahrzeuge
    .filter((f) => !f.ausser_betrieb)
    .map((f) => ({ f, b: heuteBelegt.filter((b) => b.fahrzeug_id === f.id) }))
    .sort((a, b) => Number(b.b.length > 0) - Number(a.b.length > 0))
  return (
    <Box titel={t('fuhrpark.erledigen.heute')}>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground">{t('fuhrpark.leer.fahrzeuge')}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {zeilen.map(({ f, b }) => (
            <li key={f.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-start gap-2 rounded px-1 py-2 text-left"
                onClick={() => {
                  onOeffnen(f.id)
                }}
              >
                <Kennzeichen nummer={f.kennzeichen} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {b.length > 0
                      ? b.map((x) => x.projekt ?? x.zweck ?? t(`fuhrpark.belegung.art.${x.art}`)).join(', ')
                      : f.bezeichnung}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{namen.person(f.person_id)}</span>
                </span>
                {b.length === 0 && <Badge ton="ok">{t('fuhrpark.erledigen.frei')}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Box>
  )
}
