import { CheckCircle2, MessageSquareWarning, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useReklamationen } from '../hooks/useEinkauf'
import { formatMenge } from '../lib/anzeige'
import type { Reklamation } from '../lib/lagerTypen'
import { reklamationSpeichern } from '../services/reklamationen'
import type { Bestellung, Position } from '../types'
import { ReklamationDialog } from './ReklamationDialog'

const TON = { offen: 'warnung', gemeldet: 'info', erledigt: 'ok' } as const

/**
 * Reklamationen einer Bestellung: defekt, falsch, fehlt, zu viel. Stand offen → beim Lieferanten gemeldet →
 * erledigt (mit Lösung Gutschrift, Ersatz oder Rücksendung). Erst ab «bestellt» sichtbar.
 */
export function ReklamationAbschnitt({
  bestellung: b,
  positionen,
}: {
  bestellung: Bestellung
  positionen: Position[]
}) {
  const { t } = useTranslation()
  const liste = useReklamationen(b.id)
  const { laeuft, aus } = useAktion()
  const [dialog, setDialog] = useState<Reklamation | 'neu' | null>(null)
  if (!b.bestellt_am) return null
  const eintraege = liste.data ?? []
  const offen = eintraege.filter((r) => r.status !== 'erledigt').length
  const name = (r: Reklamation) =>
    positionen.find((p) => p.id === r.position_id)?.bezeichnung ?? t('einkauf.rek.ganzeBestellung')

  return (
    <AkteAbschnitt
      titel={t('einkauf.rek.titel')}
      zusatz={offen ? t('einkauf.rek.offenZahl', { count: offen }) : String(eintraege.length)}
    >
      <div className="flex flex-col gap-2">
        {eintraege.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('einkauf.rek.leer')}</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-md border">
            {eintraege.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <MessageSquareWarning className="text-muted-foreground size-4" aria-hidden="true" />
                  <span className="font-medium">{t(`einkauf.rek.gruende.${r.grund}`)}</span>
                  <span className="text-muted-foreground min-w-0 truncate">
                    {name(r)}
                    {r.menge != null && ` · ${formatMenge(r.menge)}`}
                  </span>
                  <Badge ton={TON[r.status]} punkt className="ml-auto">
                    {t(`einkauf.rek.status.${r.status}`)}
                  </Badge>
                </div>
                {r.beschreibung && <p>{r.beschreibung}</p>}
                <p className="text-muted-foreground text-xs">
                  {[
                    r.gemeldet_am && t('einkauf.rek.gemeldetAm', { datum: formatDatum(r.gemeldet_am) }),
                    r.loesung && t(`einkauf.rek.loesungen.${r.loesung}`),
                    r.erledigt_am && formatDatum(r.erledigt_am),
                    r.antwort,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {r.status !== 'erledigt' && (
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'offen' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        laedt={laeuft}
                        onClick={() =>
                          void aus(() => reklamationSpeichern({ id: r.id, status: 'gemeldet' }), {
                            de: 'Als gemeldet eingetragen',
                            fr: 'Enregistrée comme signalée',
                          })
                        }
                      >
                        <Send />
                        {t('einkauf.rek.gemeldet')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDialog(r)
                      }}
                    >
                      <CheckCircle2 />
                      {t('einkauf.rek.abschliessen')}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {b.status !== 'storniert' && (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              setDialog('neu')
            }}
          >
            <Plus />
            {t('einkauf.rek.erfassen')}
          </Button>
        )}
      </div>
      {dialog && (
        <ReklamationDialog
          bestellungId={b.id}
          positionen={positionen}
          reklamation={dialog === 'neu' ? null : dialog}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </AkteAbschnitt>
  )
}
