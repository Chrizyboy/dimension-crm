import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatDatumZeit } from '@/lib/format'
import { useNotizen } from '../hooks/useArbeit'
import { useAktion } from '../hooks/useAktion'
import { notizSchreiben } from '../services/arbeit'
import type { Mail } from '../types'

/**
 * Interne Notizen zur Mail (nur im Team, gehen nie hinaus). «@Loris» oder «@lo» gibt der Person eine Glocke, z. B.
 * «@Andy kannst du die Leistung bestätigen?».
 */
export function NotizenBox({ m }: { m: Mail }) {
  const { t } = useTranslation()
  const notizen = useNotizen(m.id)
  const { laeuft, aus } = useAktion()
  const [text, setText] = useState('')
  const senden = () => {
    const s = text.trim()
    if (!s) return
    void aus(() => notizSchreiben(m.id, s)).then((ok) => {
      if (ok) {
        setText('')
        void notizen.refetch()
      }
    })
  }
  return (
    <AkteAbschnitt titel={t('posteingang.akte.notizen')} offen={(notizen.data?.length ?? 0) > 0}>
      <ul className="flex flex-col gap-2">
        {(notizen.data ?? []).map((n) => (
          <li key={n.id} className="flex gap-2 text-sm">
            <Avatar name={n.person} className="size-6 text-[10px]" />
            <div className="min-w-0">
              <p>
                <span className="font-medium">{n.person}</span>{' '}
                <span className="text-muted-foreground zahlen text-xs">{formatDatumZeit(n.am)}</span>
              </p>
              <p className="break-words whitespace-pre-wrap">{n.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          senden()
        }}
      >
        <Input
          aria-label={t('posteingang.akte.notizNeu')}
          placeholder={t('posteingang.akte.notizNeu')}
          value={text}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        <Button
          type="submit"
          variant="secondary"
          laedt={laeuft}
          disabled={!text.trim()}
          aria-label={t('posteingang.akte.notizSenden')}
        >
          <Send />
        </Button>
      </form>
    </AkteAbschnitt>
  )
}
