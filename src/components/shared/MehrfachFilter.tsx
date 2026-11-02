import { ChevronDown, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Aufklapper, AufklapperAusloeser, AufklapperInhalt } from '@/components/ui/aufklapper'
import { Checkbox } from '@/components/ui/schalter'
import { cn } from '@/lib/utils'
import { beschriftungMehrfach, schalteWert } from './mehrfachAuswahl'

export interface MehrfachOption {
  wert: string
  text: string
  /** Wie viele Einträge dahinter stehen; ohne Zahl wird keine gezeigt. */
  anzahl?: number
}

interface MehrfachFilterProps {
  /** Wofür der Filter steht, z. B. «Person» (für Vorlesen und Titel im Feld). */
  beschriftung: string
  /** Text, wenn nichts eingeschränkt ist, z. B. «Alle Personen». */
  alleText: string
  optionen: readonly MehrfachOption[]
  /** Gewählte Werte; leer heisst «alle». */
  gewaehlt: readonly string[]
  onChange: (gewaehlt: string[]) => void
  /** Eigener Text auf dem Knopf, z. B. «Spalten: 9 von 12»; sonst «Filipe, Loris», «Alle ausser Davis» … */
  knopfText?: string
  /** Knopf farbig, wenn eingeschränkt ist. Standard: sobald nicht «alle» gewählt sind. */
  hervorheben?: boolean
  className?: string
}

/** Ab so vielen Einträgen erscheint ein Suchfeld im Feld (Regionen, Quellen). */
const MIT_SUCHE = 8

/**
 * Filter mit Häkchen wie in Excel: alle sind angehakt, man nimmt weg, was man nicht sehen will,
 * oder klickt «nur» für genau einen Wert. So gehen «nur Filipe und Loris» und «alle ausser Davis» mit
 * zwei Klicks. Für alle Auswahlfilter über Listen, damit sie sich überall gleich bedienen.
 */
export function MehrfachFilter({
  beschriftung,
  alleText,
  optionen,
  gewaehlt,
  onChange,
  knopfText,
  hervorheben,
  className,
}: MehrfachFilterProps) {
  const { t } = useTranslation()
  const [suche, setSuche] = useState('')
  const alle = gewaehlt.length === 0
  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return s ? optionen.filter((o) => o.text.toLowerCase().includes(s)) : optionen
  }, [optionen, suche])
  const text =
    knopfText ?? beschriftungMehrfach(optionen, gewaehlt, alleText, (o) => t('mehrfachFilter.ausser', { wert: o }))
  const alleWerte = optionen.map((o) => o.wert)

  return (
    <Aufklapper
      onOpenChange={(offen) => {
        if (!offen) setSuche('')
      }}
    >
      <AufklapperAusloeser
        aria-label={knopfText ?? `${beschriftung}: ${text}`}
        className={cn(
          'focus-visible:border-ring focus-visible:ring-ring/30 flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 text-left text-sm whitespace-nowrap shadow-xs outline-none focus-visible:ring-2',
          !(hervorheben ?? !alle)
            ? 'border-border bg-surface hover:border-border-strong'
            : 'border-primary bg-accent-soft text-foreground font-medium',
          className,
        )}
      >
        <span className="min-w-0 truncate">{text}</span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </AufklapperAusloeser>
      <AufklapperInhalt className="w-64">
        {optionen.length >= MIT_SUCHE && (
          <div className="relative p-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
              }}
              placeholder={t('mehrfachFilter.suchen')}
              aria-label={t('mehrfachFilter.suchen')}
              className="border-border bg-surface focus-visible:border-ring h-8 w-full rounded-md border pr-2 pl-8 text-sm outline-none"
            />
          </div>
        )}
        <div role="group" aria-label={beschriftung} className="flex max-h-72 flex-col overflow-y-auto">
          {!suche && (
            <Zeile
              text={t('mehrfachFilter.alle')}
              an={alle}
              fett
              onSchalten={() => {
                onChange([])
              }}
            />
          )}
          {sichtbar.map((o) => (
            <Zeile
              key={o.wert}
              text={o.text}
              {...(o.anzahl !== undefined ? { anzahl: o.anzahl } : {})}
              an={alle || gewaehlt.includes(o.wert)}
              gesperrt={gewaehlt.length === 1 && gewaehlt[0] === o.wert}
              onSchalten={() => {
                onChange(schalteWert(alleWerte, gewaehlt, o.wert))
              }}
              onNur={() => {
                onChange(alleWerte.length === 1 ? [] : [o.wert])
              }}
              nurText={t('mehrfachFilter.nur')}
            />
          ))}
          {sichtbar.length === 0 && (
            <p className="text-muted-foreground px-2 py-3 text-center text-xs">{t('mehrfachFilter.keineTreffer')}</p>
          )}
        </div>
      </AufklapperInhalt>
    </Aufklapper>
  )
}

function Zeile({
  text,
  anzahl,
  an,
  gesperrt = false,
  fett = false,
  onSchalten,
  onNur,
  nurText,
}: {
  text: string
  anzahl?: number
  an: boolean
  /** Das letzte Häkchen lässt sich nicht wegnehmen, sonst bliebe die Liste leer. */
  gesperrt?: boolean
  fett?: boolean
  onSchalten: () => void
  onNur?: () => void
  nurText?: string
}) {
  return (
    <div className="group hover:bg-muted flex h-8 items-center gap-2 rounded-md px-2 text-sm">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <Checkbox checked={an} disabled={gesperrt} onCheckedChange={onSchalten} />
        <span className={cn('min-w-0 truncate', fett && 'font-medium')}>{text}</span>
      </label>
      {onNur && (
        <button
          type="button"
          onClick={onNur}
          className="text-accent-ink focus-visible:ring-ring hidden rounded px-1 text-xs font-medium outline-none group-focus-within:inline group-hover:inline hover:underline focus-visible:ring-2"
        >
          {nurText}
        </button>
      )}
      {anzahl !== undefined && <span className="zahlen text-muted-foreground font-mono text-xs">{anzahl}</span>}
    </div>
  )
}
