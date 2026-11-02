import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { VERTRAG_SCHLUESSEL } from '../hooks/useWerkvertraege'
import { passt } from '../lib/status'
import { ladeOffertenOhneVertrag } from '../services/offertenOhneVertrag'

/** So viele Treffer stehen in der Liste; mehr findet man über die Suche. */
const HOECHSTENS = 40

/**
 * «Neuer Werkvertrag»: erst die Offerte wählen (Name, Nummer, Ort), dann geht es ins gewohnte Formular
 * «Auftrag erstellen». Angenommene Offerten ohne Vertrag stehen zuoberst.
 */
export default function OfferteWahl({
  onWahl,
  onSchliessen,
}: {
  onWahl: (offerteId: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [suche, setSuche] = useState('')
  const s = useDeferredValue(suche)
  const status = useAuswahl('offertstatus')
  const offerten = useQuery({
    queryKey: [...VERTRAG_SCHLUESSEL, 'ohneVertrag'],
    queryFn: ladeOffertenOhneVertrag,
  })
  const treffer = useMemo(
    () => (offerten.data ?? []).filter((o) => passt(o.suchtext, s)).slice(0, HOECHSTENS),
    [offerten.data, s],
  )

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt titel={t('werkvertraege.neu.titel')} beschreibung={t('werkvertraege.neu.text')}>
        <div className="flex flex-col gap-3">
          <Suchfeld
            beschriftung={t('werkvertraege.neu.suche')}
            placeholder={t('werkvertraege.neu.sucheHinweis')}
            className="sm:w-full"
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
            onKeyDown={(e) => {
              const erste = treffer[0]
              if (e.key === 'Enter' && erste) {
                e.preventDefault()
                onWahl(erste.id)
              }
            }}
          />
          {offerten.error ? (
            <Fehlerzustand details={String(offerten.error)} onNochmal={() => void offerten.refetch()} />
          ) : offerten.isPending ? (
            <Skelett className="h-64" />
          ) : treffer.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t('werkvertraege.neu.leer')}</p>
          ) : (
            <ul className="-mx-2 flex flex-col" aria-label={t('werkvertraege.neu.liste')}>
              {treffer.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2"
                    onClick={() => {
                      onWahl(o.id)
                    }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        <span className="text-muted-foreground font-mono">{o.nummer}</span> {o.name}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {[
                          o.ort,
                          o.kwp ? `${String(o.kwp)} kWp` : null,
                          o.batterie,
                          o.betragRappen ? `CHF ${formatChf(o.betragRappen)} ${t('werkvertraege.neu.exkl')}` : null,
                          o.datum ? formatDatum(o.datum) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <Badge ton={tonVonFarbe(status.finde(o.status)?.farbe)}>{status.text(o.status)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
