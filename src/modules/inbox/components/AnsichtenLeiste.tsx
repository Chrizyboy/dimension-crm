import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { inAnsicht, type Betrachter } from '../lib/anzeige'
import { ANSICHTEN, type Ansicht, type Mail } from '../types'

/** Arbeits-Ansichten oben, Ablage-Ansichten unten (Trennlinie dazwischen). */
const ARBEIT: Ansicht[] = ['meine', 'verteilen', 'kunde', 'zurueck', 'warten']

/**
 * Ansichten links im Arbeitsplatz (am Handy und schmalen Fenster als waagrechte Leiste): Für mich, Zu verteilen (nur
 * wer verteilt), Warten auf Kunde, Zurückgestellt, Alle offenen; darunter Erledigt, Werbung & Intern, Ältere. Die
 * Zahl ist rot, wenn darin ein Kunde über der Frist wartet.
 */
export function AnsichtenLeiste({
  mails,
  ansicht,
  betrachter,
  onAnsicht,
}: {
  mails: Mail[]
  ansicht: Ansicht
  betrachter: Betrachter
  onAnsicht: (a: Ansicht) => void
}) {
  const { t } = useTranslation()
  const jetzt = new Date().getTime()
  const sichtbar = ANSICHTEN.filter((a) => a !== 'verteilen' || betrachter.verteile)
  return (
    <nav
      aria-label={t('posteingang.filter')}
      className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {sichtbar.map((a, i) => {
        const liste = a === 'aeltere' ? [] : mails.filter((m) => inAnsicht(m, a, betrachter, jetzt))
        const rot = liste.some((m) => m.stand === 'offen' && m.frist_am && Date.parse(m.frist_am) < jetzt)
        const trennen = i > 0 && ARBEIT.includes(sichtbar[i - 1] as Ansicht) && !ARBEIT.includes(a)
        return (
          <div key={a} className="contents">
            {trennen && <div className="bg-border mx-2 hidden h-px lg:my-2 lg:block" aria-hidden />}
            <button
              type="button"
              aria-current={ansicht === a ? 'page' : undefined}
              onClick={() => {
                onAnsicht(a)
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap',
                'hover:bg-muted focus-visible:ring-ring outline-none focus-visible:ring-2',
                ansicht === a && 'bg-surface ring-border font-semibold shadow-[inset_3px_0_0_var(--accent)] ring-1',
              )}
            >
              <span className="flex-1">{t(`posteingang.ansicht.${a}`)}</span>
              {a !== 'aeltere' && (
                <span className={cn('zahlen text-xs', rot ? 'text-bad font-semibold' : 'text-muted-foreground')}>
                  {liste.length}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
