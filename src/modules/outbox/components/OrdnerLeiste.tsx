import { AlertTriangle, CalendarClock, Inbox, Send, SendHorizontal, Trash2, Undo2, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { cn } from '@/lib/utils'
import { AUSGANG_ORDNER, type AusgangOrdner } from '../types'

const ICON: Record<AusgangOrdner, LucideIcon> = {
  fuer_mich: Inbox,
  fehler: AlertTriangle,
  zurueck: Undo2,
  team: Users,
  geplant: CalendarClock,
  unterwegs: SendHorizontal,
  gesendet: Send,
  verworfen: Trash2,
}

/** Wo die Trennlinie mit Überschrift steht (Zu tun, Unterwegs, Archiv). */
const ABSCHNITT: Partial<Record<AusgangOrdner, string>> = {
  fuer_mich: 'zuTun',
  geplant: 'unterwegs',
  gesendet: 'archiv',
}

/**
 * Ordner der Werkbank: links als Liste (PC), am Handy als wischbare Chips. Zähler nur bei offenen Ordnern;
 * «Für mich» orange, Fehler rot, damit man sieht, wo man dran ist.
 */
export function OrdnerLeiste({
  gewaehlt,
  zaehler,
  onWahl,
}: {
  gewaehlt: AusgangOrdner
  zaehler: Partial<Record<AusgangOrdner, number>>
  onWahl: (o: AusgangOrdner) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="sm:hidden">
        <Filterchips
          einzeln
          beschriftung={t('ausgang.ordnerTitel')}
          gewaehlt={[gewaehlt]}
          onChange={([o]) => {
            if (o) onWahl(o as AusgangOrdner)
          }}
          optionen={AUSGANG_ORDNER.map((o) => ({
            wert: o,
            text: zaehler[o] ? `${t(`ausgang.ordner.${o}`)} ${zaehler[o]}` : t(`ausgang.ordner.${o}`),
          }))}
        />
      </div>
      <nav aria-label={t('ausgang.ordnerTitel')} className="hidden flex-col gap-0.5 sm:flex">
        {AUSGANG_ORDNER.map((o) => {
          const Icon = ICON[o]
          const n = zaehler[o] ?? 0
          const abschnitt = ABSCHNITT[o]
          return (
            <div key={o} className="flex flex-col">
              {abschnitt && (
                <span className="text-muted-foreground px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                  {t(`ausgang.abschnitt.${abschnitt}`)}
                </span>
              )}
              <button
                type="button"
                aria-current={o === gewaehlt ? 'page' : undefined}
                onClick={() => {
                  onWahl(o)
                }}
                className={cn(
                  'hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2',
                  o === gewaehlt && 'bg-surface border-border border font-semibold shadow-xs',
                )}
              >
                <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{t(`ausgang.ordner.${o}`)}</span>
                {n > 0 && (
                  <span
                    className={cn(
                      'zahlen text-xs',
                      o === 'fuer_mich'
                        ? 'text-accent-ink font-bold'
                        : o === 'fehler'
                          ? 'text-bad font-bold'
                          : 'text-muted-foreground',
                    )}
                  >
                    {n}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </nav>
    </>
  )
}
