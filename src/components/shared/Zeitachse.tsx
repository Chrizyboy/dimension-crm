import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Zeitpunkt {
  id: string
  zeitpunkt: string
  icon: LucideIcon
  titel: string
  /** Zweite Zeile, z. B. der Text einer Notiz oder Mail. */
  text?: string | undefined
  /** Kleine Zusatzangaben rechts oder unter dem Titel (wer, Betrag …). */
  meta?: ReactNode
  /** Farbe des Punkts als Token-Klasse, z. B. 'bg-ok-soft text-ok'. */
  ton?: string | undefined
}

interface ZeitachseProps {
  eintraege: Zeitpunkt[]
  sprache: 'de' | 'fr'
  /** Überschrift pro Monat, damit lange Verläufe lesbar bleiben. */
  nachMonat?: boolean
}

function monat(iso: string, sprache: 'de' | 'fr'): string {
  return new Date(iso).toLocaleDateString(sprache === 'fr' ? 'fr-CH' : 'de-CH', { month: 'long', year: 'numeric' })
}

function uhrzeit(iso: string, sprache: 'de' | 'fr'): string {
  const d = new Date(iso)
  const tag = d.toLocaleDateString(sprache === 'fr' ? 'fr-CH' : 'de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  // Mittag und 07:00 sind Platzhalter für Ereignisse mit Datum ohne Uhrzeit (Offerte, Baubeginn).
  const ohneZeit = (d.getUTCHours() === 12 || d.getUTCHours() === 7) && d.getUTCMinutes() === 0
  return ohneZeit ? tag : `${tag} ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Senkrechte Zeitachse, neuestes zuoberst. Wird für die Kundenakte gebaut und später
 * für Leads, Projekte und Service-Fälle wiederverwendet.
 */
export function Zeitachse({ eintraege, sprache, nachMonat = true }: ZeitachseProps) {
  const monate = eintraege.map((e) => monat(e.zeitpunkt, sprache))
  return (
    <ol className="relative flex flex-col">
      {eintraege.map((e, i) => {
        const m = monate[i] ?? ''
        const neuerMonat = nachMonat && m !== monate[i - 1]
        const Icon = e.icon
        return (
          <li key={e.id} className="flex flex-col">
            {neuerMonat && (
              <h4 className="text-muted-foreground bg-surface sticky top-0 z-[1] pt-3 pb-1.5 text-xs font-medium tracking-wide uppercase">
                {m}
              </h4>
            )}
            <div className="group relative flex gap-3 pb-4">
              <span
                className="bg-border absolute top-7 bottom-0 left-[13px] w-px group-last:hidden"
                aria-hidden="true"
              />
              <span
                className={cn(
                  'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full',
                  e.ton ?? 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-medium">{e.titel}</p>
                  <time dateTime={e.zeitpunkt} className="text-muted-foreground zahlen font-mono text-xs">
                    {uhrzeit(e.zeitpunkt, sprache)}
                  </time>
                </div>
                {e.text && <p className="text-muted-foreground text-sm break-words whitespace-pre-line">{e.text}</p>}
                {e.meta && <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">{e.meta}</div>}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
