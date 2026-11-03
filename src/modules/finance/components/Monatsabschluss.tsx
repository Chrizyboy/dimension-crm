import { Check, Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { herunterladen } from '@/lib/datei'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useAbschluss } from '../hooks/useFinanzen'
import { heuteZuerich } from '../lib/datum'
import { offenePostenCsv } from '../lib/offenePosten'
import { abschlussBestaetigen } from '../services/ablaeufe'
import type { Finanzdaten } from '../types'

const PUNKTE = [
  'konten_alt',
  'ohne_zuordnung',
  'ohne_firma',
  'pruefung_offen',
  'spesen_offen',
  'tranchen_offen',
  'zeiten_offen',
] as const

/** Vormonat als «JJJJ-MM». */
function vormonat(heute: string): string {
  const [j, m] = heute.split('-').map(Number) as [number, number]
  return m === 1 ? `${String(j - 1)}-12` : `${String(j)}-${String(m - 1).padStart(2, '0')}`
}

/**
 * Monatsabschluss für die Buchhaltung: Liste, was vor der Übergabe an AbaNinja erledigt sein soll (Konten aktuell,
 * Belege zugeordnet, Freigabe, Spesen, Tranchen, Zeiten). Bestätigen geht auch mit offenen Punkten; sie werden
 * mitgespeichert. Offene Posten als CSV für den Treuhänder.
 */
export function Monatsabschluss({ daten }: { daten: Finanzdaten }) {
  const { t } = useTranslation()
  const [monat, setMonat] = useState(vormonat(heuteZuerich()))
  const s = useAbschluss(monat)
  const { laeuft, aus } = useAktion()
  const offen = s.data ? PUNKTE.filter((p) => s.data[p] > 0) : []

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('finanzen.abschluss.monat')}</KarteTitel>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label={t('finanzen.abschluss.monatWahl')}
            className="w-40"
            value={monat}
            onChange={(e) => {
              if (e.target.value) setMonat(e.target.value)
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              herunterladen(offenePostenCsv(daten), `offene-posten-${monat}.csv`, 'text/csv;charset=utf-8')
            }}
          >
            <Download />
            {t('finanzen.abschluss.csv')}
          </Button>
        </div>
      </KarteKopf>
      <KarteInhalt>
        {s.error ? (
          <Fehlerzustand details={String(s.error)} onNochmal={() => void s.refetch()} />
        ) : !s.data ? (
          <Skelett className="h-48" />
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {PUNKTE.map((p) => {
                const n = s.data[p]
                return (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full',
                        n > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok',
                      )}
                      aria-hidden="true"
                    >
                      {n > 0 ? '!' : <Check className="size-3" />}
                    </span>
                    <span className={n > 0 ? '' : 'text-muted-foreground'}>
                      {t(`finanzen.abschluss.punkt.${p}`, { count: n })}
                    </span>
                  </li>
                )
              })}
              <li className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="size-5" aria-hidden="true" />
                {s.data.abaninja_am
                  ? t('finanzen.abschluss.abaninja', { datum: formatDatum(s.data.abaninja_am.slice(0, 10)) })
                  : t('finanzen.abschluss.abaninjaNie')}
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {s.data.abschluss ? (
                <Badge ton="ok">
                  {t('finanzen.abschluss.bestaetigt', {
                    datum: formatDatum(s.data.abschluss.bestaetigt_am.slice(0, 10)),
                    name: daten.personen[s.data.abschluss.bestaetigt_von] ?? '',
                  })}
                </Badge>
              ) : (
                <Button
                  laedt={laeuft}
                  onClick={() =>
                    void aus(() => abschlussBestaetigen(monat, [...offen], null), {
                      de: 'Monat abgeschlossen',
                      fr: 'Mois clôturé',
                    })
                  }
                >
                  <Check />
                  {offen.length
                    ? t('finanzen.abschluss.bestaetigenOffen', { count: offen.length })
                    : t('finanzen.abschluss.bestaetigen')}
                </Button>
              )}
            </div>
          </>
        )}
      </KarteInhalt>
    </Karte>
  )
}
