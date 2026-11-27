import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBuchungen } from '../hooks/useFinanzen'
import { heuteZuerich, plusTage } from '../lib/datum'
import type { Finanzdaten, Konto } from '../types'
import type { FinanzFenster } from './Fenster'

/**
 * Bankkonten je Gesellschaft mit Stand von Hand. Das Einlesen des Kontoauszugs (camt.053) ist seit 27.11.2026
 * ausgeblendet (Chris: nie besprochen); `lib/camt.ts` und `auszugEinlesen` bleiben für eine spätere Rückkehr.
 */
export function Konten({ daten, onFenster }: { daten: Finanzdaten; onFenster: (f: FinanzFenster) => void }) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState<string | null>(null)
  const heute = heuteZuerich()

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('finanzen.abschluss.konten')}</KarteTitel>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onFenster({ art: 'konto', id: null, firma: null })
            }}
          >
            <Plus />
            {t('finanzen.konto.neu')}
          </Button>
        </div>
      </KarteKopf>
      <KarteInhalt>
        {daten.konten.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('finanzen.abschluss.keineKonten')}</p>
        ) : (
          <ul className="divide-y">
            {daten.firmen.map((f) =>
              daten.konten
                .filter((k) => k.firma_id === f.id)
                .map((k) => (
                  <KontoZeile
                    key={k.id}
                    k={k}
                    firma={f.name}
                    alt={!k.stand_am || k.stand_am < plusTage(heute, -4)}
                    offen={offen === k.id}
                    onOffen={() => {
                      setOffen(offen === k.id ? null : k.id)
                    }}
                    onBearbeiten={() => {
                      onFenster({ art: 'konto', id: k.id, firma: k.firma_id })
                    }}
                  />
                )),
            )}
          </ul>
        )}
      </KarteInhalt>
    </Karte>
  )
}

function KontoZeile({
  k,
  firma,
  alt,
  offen,
  onOffen,
  onBearbeiten,
}: {
  k: Konto
  firma: string
  alt: boolean
  offen: boolean
  onOffen: () => void
  onBearbeiten: () => void
}) {
  const { t } = useTranslation()
  const b = useBuchungen(offen ? k.id : null)
  return (
    <li className={cn('py-2', !k.aktiv && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-expanded={offen}
          aria-label={t('finanzen.abschluss.buchungen')}
          onClick={onOffen}
        >
          {offen ? <ChevronDown /> : <ChevronRight />}
        </Button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onBearbeiten}>
          <span className="font-medium hover:underline">{k.name}</span>
          <span className="text-muted-foreground ml-2 text-xs">{[firma, k.iban].filter(Boolean).join(' · ')}</span>
        </button>
        {alt && k.aktiv && <Badge ton="warnung">{t('finanzen.abschluss.standAlt')}</Badge>}
        <span className="text-right">
          <span className="zahlen block font-semibold">
            {k.stand_rappen !== null ? formatChf(k.stand_rappen, { mitWaehrung: true }) : '–'}
          </span>
          <span className="text-muted-foreground text-xs">{k.stand_am ? formatDatum(k.stand_am) : ''}</span>
        </span>
      </div>
      {offen && (
        <ul className="mt-2 ml-10 divide-y text-sm">
          {(b.data ?? []).length === 0 ? (
            <li className="text-muted-foreground py-1.5">{t('finanzen.abschluss.keineBuchungen')}</li>
          ) : (
            (b.data ?? []).map((x) => (
              <li key={x.id} className="flex justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  {formatDatum(x.datum)} · {x.gegenpartei || x.text}
                  {x.kreditor_id && (
                    <Badge ton="ok" className="ml-2">
                      {t('finanzen.abschluss.erkannt')}
                    </Badge>
                  )}
                </span>
                <span className={cn('zahlen', x.betrag_rappen > 0 && 'text-ok')}>{formatChf(x.betrag_rappen)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
  )
}
