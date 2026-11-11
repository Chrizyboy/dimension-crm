import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { plusTage } from '../lib/zeit'
import type { Zeit, Zeiterfassung } from '../types'
import { KontoKacheln } from './KontoKacheln'
import { StempelKarte } from './StempelKarte'
import { WocheTabelle } from './WocheTabelle'
import { ZeitDialog } from './ZeitDialog'
import { ZeitenListe } from './ZeitenListe'

/**
 * «Meine Zeit»: Stempeluhr (nur für sich selbst), Zahlen zum Konto, die Woche Tag für Tag und die gestempelten
 * Zeiten zum Korrigieren. Die Zeit-Leitung wählt oben eine andere Person und sieht deren Woche.
 */
export function MeineZeit({
  daten,
  personId,
  montag,
  onMontag,
  onPerson,
}: {
  daten: Zeiterfassung
  personId: string
  montag: string
  onMontag: (m: string) => void
  onPerson: (p: string) => void
}) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<Zeit | 'neu' | null>(null)
  const person = daten.personen.find((p) => p.id === personId) ?? daten.personen[0]
  if (!person) return null
  const eigene = person.id === daten.ich

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('zeit.woche.vorher')}
            onClick={() => {
              onMontag(plusTage(montag, -7))
            }}
          >
            <ChevronLeft />
          </Button>
          <span className="zahlen min-w-44 text-center text-sm font-medium whitespace-nowrap">
            {formatDatum(montag)} – {formatDatum(plusTage(montag, 6))}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('zeit.woche.nachher')}
            onClick={() => {
              onMontag(plusTage(montag, 7))
            }}
          >
            <ChevronRight />
          </Button>
          {daten.leitung && (
            <Auswahl
              aria-label={t('zeit.person')}
              className="w-full sm:ml-2 sm:w-56"
              value={person.id}
              onValueChange={onPerson}
              optionen={daten.personen.map((p) => ({ wert: p.id, text: p.name }))}
            />
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setDialog('neu')
          }}
        >
          <Plus />
          {t('zeit.nachtragen')}
        </Button>
      </div>
      {/* Am Handy steht die Stempeluhr zuoberst, am PC die Zahlen über der Woche. */}
      <div className="order-2 lg:order-1">
        <KontoKacheln konto={person.konto} />
      </div>
      <div className={cn('order-1 lg:order-2', eigene ? 'grid gap-4 lg:grid-cols-[20rem_1fr]' : 'flex flex-col gap-4')}>
        {eigene && (
          <div className="flex flex-col gap-4">
            <StempelKarte laeuft={person.laeuft} posten={daten.posten} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4">
          <WocheTabelle personId={person.id} montag={montag} />
          <ZeitenListe personId={person.id} montag={montag} posten={daten.posten} onBearbeiten={setDialog} />
        </div>
      </div>
      {dialog && (
        <ZeitDialog
          personId={person.id}
          zeit={dialog === 'neu' ? null : dialog}
          posten={daten.posten}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
