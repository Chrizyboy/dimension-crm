import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import type { Zweisprachig } from '@/types/modul'
import { unbekanntePlatzhalter } from '../lib/anzeige'

interface Props {
  id: string
  label: string
  wert: Zweisprachig | undefined
  onChange: (w: Zweisprachig) => void
  mehrzeilig?: boolean
  /** Bekannte Platzhalter; unbekannte im Text werden als Fehler gezeigt. */
  platzhalter?: readonly string[]
}

/**
 * Text auf Deutsch und Französisch nebeneinander. Der Kunde bekommt die Sprache aus seinem Kontakt,
 * Mitarbeitende ihre eigene. Platzhalter wie {Vorname} setzt die Datenbank beim Lauf ein.
 */
export function ZweisprachigFeld({ id, label, wert, onChange, mehrzeilig = false, platzhalter }: Props) {
  const { t } = useTranslation()
  const w = wert ?? { de: '', fr: '' }
  const falsch = platzhalter ? unbekanntePlatzhalter(`${w.de} ${w.fr}`, platzhalter) : []
  const Eingabe = mehrzeilig ? Textarea : Input
  return (
    <Feld
      id={`${id}-de`}
      label={label}
      fehler={falsch.length ? t('automationen.editor.platzhalterUnbekannt', { liste: falsch.join(', ') }) : undefined}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {(['de', 'fr'] as const).map((s) => (
          <div key={s} className="relative">
            <Eingabe
              id={`${id}-${s}`}
              value={w[s]}
              aria-label={`${label} (${s.toUpperCase()})`}
              aria-invalid={falsch.length > 0}
              className="pr-8"
              onChange={(e) => {
                onChange({ ...w, [s]: e.target.value })
              }}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1.5 right-2 text-xs font-semibold uppercase">
              {s}
            </span>
          </div>
        ))}
      </div>
    </Feld>
  )
}
