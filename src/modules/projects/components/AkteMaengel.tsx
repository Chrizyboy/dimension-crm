import { Check, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteIso } from '../lib/leitstand'
import { mangelErledigen, mangelSpeichern } from '../services/leitstand'
import type { Mangel } from '../types'
import { Box } from './AkteBox'

const ARTEN = ['mangel', 'restarbeit'] as const

/**
 * Mängel und Restarbeiten des Projekts: offene oben, mit Frist; Haken erledigt, erledigte bleiben sichtbar und lassen
 * sich wieder öffnen. Solange etwas offen ist, lässt sich der Schritt «Übergabe» nicht abschliessen (Datenbank).
 */
export function AkteMaengel({ projektId, maengel }: { projektId: string; maengel: Mangel[] }) {
  const { t } = useTranslation()
  const { aus, laeuft } = useAktion()
  const [art, setArt] = useState<(typeof ARTEN)[number]>('mangel')
  const [text, setText] = useState('')
  const [frist, setFrist] = useState('')
  const [alle, setAlle] = useState(false)
  const heute = heuteIso()
  const offen = maengel.filter((m) => m.status === 'offen')
  const erledigt = maengel.filter((m) => m.status === 'erledigt')
  const zeige = alle ? maengel : offen

  const neu = async () => {
    const ok = await aus(
      () =>
        mangelSpeichern(crypto.randomUUID(), projektId, {
          art,
          text: text.trim(),
          ort: null,
          frist: frist || null,
          verantwortlich_id: null,
        }),
      { de: 'Erfasst', fr: 'Enregistré' },
    )
    if (ok) {
      setText('')
      setFrist('')
    }
  }

  return (
    <Box
      titel={t('projekte.maengel.titel')}
      rechts={
        offen.length > 0 ? (
          <Badge ton="warnung">{t('projekte.maengel.offen', { anzahl: offen.length })}</Badge>
        ) : maengel.length > 0 ? (
          <Badge ton="ok">{t('projekte.maengel.alleErledigt')}</Badge>
        ) : undefined
      }
    >
      {zeige.length === 0 ? (
        <p className="text-muted-foreground">{t('projekte.maengel.leer')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {zeige.map((m) => {
            const zuSpaet = m.status === 'offen' && m.frist != null && m.frist < heute
            return (
              <li key={m.id} className="flex items-start gap-2 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={t(m.status === 'offen' ? 'projekte.maengel.erledigen' : 'projekte.maengel.oeffnen', {
                    text: m.text,
                  })}
                  onClick={() => void aus(() => mangelErledigen(m.id, m.status === 'offen'))}
                >
                  {m.status === 'offen' ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={m.status === 'erledigt' ? 'text-muted-foreground line-through' : undefined}>
                    {m.text}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {[
                      t(`projekte.maengel.art.${m.art}`),
                      m.ort,
                      m.verantwortlich ?? m.subunternehmer,
                      m.status === 'erledigt' && m.erledigt_am
                        ? t('projekte.maengel.erledigtAm', { datum: formatDatum(m.erledigt_am.slice(0, 10)) })
                        : null,
                      m.erledigt_notiz,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {m.status === 'offen' && m.frist && (
                  <Badge ton={zuSpaet ? 'kritisch' : 'neutral'}>
                    {t('projekte.maengel.bis', { datum: formatDatum(m.frist) })}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {erledigt.length > 0 && (
        <button
          type="button"
          className="text-muted-foreground self-start text-xs underline"
          onClick={() => {
            setAlle(!alle)
          }}
        >
          {alle ? t('projekte.maengel.nurOffene') : t('projekte.maengel.erledigteZeigen', { anzahl: erledigt.length })}
        </button>
      )}
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
        <Filterchips
          beschriftung={t('projekte.maengel.artWahl')}
          einzeln
          optionen={ARTEN.map((a) => ({ wert: a, text: t(`projekte.maengel.art.${a}`) }))}
          gewaehlt={[art]}
          onChange={(v) => {
            setArt((v[0] ?? 'mangel') as (typeof ARTEN)[number])
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-48 flex-1"
            aria-label={t('projekte.maengel.eingabe')}
            placeholder={t('projekte.maengel.eingabe')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) void neu()
            }}
          />
          <Input
            type="date"
            className="w-40"
            aria-label={t('projekte.maengel.frist')}
            value={frist}
            onChange={(e) => {
              setFrist(e.target.value)
            }}
          />
          <Button size="sm" disabled={!text.trim()} laedt={laeuft} onClick={() => void neu()}>
            <Plus className="size-4" aria-hidden="true" />
            {t('projekte.maengel.erfassen')}
          </Button>
        </div>
      </div>
    </Box>
  )
}
