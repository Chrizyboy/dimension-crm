import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { sende } from '@/services/ereignisse'

/**
 * «+ Aufgabe» in einer Akte (V234): legt eine Aufgabe an, die an diesem Lead, dieser Offerte, diesem Projekt oder
 * Service-Fall hängt. Das Fenster gehört den Aufgaben; es öffnet sich über das Ereignis «aufgabe.neu»,
 * weil Module sich nicht gegenseitig importieren.
 */
export function AufgabeKnopf({
  bezugTabelle,
  bezugId,
  titel,
}: {
  bezugTabelle: string
  bezugId: string
  titel?: string
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant="secondary"
      onClick={() => {
        sende('aufgabe.neu', { bezugTabelle, bezugId, ...(titel ? { titel } : {}) })
      }}
    >
      <Plus />
      {t('aufgaben.neuKurz')}
    </Button>
  )
}
