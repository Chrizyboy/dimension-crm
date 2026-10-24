import { CircleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LeerzustandProps {
  icon: LucideIcon
  titel: string
  text?: string
  /** Meist der Knopf für den ersten Eintrag, z.B. «Ersten Kunden erfassen». */
  aktion?: ReactNode
  className?: string
}

/**
 * Leerer Zustand: sagt, was hier erscheinen wird und wie man den ersten Eintrag anlegt.
 * Nie eine leere Fläche ohne Erklärung zeigen.
 */
export function Leerzustand({ icon: Icon, titel, text, aktion, className }: LeerzustandProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <div className="bg-muted flex size-11 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-5" aria-hidden="true" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-display text-base font-semibold">{titel}</p>
        {text && <p className="text-muted-foreground text-sm">{text}</p>}
      </div>
      {aktion}
    </div>
  )
}

interface FehlerzustandProps {
  /** Technische Meldung für die Details; wird nur auf Wunsch angezeigt. */
  details?: string
  onNochmal?: () => void
  className?: string
  /** Überschrift-Ebene: h1 nur, wenn der Fehler die ganze Seite ersetzt; in einer Ansicht h2 (Reihenfolge der Überschriften). */
  ebene?: 'h1' | 'h2'
}

/**
 * Fehlerzustand: erklärt in einfachen Worten, dass etwas nicht geklappt hat, und was man tun kann.
 * Der Fehler ist zu diesem Zeitpunkt bereits an die Fehlerüberwachung gemeldet.
 */
export function Fehlerzustand({ details, onNochmal, className, ebene = 'h2' }: FehlerzustandProps) {
  const { t } = useTranslation()
  const Titel = ebene
  return (
    <div
      role="alert"
      className={cn('mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center', className)}
    >
      <div className="bg-bad-soft flex size-11 items-center justify-center rounded-xl">
        <CircleAlert className="text-bad size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <Titel className="text-lg font-semibold">{t('fehler.titel')}</Titel>
        <p className="text-muted-foreground text-sm">{t('fehler.text')}</p>
      </div>
      <div className="flex gap-2">
        {onNochmal && <Button onClick={onNochmal}>{t('fehler.nochmal')}</Button>}
        <Button
          variant="secondary"
          onClick={() => {
            window.location.hash = '#/'
          }}
        >
          {t('fehler.startseite')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            // Bereich vorwählen, in dem der Fehler passiert ist (erstes Stück der Adresse).
            const bereich = window.location.hash.replace(/^#\//, '').split(/[/?]/)[0] || 'anderes'
            window.location.hash = `#/knowledge?ansicht=meldungen&neu=${encodeURIComponent(bereich)}`
          }}
        >
          {t('fehler.melden')}
        </Button>
      </div>
      {details && (
        <details className="text-muted-foreground w-full text-left text-xs">
          <summary className="cursor-pointer">{t('fehler.details')}</summary>
          <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 font-mono whitespace-pre-wrap">{details}</pre>
        </details>
      )}
    </div>
  )
}
