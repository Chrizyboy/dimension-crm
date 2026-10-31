import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Zeitachse } from '@/components/shared/Zeitachse'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useUi } from '@/stores/ui'
import { useVerlauf } from '../hooks/useGrossprojekte'

/** Verlauf eines Grossprojekts: gefunden, Gebäudedaten, Entscheide; neueste oben. */
export function Verlauf({ id }: { id: string }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const daten = useVerlauf(id)
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-24" />
  if (daten.data.length === 0)
    return <p className="text-muted-foreground text-sm">{t('grossprojekte.akte.verlaufLeer')}</p>
  return (
    <Zeitachse
      sprache={sprache}
      nachMonat={false}
      eintraege={daten.data.map((v) => ({
        id: v.id,
        zeitpunkt: v.zeitpunkt,
        icon: History,
        titel: v.text ?? '–',
        meta: v.person ?? undefined,
      }))}
    />
  )
}
