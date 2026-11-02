import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useUi } from '@/stores/ui'
import { bezugAusAdresse } from '../lib/bezug'
import { Fragen } from './Fragen'

/**
 * Assistent überall (Ctrl J oder Knopf oben): fragt mit dem offenen Datensatz als Bezug, ohne die Ansicht zu
 * verlassen. Das Gespräch landet im Verlauf.
 */
export default function AssistentFenster() {
  const { t } = useTranslation()
  const offen = useUi((z) => z.assistentOffen)
  const setOffen = useUi((z) => z.setAssistent)
  const suche = useRouterState({ select: (s) => s.location.search as Record<string, unknown> })
  const bezug = bezugAusAdresse(suche)
  return (
    <Dialog open={offen} onOpenChange={setOffen}>
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={t('assistent.titel')}
        beschreibung={bezug ? t('assistent.mitBezug') : t('assistent.fensterText')}
      >
        <Fragen bezug={bezug} kompakt />
      </DialogInhalt>
    </Dialog>
  )
}
