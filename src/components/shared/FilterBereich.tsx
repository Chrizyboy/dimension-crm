import { ListFilter, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Seltener gebrauchte Filter hinter einem Knopf «Filter» (Chris 20.11.2026: «übersichtlicher»). Der Knopf zeigt,
 * wie viele davon aktiv sind, damit nichts versteckt wirkt; «Zurücksetzen» stellt alle auf «Alle».
 * Offen, solange ein Filter aktiv ist (man sieht, warum die Liste kürzer ist); der Knopf schliesst ihn trotzdem.
 */
export function FilterBereich({
  aktiv,
  onZuruecksetzen,
  vorne,
  zuruecksetzen = aktiv > 0,
  hinten,
  children,
}: {
  /** Wie viele der versteckten Filter nicht auf «Alle» stehen. */
  aktiv: number
  onZuruecksetzen: () => void
  /** Was immer sichtbar bleibt (z. B. Standort, Sortierung), links vom Knopf. */
  vorne?: ReactNode
  /** «Zurücksetzen» auch zeigen, wenn nur sichtbare Filter gesetzt sind (dann setzt es alle zurück). */
  zuruecksetzen?: boolean
  /** Rechts nach den Knöpfen, z. B. die Anzahl Treffer. */
  hinten?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  // Ohne eigene Wahl offen, solange ein Filter aktiv ist; ein Klick auf «Filter» klappt danach immer auf oder zu.
  const [offen, setOffen] = useState<boolean | null>(null)
  const sichtbar = offen ?? aktiv > 0
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {vorne}
        <Button
          variant="secondary"
          aria-expanded={sichtbar}
          onClick={() => {
            setOffen(!sichtbar)
          }}
        >
          <ListFilter />
          {t('filter.knopf')}
          {aktiv > 0 && (
            <span className="bg-primary text-primary-foreground zahlen rounded-full px-1.5 text-xs">{aktiv}</span>
          )}
        </Button>
        {zuruecksetzen && (
          <Button variant="ghost" onClick={onZuruecksetzen}>
            <X />
            {t('filter.zuruecksetzen')}
          </Button>
        )}
        {hinten}
      </div>
      {sichtbar && <div className="bg-surface/60 flex flex-col gap-3 rounded-xl border p-3">{children}</div>}
    </div>
  )
}
