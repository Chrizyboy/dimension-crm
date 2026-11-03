import { useQueryClient } from '@tanstack/react-query'
import { Check, Image, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatumZeit } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { meldungErledigen } from '../services/leitung'
import type { MeldungZeile } from '../types'

/** Eine Meldung von der Baustelle mit «Erledigt» (Notiz) bzw. «Wieder öffnen». */
export function MeldungZeileAnzeige({ m }: { m: MeldungZeile }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [notiz, setNotiz] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function setzen(wieder: boolean) {
    setLaeuft(true)
    try {
      await meldungErledigen(m.id, notiz?.trim() || undefined, wieder)
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      setNotiz(null)
    } catch (e) {
      meldeFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="border-border flex flex-col gap-1.5 border-b pb-2 text-sm last:border-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge ton={m.erledigt_am ? 'ok' : m.weiter ? 'warnung' : 'kritisch'}>
          {m.nummer} {t(`baustelle.meldung.arten.${m.art}`)}
        </Badge>
        {!m.weiter && !m.erledigt_am && <Badge ton="kritisch">{t('baustelle.meldung.stehtKurz')}</Badge>}
        {m.fotos_anzahl > 0 && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Image className="size-3" aria-hidden="true" />
            {m.fotos_anzahl}
          </span>
        )}
      </div>
      <p>{m.text}</p>
      <p className="text-muted-foreground text-xs">
        {[m.projekt_nummer, m.kunde, m.person, formatDatumZeit(m.erstellt_am)].filter(Boolean).join(' · ')}
      </p>
      {m.erledigt_am ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ok">
            {t('baustelle.meldung.erledigtVon', {
              name: m.erledigt_von_name ?? '',
              am: formatDatumZeit(m.erledigt_am),
            })}
            {m.erledigt_notiz ? `: ${m.erledigt_notiz}` : ''}
          </span>
          <Button size="sm" variant="ghost" laedt={laeuft} onClick={() => void setzen(true)}>
            <RotateCcw />
            {t('baustelle.meldung.wieder')}
          </Button>
        </div>
      ) : notiz === null ? (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            setNotiz('')
          }}
        >
          <Check />
          {t('baustelle.meldung.erledigen')}
        </Button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void setzen(false)
          }}
        >
          <Input
            autoFocus
            aria-label={t('baustelle.meldung.notiz')}
            placeholder={t('baustelle.meldung.notiz')}
            className="h-9 min-w-0 flex-1"
            value={notiz}
            onChange={(e) => {
              setNotiz(e.target.value)
            }}
          />
          <Button type="submit" size="sm" laedt={laeuft}>
            {t('baustelle.meldung.erledigen')}
          </Button>
        </form>
      )}
    </div>
  )
}
