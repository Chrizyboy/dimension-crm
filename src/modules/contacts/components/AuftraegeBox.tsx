import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum, unterzeile } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { bewertungText } from '../lib/rollen'
import { bewerteAuftrag } from '../services/partnerTeile'
import type { Auftrag } from '../types'
import { Box, Leer, Posten } from './Box'

type Kriterium = 'qualitaet' | 'termin' | 'preis'
const KRITERIEN: Kriterium[] = ['qualitaet', 'termin', 'preis']
const TON: Record<string, 'neutral' | 'info' | 'ok' | 'kritisch'> = {
  angefragt: 'neutral',
  bestaetigt: 'info',
  erledigt: 'ok',
  abgesagt: 'kritisch',
}

/** Fünf Sterne zum Anklicken; ein zweiter Klick auf denselben Stern löscht die Bewertung. */
function Sterne({ wert, label, onWahl }: { wert: number | null; label: string; onWahl: (w: number | null) => void }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <span className="w-16 text-xs">{label}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label} ${String(n)}`}
          aria-pressed={wert === n}
          className="focus-visible:ring-ring rounded outline-none focus-visible:ring-2"
          onClick={() => {
            onWahl(wert === n ? null : n)
          }}
        >
          <Star
            className={cn('size-3.5', wert !== null && n <= wert ? 'text-warn fill-current' : 'text-border-strong')}
          />
        </button>
      ))}
    </span>
  )
}

/**
 * Aufträge an diesen Subunternehmer (aus den Projekten), mit Bewertung nach Qualität, Termintreue und Preis.
 * Der Mittelwert erscheint in der Liste, damit man bei der nächsten Vergabe den Besten findet.
 */
export function AuftraegeBox({ auftraege, bewertung }: { auftraege: Auftrag[]; bewertung: number | null }) {
  const { t } = useTranslation()
  const bewerten = useAdressbuchAenderung((e: { a: Auftrag; k: Kriterium; w: number | null }) =>
    bewerteAuftrag(e.a.id, { qualitaet: e.a.qualitaet, termin: e.a.termin, preis: e.a.preis, [e.k]: e.w }),
  )
  return (
    <Box
      titel={t('adressbuch.akte.auftraege')}
      rechts={<span className="zahlen">{bewertungText(bewertung) ?? auftraege.length}</span>}
    >
      {auftraege.length === 0 && <Leer>{t('adressbuch.akte.keineAuftraege')}</Leer>}
      {auftraege.map((a) => (
        <Posten
          key={a.id}
          titel={`${a.projekt} · ${a.leistung}`}
          href={`#/projects?projekt=${a.projekt_id}`}
          status={
            <Badge ton={TON[a.status] ?? 'neutral'}>
              {t(`projekte.subStatus.${a.status}`, { defaultValue: a.status })}
            </Badge>
          }
        >
          <span className="flex flex-col gap-1">
            <span>
              {unterzeile(
                a.kunde,
                a.termin_von && formatDatum(a.termin_von),
                a.betrag_rappen !== null && formatChf(a.betrag_rappen, { mitWaehrung: true }),
              )}
            </span>
            {a.status === 'erledigt' && (
              <span className="text-foreground flex flex-wrap gap-x-3 gap-y-1">
                {KRITERIEN.map((k) => (
                  <Sterne
                    key={k}
                    wert={a[k]}
                    label={t(`adressbuch.bewertung.${k}`)}
                    onWahl={(w) => {
                      bewerten.mutate(
                        { a, k, w },
                        {
                          onError: (f) => {
                            meldeFehler(f, 'adressbuch.bewertung')
                          },
                        },
                      )
                    }}
                  />
                ))}
              </span>
            )}
          </span>
        </Posten>
      ))}
    </Box>
  )
}
