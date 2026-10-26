import { Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { Textarea } from '@/components/ui/input'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { useAktion, useAnhaenge } from '../hooks/useHandbuch'
import { meldungNummer } from '../lib/handbuch'
import { beantworten } from '../services/meldungen'
import { MELDUNG_STATUS, type Meldung, type MeldungStatus } from '../types'
import { oeffneDatei } from './Oeffnen'

const TON: Record<MeldungStatus, 'info' | 'warnung' | 'ok' | 'marke'> = {
  neu: 'info',
  arbeit: 'warnung',
  info: 'marke',
  erledigt: 'ok',
}

/** Eine Meldung mit Text, Anhängen und Antwort; die Administration setzt Status und antwortet direkt hier. */
export function MeldungKarte({
  meldung: m,
  admin,
  hervorheben,
}: {
  meldung: Meldung
  admin: boolean
  hervorheben: boolean
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const module = useSichtbareModule()
  const { laeuft, aus } = useAktion()
  const [status, setStatus] = useState<MeldungStatus>(m.status)
  const [antwort, setAntwort] = useState(m.antwort ?? '')
  const anhaenge = useAnhaenge(m.id)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (hervorheben) ref.current?.scrollIntoView({ block: 'center' })
  }, [hervorheben])
  const bereich =
    module.find((x) => x.id === m.bereich)?.titel[sprache] ?? (m.bereich ? t('handbuch.meldungen.anderes') : null)
  const geaendert = status !== m.status || antwort.trim() !== (m.antwort ?? '')

  return (
    <li ref={ref}>
      <Karte className={cn('flex flex-col gap-2 p-4', hervorheben && 'ring-ring ring-2')}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium">
            <span className="text-muted-foreground zahlen">{meldungNummer(m)}</span> · {m.titel}
          </p>
          <Badge ton={TON[m.status]} punkt>
            {t(`handbuch.meldungen.status.${m.status}`)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {[m.person, formatDatumZeit(m.erstellt_am), bereich].filter(Boolean).join(' · ')}
          {m.prio === 'dringend' && (
            <Badge ton="kritisch" className="ml-2">
              {t('handbuch.meldungen.prioWert.dringend')}
            </Badge>
          )}
        </p>
        <p className="text-sm whitespace-pre-line">{m.text}</p>
        {m.erwartet && (
          <p className="text-sm whitespace-pre-line">
            <span className="font-medium">{t('handbuch.meldungen.erwartetKurz')}</span> {m.erwartet}
          </p>
        )}
        {(anhaenge.data?.length ?? 0) > 0 && (
          <ul className="flex flex-wrap gap-2">
            {anhaenge.data?.map((d) => (
              <li key={d.id}>
                <Button size="sm" variant="secondary" onClick={() => void oeffneDatei(d)}>
                  <Paperclip />
                  {d.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {m.antwort && !admin && (
          <div className="bg-muted rounded-md p-3 text-sm">
            <p className="font-medium">
              {m.antwort_von
                ? t('handbuch.meldungen.antwortVon', { name: m.antwort_von })
                : t('handbuch.meldungen.antwort')}
            </p>
            <p className="whitespace-pre-line">{m.antwort}</p>
          </div>
        )}
        {admin && (
          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-start">
            <Auswahl
              aria-label={t('handbuch.meldungen.statusSetzen')}
              value={status}
              onValueChange={(s) => {
                setStatus(MELDUNG_STATUS.find((x) => x === s) ?? m.status)
              }}
              optionen={MELDUNG_STATUS.map((s) => ({ wert: s, text: t(`handbuch.meldungen.status.${s}`) }))}
              className="sm:w-44"
            />
            <Textarea
              aria-label={t('handbuch.meldungen.antwortAn', { name: m.person ?? '' })}
              placeholder={t('handbuch.meldungen.antwortAn', { name: m.person?.split(' ')[0] ?? '' })}
              rows={2}
              className="flex-1"
              value={antwort}
              onChange={(e) => {
                setAntwort(e.target.value)
              }}
            />
            <Button
              disabled={!geaendert}
              laedt={laeuft}
              onClick={() =>
                void aus(() => beantworten(m.id, status, antwort), {
                  de: 'Meldung gespeichert',
                  fr: 'Signalement enregistré',
                })
              }
            >
              {t('allgemein.speichern')}
            </Button>
          </div>
        )}
        {admin && m.umgebung && <p className="text-muted-foreground text-xs break-all">{m.umgebung}</p>}
      </Karte>
    </li>
  )
}
