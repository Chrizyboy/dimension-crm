import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import type { Entwurf } from '../lib/entwurf'

/**
 * Schutz je Automation: Standard aus den Einstellungen oder «jederzeit» (z. B. Zahlungserinnerung am Samstag
 * gewollt) und eine eigene Kontakt-Pause. Leer heisst immer: wie in den Schutzregeln.
 */
export function SchutzFelder({ e, onChange }: { e: Entwurf; onChange: (teil: Partial<Entwurf>) => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Feld id="auto-fenster" label={t('automationen.schutz.fenster')} hinweis={t('automationen.schutz.jeAutomation')}>
        <Auswahl
          id="auto-fenster"
          value={e.versandfenster?.immer ? 'immer' : 'standard'}
          optionen={(['standard', 'immer'] as const).map((w) => ({ wert: w, text: t(`automationen.schutz.wahl.${w}`) }))}
          onValueChange={(w) => {
            onChange({ versandfenster: w === 'immer' ? { immer: true } : null })
          }}
        />
      </Feld>
      <Feld id="auto-pause" label={t('automationen.schutz.kontakt_pause_tage')} hinweis={t('automationen.schutz.pauseLeer')}>
        <Input
          id="auto-pause"
          type="number"
          min={0}
          max={60}
          className="w-28"
          value={e.kontakt_pause_tage ?? ''}
          onChange={(x) => {
            const v = x.target.value
            onChange({ kontakt_pause_tage: v === '' ? null : Math.max(0, Math.round(Number(v) || 0)) })
          }}
        />
      </Feld>
    </div>
  )
}
