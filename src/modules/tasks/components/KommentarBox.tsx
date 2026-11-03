import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/diverses'
import { Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useKommentare, useNeuLaden } from '../hooks/useAufgaben'
import { kommentiere } from '../services/aufgaben'
import type { Person } from '../types'

/** Uhrzeit «14:05» in Zürich. */
const zeit = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })

/** Verlauf einer Aufgabe: Kommentare, älteste zuerst; «@LP» meldet die Person in der Glocke. */
export function KommentarBox({ aufgabeId, personen }: { aufgabeId: string; personen: Person[] }) {
  const { t } = useTranslation()
  const neuLaden = useNeuLaden()
  const kommentare = useKommentare(aufgabeId)
  const [text, setText] = useState('')
  const [laeuft, setLaeuft] = useState(false)

  async function senden() {
    if (!text.trim()) return
    setLaeuft(true)
    try {
      await kommentiere(aufgabeId, text)
      setText('')
      neuLaden()
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(kommentare.data ?? []).map((k) => {
        const person = personen.find((p) => p.id === k.person_id)
        const name = person?.name ?? '–'
        return (
          <div key={k.id} className="flex gap-2 text-sm">
            <Avatar name={name} zeichen={person?.kurzzeichen ?? null} />
            <div className="min-w-0">
              <p className="whitespace-pre-line">{k.text}</p>
              <p className="text-muted-foreground text-xs">
                {name} · {formatDatum(k.erstellt_am)} {zeit(k.erstellt_am)}
              </p>
            </div>
          </div>
        )
      })}
      <Textarea
        aria-label={t('aufgaben.akte.kommentar')}
        placeholder={t('aufgaben.akte.kommentarPlatzhalter')}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void senden()
        }}
      />
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" disabled={laeuft || !text.trim()} onClick={() => void senden()}>
          {t('aufgaben.akte.kommentieren')}
        </Button>
      </div>
    </div>
  )
}
