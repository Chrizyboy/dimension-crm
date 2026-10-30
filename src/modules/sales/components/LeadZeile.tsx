import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatTelefon } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { cn } from '@/lib/utils'
import { inTagen, istLiegengeblieben, tageZwischen, heuteIso } from '../lib/geschaeft'
import type { Geschaeft } from '../types'

interface LeadZeileProps {
  g: Geschaeft
  gewaehlt: boolean
  aktiv: boolean
  person: string | null
  /** `bereich`: Shift gedrückt, bis zur zuletzt gewählten Zeile wählen. */
  onWahl: (id: string, an: boolean, bereich: boolean) => void
  onOeffnen: (id: string) => void
}

/** «in 3 Tagen», «morgen», «heute», «seit 2 Tagen fällig». */
export function FaelligText({ datum }: { datum: string }) {
  const { t } = useTranslation()
  const { tage } = inTagen(datum)
  return (
    <span
      className={cn(
        'text-xs',
        tage < 0 ? 'text-bad font-medium' : tage === 0 ? 'text-warn font-medium' : 'text-muted-foreground',
      )}
    >
      {t(tage < 0 ? 'verkauf.faellig.seit' : tage === 0 ? 'verkauf.faellig.heute' : 'verkauf.faellig.in', {
        count: Math.abs(tage),
      })}
    </span>
  )
}

/**
 * Eine Zeile der Lead-Liste (V233): Auswahl (Strg- und Shift-Klick wie V66), Name mit Nummer, Ort, Telefon, Quelle, Eingang,
 * letzter Kontakt (rot ab 5 Tagen ohne Bewegung), Person und Stand bzw. «in X Tagen».
 */
export const LeadZeile = memo(function LeadZeile({ g, gewaehlt, aktiv, person, onWahl, onOeffnen }: LeadZeileProps) {
  const { t } = useTranslation()
  const staende = useAuswahl('kundenstand')
  const quellen = useAuswahl('quelle')
  const liegt = istLiegengeblieben(g)
  const zuletzt = g.letzterKontakt ?? g.eingangAm
  return (
    <li
      className={cn(
        'hover:bg-muted/60 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-l-2 border-l-transparent px-3 py-2 text-sm last:border-b-0 md:grid-cols-[auto_minmax(10rem,1.4fr)_minmax(8rem,1fr)_8rem_7rem_6rem_7rem_4rem_8rem]',
        aktiv && 'bg-accent-soft/50',
        liegt && 'border-l-bad border-l-2',
      )}
    >
      <Checkbox
        checked={gewaehlt}
        aria-label={t('verkauf.liste.waehlen', { name: g.name })}
        onClick={(e) => {
          // Klick statt onCheckedChange, damit Shift für «bis hier» mitkommt.
          e.preventDefault()
          onWahl(g.id, !gewaehlt, e.shiftKey)
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.shiftKey) onWahl(g.id, e.shiftKey || !gewaehlt, e.shiftKey)
          else onOeffnen(g.id)
        }}
        className="focus-visible:ring-ring flex min-w-0 flex-col rounded text-left outline-none focus-visible:ring-2"
      >
        <span className="line-clamp-2 font-medium">{g.name}</span>
        <span className="text-muted-foreground line-clamp-2 text-xs">
          {[g.nummer, g.ort].filter(Boolean).join(' · ')}
          <span className="md:hidden">{g.telefon ? ` · ${formatTelefon(g.telefon)}` : ''}</span>
        </span>
      </button>
      <span className="text-muted-foreground hidden truncate md:block">
        {[g.plz, g.ort].filter(Boolean).join(' ') || '–'}
      </span>
      <span className="text-muted-foreground hidden truncate md:block">
        {g.telefon ? (
          <a href={`tel:${g.telefon}`} className="hover:text-foreground hover:underline">
            {formatTelefon(g.telefon)}
          </a>
        ) : (
          '–'
        )}
      </span>
      <span className="text-muted-foreground hidden truncate text-xs md:block">{quellen.text(g.quelle) || '–'}</span>
      <span className="zahlen text-muted-foreground hidden font-mono text-xs md:block">
        {g.eingangAm ? formatDatum(g.eingangAm) : '–'}
      </span>
      <span
        className={cn(
          'zahlen hidden font-mono text-xs md:block',
          liegt ? 'text-bad font-medium' : 'text-muted-foreground',
        )}
      >
        {zuletzt ? formatDatum(zuletzt) : '–'}
        {zuletzt && (
          <span className="sr-only"> ({t('verkauf.tageHer', { count: tageZwischen(zuletzt, heuteIso()) })})</span>
        )}
      </span>
      <span className="text-muted-foreground hidden text-xs md:block">{person ?? '–'}</span>
      <span className="justify-self-end md:justify-self-start">
        {g.stand === 'lead_spaeter' && g.wiedervorlageAm ? (
          <FaelligText datum={g.wiedervorlageAm} />
        ) : (
          <Badge ton={tonVonFarbe(staende.finde(g.stand)?.farbe)} punkt>
            {staende.text(g.stand)}
          </Badge>
        )}
      </span>
    </li>
  )
})
