import { Flag, History, MessageSquare, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { Skelett } from '@/components/ui/diverses'
import { useUi } from '@/stores/ui'

interface Eintrag {
  id: string
  art: string
  zeitpunkt: string
  text: string | null
  details: unknown
}

/** Verlauf der Offerte; Versionen und «Auftrag erstellt» erscheinen als Meilenstein (V67). */
export function OffertVerlauf({ eintraege, laedt }: { eintraege: Eintrag[] | undefined; laedt: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const punkte: Zeitpunkt[] = (eintraege ?? []).map((e) => {
    const meilenstein = (e.details as { meilenstein?: boolean } | null)?.meilenstein === true
    return {
      id: e.id,
      zeitpunkt: e.zeitpunkt,
      icon: meilenstein ? Flag : e.art === 'anruf' ? Phone : e.art === 'aenderung' ? History : MessageSquare,
      titel: e.text ?? t(`offerten.verlauf.${e.art === 'aenderung' ? 'aenderung' : 'kontakt'}`),
      ton: meilenstein ? 'bg-accent-soft text-accent-ink' : undefined,
    }
  })
  return (
    <AkteAbschnitt titel={t('offerten.akte.verlauf')} zusatz={eintraege?.length} offen={false}>
      {laedt ? (
        <Skelett className="h-24" />
      ) : punkte.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('offerten.verlauf.leer')}</p>
      ) : (
        <Zeitachse eintraege={punkte} sprache={sprache} nachMonat={false} />
      )}
    </AkteAbschnitt>
  )
}
