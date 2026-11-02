import { ChevronDown, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { cn } from '@/lib/utils'
import type { useZeitplan } from '../hooks/useZeitplan'
import { alsDatum, alsIso, kalenderwoche, arbeitsMontag, plusTage } from '../lib/zeitplan'
import type { Projekt } from '../types'
import { ZeitplanAgenda } from './ZeitplanAgenda'
import { ZeitplanZuPlanen } from './ZeitplanZuPlanen'

/**
 * Zeitplan am Handy: oben Woche mit Vor/Zurück, Person und Standort, «Zu planen» zum Aufklappen, darunter die
 * Woche Tag für Tag. Grosse Tippflächen, kein seitliches Wischen über ein Raster.
 */
export function ZeitplanHandy({
  montag,
  onMontag,
  z,
  filter,
  onOeffnen,
  onPlanen,
}: {
  montag: string
  onMontag: (m: string) => void
  z: ReturnType<typeof useZeitplan>
  filter: ReactNode
  onOeffnen: (p: Projekt) => void
  onPlanen: (p: Projekt) => void
}) {
  const { t, i18n } = useTranslation()
  const [person, setPerson] = useState('')
  const [planenOffen, setPlanenOffen] = useState(false)
  const sprache = i18n.language === 'fr' ? 'fr-CH' : 'de-CH'
  const m = alsDatum(montag)
  const so = plusTage(m, 6)
  const kurz = (d: Date) => d.toLocaleDateString(sprache, { day: 'numeric', month: 'short' })
  const woche = (n: number) => {
    onMontag(alsIso(plusTage(m, n * 7)))
  }
  const dieseWoche = alsIso(arbeitsMontag(new Date())) === montag

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface flex items-center gap-1 rounded-xl border p-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('projekte.zeitplan.wocheZurueck')}
          onClick={() => {
            woche(-1)
          }}
        >
          <ChevronLeft />
        </Button>
        <div className="flex flex-1 flex-col items-center leading-tight">
          <span className="font-semibold">{t('projekte.zeitplan.kw', { kw: kalenderwoche(m) })}</span>
          <span className="text-muted-foreground text-xs">
            {kurz(m)} – {kurz(so)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('projekte.zeitplan.wocheVor')}
          onClick={() => {
            woche(1)
          }}
        >
          <ChevronRight />
        </Button>
        {!dieseWoche && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onMontag(alsIso(arbeitsMontag(new Date())))
            }}
          >
            {t('projekte.zeitplan.heute')}
          </Button>
        )}
      </div>

      <Auswahl
        aria-label={t('projekte.zeitplan.person')}
        value={person || 'alle'}
        onValueChange={(v) => {
          setPerson(v === 'alle' ? '' : v)
        }}
        optionen={[
          { wert: 'alle', text: t('projekte.zeitplan.allePersonen') },
          ...z.personen.map((p) => ({ wert: p.id, text: p.name })),
        ]}
      />
      {filter}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={planenOffen}
          onClick={() => {
            setPlanenOffen(!planenOffen)
          }}
          className="bg-surface flex flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            {t('projekte.zeitplan.zuPlanen')}
            <Badge ton={z.offen.length > 0 ? 'kritisch' : 'neutral'}>{z.offen.length}</Badge>
          </span>
          <ChevronDown className={cn('size-4 transition-transform', planenOffen && 'rotate-180')} aria-hidden />
        </button>
        {z.konflikte > 0 && (
          <span className="bg-bad-soft text-bad flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium">
            <TriangleAlert className="size-4" aria-hidden />
            {t('projekte.zeitplan.konflikte', { count: z.konflikte })}
          </span>
        )}
      </div>
      {planenOffen && <ZeitplanZuPlanen projekte={z.offen} onPlanen={onPlanen} className="[&>h2]:sr-only" />}

      {z.laedt ? (
        <Skelett className="h-96" />
      ) : (
        <ZeitplanAgenda
          montag={montag}
          gruppen={z.baustellen}
          abwesend={z.abwesend}
          personen={z.personen}
          person={person}
          onOeffnen={onOeffnen}
        />
      )}
    </div>
  )
}
