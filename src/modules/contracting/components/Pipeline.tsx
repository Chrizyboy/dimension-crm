import { CalendarClock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useGrossprojekte, useRegeln } from '../hooks/useGrossprojekte'
import { groesse } from '../lib/anzeige'
import { heuteIso, inPipeline, leistung, nachStufe, pipelineZahlen, prozent, ueberfaellig } from '../lib/pipeline'
import { STUFEN, type Grossprojekt } from '../types'

/** Eine Kennzahl oben. */
function Zahl({ wert, text, ton, ziel }: { wert: string; text: string; ton?: 'bad' | 'ok'; ziel?: number }) {
  return (
    <div className="bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2">
      <span className={cn('zahlen text-xl font-semibold', ton === 'bad' && 'text-bad', ton === 'ok' && 'text-ok')}>
        {wert}
      </span>
      <span className="text-muted-foreground text-xs">{text}</span>
      {ziel !== undefined && (
        <span className="bg-muted mt-1 h-1.5 overflow-hidden rounded" aria-hidden="true">
          <span className="bg-ok block h-full" style={{ width: `${String(Math.min(100, ziel))}%` }} />
        </span>
      )}
    </div>
  )
}

/** Karte eines Projekts im Board: Nummer, Punkte, Name, Grösse, nächster Schritt mit Datum. */
function ProjektKarte({ g, heute, onOeffnen }: { g: Grossprojekt; heute: string; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const spaet = ueberfaellig(g, heute)
  return (
    <button
      type="button"
      onClick={() => {
        onOeffnen(g.id)
      }}
      className={cn(
        'bg-surface hover:border-accent focus-visible:ring-ring flex flex-col gap-1 rounded-lg border border-l-4 p-2.5 text-left text-sm shadow-xs outline-none focus-visible:ring-2',
        spaet ? 'border-l-bad' : !g.naechster_schritt ? 'border-l-warn' : 'border-l-ok',
      )}
    >
      <span className="text-muted-foreground flex justify-between gap-2 text-xs">
        <span className="zahlen font-mono">{g.nummer}</span>
        <span>{t('grossprojekte.punkte', { n: g.punkte })}</span>
      </span>
      <span className="line-clamp-2 font-medium">{g.bauherr ?? g.titel}</span>
      <span className="text-muted-foreground truncate text-xs">
        {[g.gemeinde, groesse(g, t('grossprojekte.waerme'))].filter(Boolean).join(' · ')}
      </span>
      {g.naechster_schritt ? (
        <Badge ton={spaet ? 'kritisch' : 'neutral'} className="max-w-full">
          <CalendarClock />
          <span className="truncate">
            {g.naechster_schritt}
            {g.naechster_schritt_am ? ` · ${formatDatum(g.naechster_schritt_am)}` : ''}
          </span>
        </Badge>
      ) : (
        <Badge ton="warnung">{t('grossprojekte.pipeline.ohneSchritt')}</Badge>
      )}
    </button>
  )
}

/**
 * Pipeline der bewilligten Grossprojekte bis zum Vertrag: oben die Kennzahlen für die Steuerung (MWp offen und
 * gewichtet, unterschrieben gegen das Ziel, überfällige Schritte), darunter ein Board nach Stufe.
 */
export function Pipeline({ onOeffnen, onNeu }: { onOeffnen: (id: string) => void; onNeu: () => void }) {
  const { t } = useTranslation()
  const [verlorene, setVerlorene] = useState(false)
  const alle = useGrossprojekte().data ?? []
  const regeln = useRegeln().data?.pipeline
  const heute = heuteIso()
  const z = pipelineZahlen(alle, regeln, heute)
  const board = nachStufe(alle)
  const verloren = alle.filter((g) => inPipeline(g) && g.stufe === 'verloren')
  const leer = STUFEN.every((s) => board[s].length === 0)
  const zielText = `${leistung(z.kwpVertrag)} / ${leistung(z.zielKwp)}`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Zahl wert={leistung(z.kwpOffen)} text={t('grossprojekte.pipeline.zahl.offen', { n: z.offen })} />
        <Zahl wert={leistung(z.kwpGewichtet)} text={t('grossprojekte.pipeline.zahl.gewichtet')} />
        <Zahl
          wert={zielText}
          text={t('grossprojekte.pipeline.zahl.ziel', { jahr: z.zielJahr })}
          ton="ok"
          ziel={z.zielKwp ? (z.kwpVertrag / z.zielKwp) * 100 : 0}
        />
        <Zahl
          wert={`CHF ${formatChf(Math.round(z.investitionGewichtet / 100_000) * 100_000).replace(/\.00$/, '')}`}
          text={t('grossprojekte.pipeline.zahl.investition')}
        />
        <Zahl
          wert={String(z.ueberfaellig)}
          text={t('grossprojekte.pipeline.zahl.ueberfaellig')}
          {...(z.ueberfaellig ? { ton: 'bad' as const } : {})}
        />
        <Zahl wert={String(z.ohneSchritt)} text={t('grossprojekte.pipeline.zahl.ohneSchritt')} />
      </div>
      {leer ? (
        <Leerzustand
          icon={Plus}
          titel={t('grossprojekte.pipeline.leerTitel')}
          text={t('grossprojekte.pipeline.leerText')}
          aktion={<Button onClick={onNeu}>{t('grossprojekte.pipeline.zurAuswahl')}</Button>}
        />
      ) : (
        <div className="grid auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1">
          {STUFEN.map((s) => (
            <section
              key={s}
              aria-label={t(`grossprojekte.stufe.${s}`)}
              className="bg-muted/40 flex min-w-0 flex-col gap-2 rounded-lg border p-2"
            >
              <h3 className="flex justify-between gap-2 px-1 text-sm font-semibold">
                {t(`grossprojekte.stufe.${s}`)}
                <span className="text-muted-foreground zahlen">{board[s].length}</span>
              </h3>
              <p className="text-muted-foreground -mt-1.5 px-1 text-xs">
                {t(`grossprojekte.stufeText.${s}`)} · {prozent(s, regeln)} %
              </p>
              {board[s].map((g) => (
                <ProjektKarte key={g.id} g={g} heute={heute} onOeffnen={onOeffnen} />
              ))}
            </section>
          ))}
        </div>
      )}
      {verloren.length > 0 && (
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setVerlorene(!verlorene)
            }}
          >
            {t('grossprojekte.pipeline.verlorene', { n: verloren.length })}
          </Button>
          {verlorene && (
            <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
              {verloren.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className="hover:text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      onOeffnen(g.id)
                    }}
                  >
                    {g.nummer} · {g.bauherr ?? g.titel}
                  </button>
                  {g.grund ? ` · ${g.grund}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
