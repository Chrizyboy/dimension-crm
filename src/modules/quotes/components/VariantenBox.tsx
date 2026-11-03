import { Check, Pencil } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { useOffertAenderung } from '../hooks/useOfferten'
import { setzeAngaben } from '../services/ablauf'
import type { Offerte } from '../types'
import { Box } from './Box'

const VariantenDialog = lazy(() => import('./VariantenDialog'))

/** Was der Kunde nach Einmalvergütung (EIV) und geschätzter Steuerersparnis bezahlt, aus dem Eturnity-PDF. */
function Netto({ o, betrag }: { o: Offerte; betrag: number }) {
  const { t } = useTranslation()
  const mwst = useMwst()
  const inkl = mitMwst(betrag, mwst)
  const eiv = o.wirtschaftlichkeit?.eivRappen ?? 0
  const steuer = o.wirtschaftlichkeit?.steuerersparnisRappen ?? 0
  return (
    <dl className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between gap-2">
        <dt>{t('offerten.varianten.inkl', { satz: mwst })}</dt>
        <dd className="zahlen">{formatChf(inkl, { mitWaehrung: true })}</dd>
      </div>
      {eiv > 0 && (
        <div className="text-muted-foreground flex justify-between gap-2">
          <dt>{t('offerten.varianten.eiv')}</dt>
          <dd className="zahlen">− {formatChf(eiv, { mitWaehrung: true })}</dd>
        </div>
      )}
      {steuer > 0 && (
        <div className="text-muted-foreground flex justify-between gap-2">
          <dt>{t('offerten.varianten.steuer')}</dt>
          <dd className="zahlen">− {formatChf(steuer, { mitWaehrung: true })}</dd>
        </div>
      )}
      <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
        <dt>{t('offerten.varianten.netto')}</dt>
        <dd className="zahlen">{formatChf(inkl - eiv - steuer, { mitWaehrung: true })}</dd>
      </div>
    </dl>
  )
}

/**
 * Varianten der Offerte (nur PV, mit Batterie, mit Wallbox …) nebeneinander; der Kunde wählt eine, sie bestimmt
 * Betrag und Leistung. Darunter der Nettopreis für den Kunden.
 */
export function VariantenBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const mwst = useMwst()
  const [bearbeiten, setBearbeiten] = useState(false)
  const waehlen = useOffertAenderung((k: string) => setzeAngaben(o.id, { variante: k }))
  const betrag = o.betragRappen ?? 0
  return (
    <Box
      titel={t('offerten.varianten.titel')}
      rechts={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setBearbeiten(true)
          }}
        >
          <Pencil />
          {t(o.varianten.length ? 'offerten.varianten.bearbeiten' : 'offerten.varianten.erfassen')}
        </Button>
      }
    >
      {o.varianten.length === 0 ? (
        <p className="text-muted-foreground">{t('offerten.varianten.keine')}</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-3">
          {o.varianten.map((v) => {
            const gewaehlt = v.k === o.variante
            return (
              <li
                key={v.k}
                className={cn('flex flex-col gap-1 rounded-lg border p-2.5', gewaehlt && 'border-ok border-2')}
              >
                <span className="flex flex-col items-start gap-1">
                  <span className="font-semibold">
                    {v.k} · {v.titel}
                  </span>
                  {gewaehlt && <Badge ton="ok">{t('offerten.varianten.gewaehlt')}</Badge>}
                </span>
                {v.betragRappen !== null && (
                  <span className="zahlen text-lg font-semibold">
                    {formatChf(v.betragRappen, { mitWaehrung: true })}
                  </span>
                )}
                {v.betragRappen !== null && (
                  <span className="text-muted-foreground text-xs">
                    {t('offerten.akte.exkl')} · {formatChf(mitMwst(v.betragRappen, mwst), { mitWaehrung: true })}{' '}
                    {t('offerten.akte.inkl', { satz: mwst })}
                  </span>
                )}
                <span className="text-xs">
                  {[v.kwp ? `${v.kwp} kWp` : null, v.batterie, v.text].filter(Boolean).join(' · ')}
                </span>
                {!gewaehlt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1 self-start"
                    laedt={waehlen.isPending && waehlen.variables === v.k}
                    onClick={() => {
                      waehlen.mutate(v.k, {
                        onError: (f) => {
                          meldeFehler(f, 'offerten.varianten')
                        },
                      })
                    }}
                  >
                    <Check />
                    {t('offerten.varianten.waehlen')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {betrag > 0 && (
        <div className="bg-muted/40 rounded-lg p-2.5">
          <h3 className="mb-1 text-xs font-semibold">{t('offerten.varianten.nettoTitel', { k: o.variante ?? '' })}</h3>
          <Netto o={o} betrag={betrag} />
        </div>
      )}
      <Suspense>
        {bearbeiten && (
          <VariantenDialog
            o={o}
            onSchliessen={() => {
              setBearbeiten(false)
            }}
          />
        )}
      </Suspense>
    </Box>
  )
}
