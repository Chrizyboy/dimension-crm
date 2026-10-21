import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useOrte, useAussendienst } from '../hooks/useVerkauf'
import { istOffenerLead } from '../lib/geschaeft'
import { hm, km } from '../lib/route'
import type { Geschaeft, Punkt } from '../types'

const StandWechselDialog = lazy(() => import('./StandWechselDialog'))

interface SlotPlanenProps {
  geschaefte: Geschaeft[]
  personId: string
  tag: string
  start: number
  /** Termine desselben Tages: Leads in ihrer Nähe kommen zuerst. */
  nachbarn: Geschaeft[]
  onSchliessen: () => void
}

/**
 * Freien Platz im Kalender belegen (V233 «Klick in den Kalender»): offene Leads ohne Termin,
 * die nächsten zu den Terminen dieses Tages (sonst zum Standort) zuerst. Ein Klick vereinbart den Termin.
 */
export default function SlotPlanen({ geschaefte, personId, tag, start, nachbarn, onSchliessen }: SlotPlanenProps) {
  const { t } = useTranslation()
  const orte = useOrte()
  const personen = useAussendienst()
  const [lead, setLead] = useState<Geschaeft | null>(null)
  const standort = personen.data?.find((p) => p.id === personId)?.standort ?? 'muri'
  const vorschlaege = useMemo(() => {
    const anker: Punkt[] = nachbarn
      .filter((g) => g.breite !== null)
      .map((g) => ({ breite: g.breite as number, laenge: g.laenge as number }))
    const heim = orte.data?.heime[personId] ?? orte.data?.standorte[standort]
    if (!anker.length && heim) anker.push(heim)
    return geschaefte
      .filter((g) => istOffenerLead(g) && g.stand !== 'termin' && g.breite !== null)
      .map((g) => ({
        g,
        d: anker.length
          ? Math.min(...anker.map((a) => km(a, { breite: g.breite as number, laenge: g.laenge as number })))
          : 0,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 15)
  }, [geschaefte, nachbarn, orte.data, personId, standort])

  if (lead)
    return (
      <Suspense>
        <StandWechselDialog
          geschaeft={lead}
          ziel="termin"
          vorschlag={{ datum: tag, zeit: hm(start), personId }}
          onSchliessen={onSchliessen}
        />
      </Suspense>
    )

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.kalender.slotTitel', { datum: tag.split('-').reverse().join('.'), zeit: hm(start) })}
        beschreibung={t('verkauf.kalender.slotText')}
      >
        <ul className="flex flex-col">
          {vorschlaege.length === 0 && (
            <li className="text-muted-foreground text-sm">{t('verkauf.kalender.keineLeads')}</li>
          )}
          {vorschlaege.map(({ g, d }) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => {
                  setLead(g)
                }}
                className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none focus-visible:ring-2"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{g.name}</span>{' '}
                  <span className="text-muted-foreground text-xs">· {[g.plz, g.ort].filter(Boolean).join(' ')}</span>
                </span>
                <span className="zahlen text-muted-foreground font-mono text-xs">{Math.round(d)} km</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogInhalt>
    </Dialog>
  )
}
