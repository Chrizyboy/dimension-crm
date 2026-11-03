import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { MODULE } from '@/lib/navigation'
import { useUi } from '@/stores/ui'

const KEINER = 'keiner'

/**
 * Bereich eines Prozesses oder Videos: dann erscheint er im Kapitel dieses Bereichs und in der Hilfe (F1).
 * «Kein Bereich» = nur im eigenen Reiter (Entscheid 0043).
 */
export function BereichFeld({
  id,
  wert,
  onWert,
}: {
  id: string
  wert: string | null
  onWert: (bereich: string | null) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  return (
    <Feld id={id} label={t('handbuch.bereichFeld')} hinweis={t('handbuch.bereichHinweis')} className="sm:col-span-2">
      <Auswahl
        id={id}
        value={wert ?? KEINER}
        onValueChange={(w) => {
          onWert(w === KEINER ? null : w)
        }}
        optionen={[
          { wert: KEINER, text: t('handbuch.keinBereich') },
          ...MODULE.filter((m) => m.id !== 'knowledge').map((m) => ({ wert: m.id, text: m.titel[sprache] })),
        ]}
      />
    </Feld>
  )
}
