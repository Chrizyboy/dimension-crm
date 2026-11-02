import { useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import type { KiBezug } from '@/services/ki'
import { useUi } from '@/stores/ui'
import { Fragen } from './Fragen'

/** Welcher Datensatz in der Adresse offen ist (z. B. #/sales?lead=…) und welche Tabelle dazu gehört. */
const PARAMETER: [string, KiBezug['tabelle']][] = [
  ['kunde', 'kontakte'],
  ['lead', 'verkaufschancen'],
  ['offerte', 'offerten'],
  ['projekt', 'projekte'],
  ['fall', 'service_faelle'],
]

/** Bezug aus den Suchparametern der Adresse; ohne offenen Datensatz null. */
export function bezugAusAdresse(suche: Record<string, unknown>): KiBezug | null {
  for (const [p, tabelle] of PARAMETER) {
    const w = suche[p]
    if (typeof w === 'string' && /^[0-9a-f-]{36}$/i.test(w)) return { tabelle, id: w }
  }
  return null
}

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
