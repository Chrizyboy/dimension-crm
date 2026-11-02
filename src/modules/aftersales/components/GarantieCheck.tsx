import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { fallSpeichern } from '../services/service'
import type { Akte, ServiceFall } from '../types'
import { Box } from './Box'
import { GarantieListe } from './GarantieListe'

/**
 * Garantie-Check: Montage-Garantie der Anlage und jede Komponente mit Garantiedatum, mit Balken und «läuft bis» /
 * «abgelaufen». Dazu der Schalter «Garantiefall» (beim Anlegen setzt ihn die Datenbank selbst).
 */
export function GarantieCheck({ f, akte }: { f: ServiceFall; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const a = akte?.anlage
  return (
    <Box
      titel={t('service.garantieCheck.titel')}
      rechts={
        <label className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t('service.feld.garantieFall')}
          <Switch
            checked={f.garantie ?? false}
            onCheckedChange={(g) => {
              void aus(() => fallSpeichern({ garantie: g }, f.id))
            }}
          />
        </label>
      }
    >
      <GarantieListe anlage={a} />
    </Box>
  )
}
