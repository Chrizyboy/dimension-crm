import { ChevronDown, ChevronRight, FileUp, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useBuchungen } from '../hooks/useFinanzen'
import { gleicheIban, leseCamt } from '../lib/camt'
import { heuteZuerich, plusTage } from '../lib/datum'
import { auszugEinlesen } from '../services/ablaeufe'
import type { Finanzdaten, Konto } from '../types'
import type { FinanzFenster } from './Fenster'

/**
 * Bankkonten je Gesellschaft. Der Stand kommt aus dem Kontoauszug (camt.053 aus dem E-Banking): Buchungen werden
 * ohne Doppelte übernommen, Belastungen eines freigegebenen Zahllaufs als bezahlt erkannt. Die Datei wird nur im
 * Browser gelesen; übernommen werden Datum, Betrag, Text, Gegenpartei und Referenz.
 */
export function Konten({ daten, onFenster }: { daten: Finanzdaten; onFenster: (f: FinanzFenster) => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const datei = useRef<HTMLInputElement>(null)
  const [offen, setOffen] = useState<string | null>(null)
  const heute = heuteZuerich()

  const einlesen = async (f: File) => {
    let auszuege
    try {
      auszuege = leseCamt(await f.text())
    } catch {
      melde('kritisch', { de: 'Keine camt.053-Datei', fr: 'Pas un fichier camt.053' })
      return
    }
    let neu = 0
    let bezahlt = 0
    const fremd: string[] = []
    await aus(async () => {
      for (const a of auszuege) {
        const konto = daten.konten.find((k) => gleicheIban(k.iban, a.iban))
        if (!konto) {
          fremd.push(a.iban)
          continue
        }
        const r = await auszugEinlesen(konto.id, a.stand_rappen, a.stand_am, a.buchungen)
        neu += r.neu
        bezahlt += r.bezahlt
      }
    })
    melde(fremd.length ? 'warnung' : 'ok', {
      de: `${String(neu)} neue Buchungen, ${String(bezahlt)} Zahlungen erkannt${fremd.length ? `; ohne Konto: ${fremd.join(', ')}` : ''}`,
      fr: `${String(neu)} nouvelles écritures, ${String(bezahlt)} paiements reconnus${fremd.length ? `; sans compte : ${fremd.join(', ')}` : ''}`,
    })
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('finanzen.abschluss.konten')}</KarteTitel>
        <div className="flex gap-2">
          <input
            ref={datei}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="hidden"
            aria-label={t('finanzen.abschluss.auszug')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void einlesen(f)
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            laedt={laeuft}
            disabled={!daten.konten.length}
            onClick={() => datei.current?.click()}
          >
            <FileUp />
            {t('finanzen.abschluss.auszug')}
          </Button>
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
        <p className="text-muted-foreground mt-3 text-xs">{t('finanzen.abschluss.auszugHinweis')}</p>
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
