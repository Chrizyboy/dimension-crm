import { useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hatRecht } from '@/lib/rechte'
import { meldeFehler } from '@/services/fehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { sollSetzen } from '../services/leitung'
import type { BaustellenAkte } from '../types'
import { sollTon } from '../lib/auswertung'
import { Balken } from './Balken'

/**
 * Soll gegen Ist der Baustelle. Das Soll rechnet die Datenbank nach Faustregel (kWp, Dach, Speicher aus
 * `einstellungen.baustelle.soll`); die Projektleitung kann es pro Projekt überschreiben (leer = wieder Faustregel).
 */
export function SollStunden({ projektId, s }: { projektId: string; s: BaustellenAkte['stunden'] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const [wert, setWert] = useState<string | null>(null)
  const ton = sollTon(s.arbeit, s.soll)

  async function speichern() {
    try {
      await sollSetzen(projektId, wert?.trim() ? Number(wert.replace(',', '.')) : null)
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      setWert(null)
    } catch (e) {
      meldeFehler(e)
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <span
            className={`zahlen text-lg font-semibold ${ton === 'bad' ? 'text-bad' : ton === 'warn' ? 'text-warn' : ''}`}
          >
            {s.arbeit}
          </span>{' '}
          / <span className="zahlen">{s.soll ?? '–'}</span> h
        </span>
        <span className="text-muted-foreground text-xs">
          {s.quelle === 'hand' ? t('baustelle.akte.sollHand') : t('baustelle.akte.sollRegel')} ·{' '}
          {t('baustelle.akte.reise', { h: s.reise })}
        </span>
      </div>
      {s.soll ? (
        <Balken wert={(100 * s.arbeit) / s.soll} ton={ton} beschriftung={t('baustelle.leitung.sollIst')} />
      ) : null}
      {hatRecht(ich, 'preise') &&
        (wert === null ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => {
              setWert(s.quelle === 'hand' && s.soll != null ? String(s.soll) : '')
            }}
          >
            <Pencil />
            {t('baustelle.akte.sollAendern')}
          </Button>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void speichern()
            }}
          >
            <Input
              autoFocus
              inputMode="decimal"
              aria-label={t('baustelle.akte.sollStunden')}
              placeholder={t('baustelle.akte.sollLeer')}
              className="w-40"
              value={wert}
              onChange={(e) => {
                setWert(e.target.value)
              }}
            />
            <Button type="submit" size="sm">
              {t('baustelle.akte.speichern')}
            </Button>
          </form>
        ))}
    </div>
  )
}
