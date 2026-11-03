import { useQueryClient } from '@tanstack/react-query'
import { type LucideIcon, Mail, MessageSquare, Phone, Send, StickyNote, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Zeitachse, type Zeitpunkt } from '@/components/shared/Zeitachse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { erfasseKontakt, type ladeVerlauf } from '../services/adressbuch'
import { Box, Leer } from './Box'

const ICON = { anruf: Phone, mail: Mail, besuch: Users, notiz: StickyNote, sms: MessageSquare } as const
const ARTEN = ['anruf', 'mail', 'notiz'] as const

/** Verlauf mit diesem Partner (Anrufe, Mails, Notizen) und eine Zeile, um schnell etwas festzuhalten. */
export function VerlaufBox({
  kontaktId,
  eintraege,
  laedt,
}: {
  kontaktId: string
  eintraege: Awaited<ReturnType<typeof ladeVerlauf>> | undefined
  laedt: boolean
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const arten = useAuswahl('aktivitaet')
  const personId = useAnmeldung((z) => z.ich?.id ?? null)
  const client = useQueryClient()
  const [art, setArt] = useState<(typeof ARTEN)[number]>('anruf')
  const [text, setText] = useState('')
  const [speichert, setSpeichert] = useState(false)

  async function festhalten() {
    if (!text.trim()) return
    setSpeichert(true)
    try {
      await erfasseKontakt(kontaktId, personId, art, text)
      setText('')
      void client.invalidateQueries({ queryKey: ['kontakte'] })
    } catch (f) {
      meldeFehler(f, 'adressbuch.verlauf')
    } finally {
      setSpeichert(false)
    }
  }

  const punkte: Zeitpunkt[] = (eintraege ?? []).map((e) => ({
    id: e.id,
    zeitpunkt: e.zeitpunkt,
    icon: (ICON as Record<string, LucideIcon | undefined>)[e.art] ?? StickyNote,
    titel: arten.text(e.art),
    text: e.text ?? undefined,
    meta: e.person?.name,
  }))

  return (
    <Box titel={t('adressbuch.akte.verlauf')}>
      <div className="flex flex-col gap-2">
        <div role="radiogroup" aria-label={t('adressbuch.akte.verlaufArt')} className="flex gap-1.5">
          {ARTEN.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={art === a}
              onClick={() => {
                setArt(a)
              }}
              className={
                art === a
                  ? 'bg-primary text-primary-foreground border-primary h-7 rounded-full border px-3 text-xs font-medium'
                  : 'hover:bg-muted h-7 rounded-full border px-3 text-xs font-medium'
              }
            >
              {arten.text(a)}
            </button>
          ))}
        </div>
        <Textarea
          rows={2}
          aria-label={t('adressbuch.akte.verlaufText')}
          placeholder={t('adressbuch.akte.verlaufPlatzhalter')}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        <Button
          size="sm"
          className="self-end"
          laedt={speichert}
          disabled={!text.trim()}
          onClick={() => void festhalten()}
        >
          <Send />
          {t('adressbuch.akte.festhalten')}
        </Button>
      </div>
      {laedt ? null : punkte.length === 0 ? (
        <Leer>{t('adressbuch.akte.keinVerlauf')}</Leer>
      ) : (
        <Zeitachse eintraege={punkte} sprache={sprache} />
      )}
    </Box>
  )
}
