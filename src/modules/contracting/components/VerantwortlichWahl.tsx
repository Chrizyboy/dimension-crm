import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useGrossprojekte'
import { verantwortlichSetzen } from '../services/grossprojekte'
import type { Grossprojekt } from '../types'

/**
 * Wer bei uns das Grossprojekt betreut (Standard Chris laut Einstellung, hier je Grossprojekt änderbar). Diese Person
 * bekommt die Glocke und die Aufgaben aus den vorgeschlagenen Schritten.
 */
export function VerantwortlichWahl({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  return (
    <div className="flex items-center gap-2 pb-2 text-sm">
      <span className="text-muted-foreground shrink-0">{t('grossprojekte.verantwortlich.label')}</span>
      <Auswahl
        className="max-w-60"
        aria-label={t('grossprojekte.verantwortlich.label')}
        platzhalter={t('grossprojekte.verantwortlich.niemand')}
        disabled={laeuft}
        optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
        {...(g.verantwortlich_id ? { value: g.verantwortlich_id } : {})}
        onValueChange={(id) =>
          void aus(() => verantwortlichSetzen(g.id, id), { de: 'Verantwortlich geändert', fr: 'Responsable modifié' })
        }
      />
    </div>
  )
}
