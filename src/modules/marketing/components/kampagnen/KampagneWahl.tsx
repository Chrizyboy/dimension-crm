import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { useWerbekampagnen } from '../../hooks/useKampagnen'

const KEINE = 'keine'

/** Kampagne wählen (Posts, Newsletter, Serien-Mail, Lead): laufende und geplante, die gewählte immer dabei. */
export function KampagneWahl({
  id,
  wert,
  onWert,
}: {
  id: string
  wert: string | null | undefined
  onWert: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const liste = useWerbekampagnen().data ?? []
  const optionen = [
    { wert: KEINE, text: t('werbung.kampagne.keine') },
    ...liste.filter((k) => k.status !== 'abgeschlossen' || k.id === wert).map((k) => ({ wert: k.id, text: k.name })),
  ]
  return (
    <Auswahl
      id={id}
      optionen={optionen}
      value={wert ?? KEINE}
      onValueChange={(w) => {
        onWert(w === KEINE ? null : w)
      }}
    />
  )
}
