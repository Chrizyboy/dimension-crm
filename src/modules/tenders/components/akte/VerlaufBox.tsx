import { FileSearch, History, MessageSquare, Send, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Zeitachse } from '@/components/shared/Zeitachse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../../hooks/useAktion'
import { notizSpeichern } from '../../services/submission'
import { Box } from '../Box'

/** Ein Eintrag im Verlauf, wie ihn `ladeVerlauf` liefert. */
export interface VerlaufEintrag {
  id: string
  art: string
  zeitpunkt: string
  text: string | null
  person: { name: string } | null
}

const ICON = { notiz: MessageSquare, ausschreibung: History } as const

/**
 * Verlauf des Dossiers (Meldungen, Entscheide, Anschreiben, Notizen) mit Eingabe für eine Notiz: Frage ans
 * Forum, Erkenntnis aus der Begehung, Anruf bei der Vergabestelle.
 */
export function VerlaufBox({ dossierId, eintraege }: { dossierId: string; eintraege: VerlaufEintrag[] }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)?.id ?? null
  const { laeuft, aus } = useAktion()
  const [text, setText] = useState('')

  async function speichern() {
    const s = text.trim()
    if (!s) return
    if (await aus(() => notizSpeichern(dossierId, ich, s), { de: 'Notiz gespeichert', fr: 'Note enregistrée' }))
      setText('')
  }

  return (
    <Box titel={t('ausschreibungen.akte.verlauf')} rechts={eintraege.length}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`notiz-${dossierId}`} className="sr-only">
          {t('ausschreibungen.akte.notiz')}
        </label>
        <Textarea
          id={`notiz-${dossierId}`}
          rows={2}
          value={text}
          placeholder={t('ausschreibungen.akte.notizHinweis')}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          className="self-end"
          disabled={!text.trim()}
          laedt={laeuft}
          onClick={() => void speichern()}
        >
          <Send />
          {t('ausschreibungen.akte.notizSpeichern')}
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <Zeitachse
          sprache={sprache}
          eintraege={eintraege.map((v) => ({
            id: v.id,
            zeitpunkt: v.zeitpunkt,
            icon: (ICON as Record<string, LucideIcon | undefined>)[v.art] ?? FileSearch,
            titel: (v.text ?? '').split('\n')[0] ?? '',
            text: (v.text ?? '').split('\n').slice(1).join('\n') || undefined,
            meta: v.person?.name,
          }))}
        />
      </div>
    </Box>
  )
}
