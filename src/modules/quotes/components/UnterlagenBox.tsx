import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { useUi } from '@/stores/ui'
import { useOffertAenderung, useOffertEinstellungen } from '../hooks/useOfferten'
import { setzeAngaben } from '../services/ablauf'
import type { Offerte } from '../types'
import { Box } from './Box'

/**
 * Unterlagen für die Offerte (Fotos, Stromrechnung, Dach, Netz …), Liste aus den Einstellungen. Ein Häkchen speichert
 * sofort; fehlt etwas, geht man mit «Zurück zur Offerte → Rückfrage» an den Verkauf.
 */
export function UnterlagenBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const liste = useOffertEinstellungen().data?.unterlagen ?? []
  const setzen = useOffertAenderung((u: Record<string, boolean>) => setzeAngaben(o.id, { unterlagen: u }))
  if (liste.length === 0) return null
  const erledigt = liste.filter((u) => o.unterlagen[u.id]).length
  return (
    <Box
      titel={t('offerten.unterlagen.titel')}
      rechts={t('offerten.unterlagen.stand', { n: erledigt, von: liste.length })}
    >
      <ul className="flex flex-col gap-1.5">
        {liste.map((u) => (
          <li key={u.id}>
            <label className="flex items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={!!o.unterlagen[u.id]}
                onCheckedChange={(an) => {
                  setzen.mutate(
                    { [u.id]: an === true },
                    {
                      onError: (f) => {
                        meldeFehler(f, 'offerten.unterlagen')
                      },
                    },
                  )
                }}
              />
              <span>{sprache === 'fr' ? u.fr : u.de}</span>
            </label>
          </li>
        ))}
      </ul>
    </Box>
  )
}
