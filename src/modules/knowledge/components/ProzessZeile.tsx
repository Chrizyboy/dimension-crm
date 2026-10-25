import { FileText, History } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion, useDateien } from '../hooks/useHandbuch'
import { fassung, groesse } from '../lib/handbuch'
import { entferneEintrag } from '../services/handbuch'
import type { HandbuchEintrag } from '../types'
import { oeffneDatei } from './Oeffnen'

/** Ein Prozess: Klick öffnet das PDF in der Sprache der Person; Administration: neue Version, entfernen. */
export function ProzessZeile({
  eintrag: e,
  admin,
  onNeueVersion,
}: {
  eintrag: HandbuchEintrag
  admin: boolean
  onNeueVersion: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const f = fassung(e, sprache)
  const { laeuft, aus } = useAktion()
  const [wegFragen, setWegFragen] = useState(false)
  const [frueher, setFrueher] = useState(false)
  const alte = [...e.versionen].reverse()
  const dateiIds = alte
    .flatMap((v) => [sprache === 'fr' ? (v.datei_fr_id ?? v.datei_de_id) : v.datei_de_id])
    .filter((x): x is string => Boolean(x))
  const dateien = useDateien(dateiIds, frueher)

  const angaben = [
    e.version ? t('handbuch.version', { version: e.version }) : null,
    e.datum ? t('handbuch.vom', { datum: formatDatum(e.datum) }) : null,
    groesse(f.datei?.bytes ?? null) || null,
  ].filter(Boolean)

  return (
    <li>
      <Karte className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="hover:bg-muted focus-visible:ring-ring -m-1 flex min-w-0 flex-1 items-start gap-3 rounded-md p-1 text-left outline-none focus-visible:ring-2"
          onClick={() => void oeffneDatei(f.datei)}
        >
          <span className="bg-accent-soft text-accent-ink flex size-10 shrink-0 items-center justify-center rounded-md">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{f.titel}</span>
            {f.beschreibung && <span className="text-muted-foreground text-sm">{f.beschreibung}</span>}
            <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {angaben.join(' · ')}
              {f.nurDeutsch && <Badge ton="info">{t('handbuch.nurDeutsch')}</Badge>}
              {admin && sprache === 'de' && (
                <Badge ton={e.datei_fr ? 'ok' : 'neutral'}>
                  {e.datei_fr ? t('handbuch.deFr') : t('handbuch.nurDe')}
                </Badge>
              )}
            </span>
          </span>
        </button>
        {admin && (
          <div className="flex shrink-0 gap-2 sm:ml-auto">
            <Button size="sm" variant="secondary" onClick={onNeueVersion}>
              {t('handbuch.prozesse.neueVersion')}
            </Button>
            <Button
              size="sm"
              variant={wegFragen ? 'danger' : 'ghost'}
              laedt={laeuft}
              onClick={() => {
                if (!wegFragen) {
                  setWegFragen(true)
                  return
                }
                void aus(() => entferneEintrag(e.id), { de: 'Prozess entfernt', fr: 'Processus retiré' })
              }}
              onBlur={() => {
                setWegFragen(false)
              }}
            >
              {wegFragen ? t('handbuch.wirklichEntfernen') : t('handbuch.entfernen')}
            </Button>
          </div>
        )}
      </Karte>
      {alte.length > 0 && (
        <details
          className="text-muted-foreground mt-1 ml-3 text-sm"
          onToggle={(ev) => {
            setFrueher(ev.currentTarget.open)
          }}
        >
          <summary className="flex cursor-pointer items-center gap-1.5 py-1">
            <History className="size-3.5" aria-hidden="true" />
            {t('handbuch.prozesse.frueher', { anzahl: alte.length })}
          </summary>
          <ul className="flex flex-col gap-1 py-1 pl-5">
            {alte.map((v, i) => {
              const id = sprache === 'fr' ? (v.datei_fr_id ?? v.datei_de_id) : v.datei_de_id
              const datei = dateien.data?.find((d) => d.id === id) ?? null
              const text =
                [
                  v.version ? t('handbuch.version', { version: v.version }) : null,
                  v.datum ? formatDatum(v.datum) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') ||
                (datei?.name ?? t('handbuch.datei'))
              return (
                <li key={`${id ?? ''}-${String(i)}`}>
                  <button
                    type="button"
                    className="text-foreground underline-offset-2 hover:underline disabled:opacity-60"
                    disabled={!datei}
                    onClick={() => void oeffneDatei(datei)}
                  >
                    {text}
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </li>
  )
}
