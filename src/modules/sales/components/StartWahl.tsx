import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useOrte } from '../hooks/useVerkauf'

import type { StartArt } from '../hooks/useStartOrt'

interface StartWahlProps {
  id: string
  label: string
  art: StartArt
  andere: string
  personId: string | null
  onArt: (a: StartArt) => void
  onAndere: (text: string) => void
}

/**
 * Wählt Start oder Ziel der Route (V233): Zuhause (aus «Mein Konto»), Muri, Bulle oder eine andere
 * Adresse mit PLZ. Den Ort mit Lage liefert `useStartOrt`.
 */
export function StartWahl({ id, label, art, andere, personId, onArt, onAndere }: StartWahlProps) {
  const { t } = useTranslation()
  const orte = useOrte()
  const heim = personId ? orte.data?.heime[personId] : undefined
  return (
    <Feld id={id} label={label}>
      <div className="flex gap-2">
        <Auswahl
          id={id}
          className="w-36"
          value={art}
          onValueChange={(w) => {
            onArt(w as StartArt)
          }}
          optionen={[
            ...(heim ? [{ wert: 'heim', text: t('verkauf.route.zuhause') }] : []),
            { wert: 'muri', text: 'Muri' },
            { wert: 'bulle', text: 'Bulle' },
            { wert: 'andere', text: t('verkauf.route.andere') },
          ]}
        />
        {art === 'andere' && (
          <Input
            aria-label={t('verkauf.route.andereAdresse')}
            placeholder={t('verkauf.route.andereAdresse')}
            value={andere}
            onChange={(e) => {
              onAndere(e.target.value)
            }}
          />
        )}
      </div>
    </Feld>
  )
}
